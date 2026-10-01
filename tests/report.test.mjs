import test from "node:test";
import assert from "node:assert/strict";
import { questionBank } from "../public/question-bank.js";
import { buildCore, chooseNextItem, normalizedScores, ADAPTIVE_COUNT } from "../public/adaptive-engine.js";
import { buildReport } from "../public/report-engine.js";

test("relatório cobre os sete contextos e gera três missões", () => {
  const journey = buildCore(questionBank);
  const responses = journey.map((_, index) => ({ most: index % 3 ? "D" : "I", least: index % 2 ? "S" : "C" }));
  for (let index = 0; index < ADAPTIVE_COUNT; index += 1) {
    const selected = chooseNextItem(questionBank, journey, responses);
    journey.push(selected.item);
    responses.push({ most: "D", least: "S" });
  }
  const report = buildReport("Jogador Teste", journey, responses, normalizedScores(journey, responses));
  assert.equal(report.playerName, "Jogador Teste");
  assert.equal(report.contexts.length, 7);
  assert.equal(report.communication.length, 4);
  assert.equal(report.quests.length, 3);
  assert.match(report.adjustment, /\./);
});
