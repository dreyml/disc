import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptation, evaluateValidity, nameStyle, profilePoint, scoreForcedChoice, scoreLikert, scoreNatural, type ModelConfig } from "../src/scoring.ts";

const config = JSON.parse(readFileSync(new URL("../config/model.v1.json", import.meta.url), "utf8")) as ModelConfig;

test("Bloco A respeita os extremos teóricos", () => {
  const answers = Array.from({ length: 24 }, () => ({ most: "D" as const, least: "S" as const }));
  assert.deepEqual(scoreForcedChoice(answers, 24), { D: 100, I: 50, S: 0, C: 50 });
});

test("Bloco B normaliza 4..20 e recodifica item invertido", () => {
  const answers = ["D", "I", "S", "C"].flatMap(factor => [1, 1, 1, 1].map((value, index) => ({ factor: factor as "D"|"I"|"S"|"C", value, reversed: index === 0 })));
  assert.deepEqual(scoreLikert(answers), { D: 25, I: 25, S: 25, C: 25 });
});

test("Natural aplica pesos configurados", () => {
  assert.deepEqual(scoreNatural({ D: 100, I: 50, S: 0, C: 50 }, { D: 50, I: 50, S: 50, C: 50 }, config), { D: 80, I: 50, S: 20, C: 50 });
});

test("Perfil equilibrado fica no centro e não recebe quadrante", () => {
  const point = profilePoint({ D: 50, I: 50, S: 50, C: 50 }, config);
  assert.deepEqual(point, { x: 0, y: 0, angle: 0, intensity: 0 });
  assert.equal(nameStyle(point, config), "FLEXIVEL");
});

test("Os quatro vértices recebem estilos puros", () => {
  assert.equal(nameStyle(profilePoint({ D: 100, I: 0, S: 0, C: 0 }, config), config), "D");
  assert.equal(nameStyle(profilePoint({ D: 0, I: 100, S: 0, C: 0 }, config), config), "I");
  assert.equal(nameStyle(profilePoint({ D: 0, I: 0, S: 100, C: 0 }, config), config), "S");
  assert.equal(nameStyle(profilePoint({ D: 0, I: 0, S: 0, C: 100 }, config), config), "C");
});

test("Distância máxima entre perfis opostos é 100", () => {
  const people = profilePoint({ D: 0, I: 100, S: 100, C: 0 }, config);
  const task = profilePoint({ D: 100, I: 0, S: 0, C: 100 }, config);
  assert.equal(adaptation(people, task, config), 100);
});

test("Distância entre estilos puros opostos preserva a geometria da fórmula", () => {
  const d = profilePoint({ D: 100, I: 0, S: 0, C: 0 }, config);
  const s = profilePoint({ D: 0, I: 0, S: 100, C: 0 }, config);
  assert.equal(adaptation(d, s, config), 70.71);
});

test("Validade agrega alertas e classifica confiabilidade", () => {
  const result = evaluateValidity({
    consistencyPairs: [[1, 5], [5, 1]],
    socialDesirability: [5, 5],
    forcedChoiceSeconds: Array(24).fill(2),
    totalDurationSeconds: 200,
    likertValues: Array(16).fill(3)
  }, config);
  assert.deepEqual(result.alerts, ["consistencia", "desejabilidade_social", "tempo", "padrao_resposta"]);
  assert.equal(result.reliability, "Baixa");
});
