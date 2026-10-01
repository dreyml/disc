export const FACTORS = ["D", "I", "S", "C"] as const;
export type Factor = (typeof FACTORS)[number];
export type Scores = Record<Factor, number>;

export interface ModelConfig {
  modelVersion: string;
  weights: { forcedChoice: number; likert: number };
  geometry: {
    maximumIntensity: number;
    maximumProfileDistance: number;
    flexibleIntensityThreshold: number;
    pureSectorHalfWidthDegrees: number;
  };
  validity: {
    forcedChoiceMedianSecondsMinimum: number;
    totalDurationSecondsMinimum: number;
    likertSameAnswerRatio: number;
    consistencyDifferenceMinimum: number;
  };
}

export interface ForcedChoiceAnswer { most: Factor; least: Factor }
export interface LikertAnswer { factor: Factor; value: number; reversed?: boolean }
export interface Point { x: number; y: number; angle: number; intensity: number }

const zeroScores = (): Scores => ({ D: 0, I: 0, S: 0, C: 0 });
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

function assertForcedChoice(answers: ForcedChoiceAnswer[]): void {
  for (const answer of answers) {
    if (answer.most === answer.least) throw new Error("'most' e 'least' devem ser fatores diferentes");
  }
}

export function scoreForcedChoice(answers: ForcedChoiceAnswer[], expectedItems: number): Scores {
  if (answers.length !== expectedItems) throw new Error(`Esperadas ${expectedItems} respostas; recebidas ${answers.length}`);
  assertForcedChoice(answers);
  const raw = zeroScores();
  for (const answer of answers) {
    raw[answer.most] += 1;
    raw[answer.least] -= 1;
  }
  return Object.fromEntries(FACTORS.map(factor => [factor, round((raw[factor] + expectedItems) / (2 * expectedItems) * 100)])) as Scores;
}

export function scoreLikert(answers: LikertAnswer[]): Scores {
  const grouped: Record<Factor, number[]> = { D: [], I: [], S: [], C: [] };
  for (const answer of answers) {
    if (!Number.isInteger(answer.value) || answer.value < 1 || answer.value > 5) throw new Error("Resposta Likert deve ser um inteiro de 1 a 5");
    grouped[answer.factor].push(answer.reversed ? 6 - answer.value : answer.value);
  }
  for (const factor of FACTORS) {
    if (grouped[factor].length !== 4) throw new Error(`O fator ${factor} deve ter exatamente 4 respostas Likert`);
  }
  return Object.fromEntries(FACTORS.map(factor => {
    const raw = grouped[factor].reduce((sum, value) => sum + value, 0);
    return [factor, round((raw - 4) / 16 * 100)];
  })) as Scores;
}

export function scoreNatural(forced: Scores, likert: Scores, config: ModelConfig): Scores {
  const weightSum = config.weights.forcedChoice + config.weights.likert;
  if (Math.abs(weightSum - 1) > 1e-9) throw new Error("Os pesos do perfil Natural devem somar 1");
  return Object.fromEntries(FACTORS.map(factor => [factor, round(clamp(
    config.weights.forcedChoice * forced[factor] + config.weights.likert * likert[factor]
  ))])) as Scores;
}

export function profilePoint(scores: Scores, config: ModelConfig): Point {
  const x = ((scores.I + scores.S) - (scores.D + scores.C)) / 2;
  const y = ((scores.D + scores.I) - (scores.S + scores.C)) / 2;
  const angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const intensity = clamp(Math.hypot(x, y) / config.geometry.maximumIntensity * 100);
  return { x: round(x), y: round(y), angle: round(angle), intensity: round(intensity) };
}

const angularDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const centers: Record<Factor, number> = { D: 135, I: 45, S: 315, C: 225 };

export type Style = Factor | "DI" | "ID" | "IS" | "SI" | "SC" | "CS" | "CD" | "DC" | "FLEXIVEL";

export function nameStyle(point: Point, config: ModelConfig): Style {
  if (point.intensity < config.geometry.flexibleIntensityThreshold) return "FLEXIVEL";
  const ordered = FACTORS.map(factor => ({ factor, distance: angularDistance(point.angle, centers[factor]) }))
    .sort((a, b) => a.distance - b.distance);
  if (ordered[0].distance <= config.geometry.pureSectorHalfWidthDegrees) return ordered[0].factor;
  return `${ordered[0].factor}${ordered[1].factor}` as Style;
}

export function adaptation(natural: Point, work: Point, config: ModelConfig): number {
  return round(clamp(Math.hypot(natural.x - work.x, natural.y - work.y) / config.geometry.maximumProfileDistance * 100));
}

export interface ValidityInput {
  consistencyPairs: [[number, number], [number, number]];
  socialDesirability: [number, number];
  forcedChoiceSeconds: number[];
  totalDurationSeconds: number;
  likertValues: number[];
}

export type Reliability = "Alta" | "Moderada" | "Baixa";
export interface ValidityResult { alerts: string[]; reliability: Reliability }

export function evaluateValidity(input: ValidityInput, config: ModelConfig): ValidityResult {
  const alerts: string[] = [];
  const inconsistentPairs = input.consistencyPairs.filter(([a, b]) => Math.abs(a - b) >= config.validity.consistencyDifferenceMinimum);
  if (inconsistentPairs.length === 2) alerts.push("consistencia");
  if (input.socialDesirability.every(value => value === 5)) alerts.push("desejabilidade_social");
  const times = [...input.forcedChoiceSeconds].sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const median = times.length === 0 ? Infinity : times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  if (median < config.validity.forcedChoiceMedianSecondsMinimum || input.totalDurationSeconds < config.validity.totalDurationSecondsMinimum) alerts.push("tempo");
  const frequencies = new Map<number, number>();
  for (const value of input.likertValues) frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  const maxFrequency = Math.max(0, ...frequencies.values());
  if (input.likertValues.length > 0 && maxFrequency / input.likertValues.length >= config.validity.likertSameAnswerRatio) alerts.push("padrao_resposta");
  return { alerts, reliability: alerts.length === 0 ? "Alta" : alerts.length === 1 ? "Moderada" : "Baixa" };
}
