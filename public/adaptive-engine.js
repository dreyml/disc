import { FACTORS, FACETS } from "./question-bank.js";
export const CORE_COUNT = 21;
export const ADAPTIVE_COUNT = 7;
const hash = value => [...value].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);

export function buildCore(bank) { return bank.filter(item => item.core).slice(0, CORE_COUNT); }

export function analyzeResponses(items, responses) {
  const factorScore = Object.fromEntries(FACTORS.map(f => [f, 0]));
  const factorEvidence = Object.fromEntries(FACTORS.map(f => [f, 0]));
  const facetEvidence = Object.fromEntries(FACETS.map(f => [f, 0]));
  const contextCount = {};
  responses.forEach((response, index) => {
    const item = items[index];
    if (!item || !response) return;
    const most = item.answers.find(answer => answer.factor === response.most);
    const least = item.answers.find(answer => answer.factor === response.least);
    factorScore[response.most] += 1; factorScore[response.least] -= 1;
    factorEvidence[response.most] += 1; factorEvidence[response.least] += 1;
    if (most) facetEvidence[most.facet] += 1;
    if (least) facetEvidence[least.facet] += 1;
    contextCount[item.context] = (contextCount[item.context] ?? 0) + 1;
  });
  return { factorScore, factorEvidence, facetEvidence, contextCount };
}

export function chooseNextItem(bank, administered, responses) {
  const used = new Set(administered.map(item => item.id));
  const candidates = bank.filter(item => !item.core && !used.has(item.id));
  if (!candidates.length) return null;
  const analysis = analyzeResponses(administered, responses);
  const ranked = FACTORS.map(f => [f, analysis.factorScore[f]]).sort((a,b) => b[1] - a[1]);
  const uncertain = new Set(ranked.slice(0,2).map(([f]) => f));
  const lastContext = administered.at(-1)?.context;
  return candidates.map(item => {
    let utility = Math.max(0, 4 - (analysis.contextCount[item.context] ?? 0)) * 3;
    const reasons = [];
    if ((analysis.contextCount[item.context] ?? 0) < 3) reasons.push("equilibrar contexto");
    if (item.context === lastContext) utility -= 8;
    for (const answer of item.answers) {
      const need = Math.max(0, 2 - analysis.facetEvidence[answer.facet]);
      utility += need * 4 + (uncertain.has(answer.factor) ? 1.5 : 0);
      if (need) reasons.push(`aprofundar ${answer.facet}`);
    }
    if (Math.abs(ranked[0][1] - ranked[1][1]) <= 2) { utility += 3; reasons.push(`diferenciar ${ranked[0][0]}/${ranked[1][0]}`); }
    utility += Math.abs(hash(`${item.id}-${responses.length}`) % 100) / 100;
    return { item, utility, reason: [...new Set(reasons)].slice(0,3).join(", ") || "ampliar evidências" };
  }).sort((a,b) => b.utility - a.utility)[0];
}

export function normalizedScores(items, responses) {
  const analysis = analyzeResponses(items, responses);
  const count = responses.length || 1;
  const scores = Object.fromEntries(FACTORS.map(f => [f, Math.round((analysis.factorScore[f] + count) / (count * 2) * 100)]));
  const minimum = Math.min(...Object.values(analysis.facetEvidence));
  return { ...analysis, scores, confidence: responses.length >= CORE_COUNT + ADAPTIVE_COUNT && minimum >= 1 ? "Moderada" : "Exploratória" };
}
