import test from "node:test";
import assert from "node:assert/strict";
import { questionBank, FACETS } from "../public/question-bank.js";
import { ADAPTIVE_COUNT, CORE_COUNT, buildCore, chooseNextItem, normalizedScores } from "../public/adaptive-engine.js";

test("banco contém 42 itens equilibrados pelos sete contextos", () => {
  assert.equal(questionBank.length, 42);
  const counts = Object.groupBy(questionBank, item => item.context);
  assert.equal(Object.keys(counts).length, 7);
  assert.ok(Object.values(counts).every(items => items.length === 6));
});
test("todo item possui quatro fatores e metadados de faceta", () => {
  for (const item of questionBank) {
    assert.deepEqual(new Set(item.answers.map(a => a.factor)), new Set(["D","I","S","C"]));
    assert.ok(item.answers.every(a => FACETS.includes(a.facet)));
  }
});
test("núcleo tem 21 itens e seletor não repete item", () => {
  const journey = buildCore(questionBank);
  assert.equal(journey.length, CORE_COUNT);
  const responses = journey.map(() => ({ most: "D", least: "S" }));
  const selected = chooseNextItem(questionBank, journey, responses);
  assert.ok(selected && !journey.some(item => item.id === selected.item.id));
  assert.ok(selected.reason.length > 0);
});
test("jornada completa contém 28 itens únicos", () => {
  const journey = buildCore(questionBank);
  const responses = journey.map((_, i) => ({ most: i % 2 ? "I" : "D", least: i % 2 ? "C" : "S" }));
  for (let i = 0; i < ADAPTIVE_COUNT; i++) {
    const selected = chooseNextItem(questionBank, journey, responses);
    journey.push(selected.item); responses.push({ most: "D", least: "S" });
  }
  assert.equal(journey.length, CORE_COUNT + ADAPTIVE_COUNT);
  assert.equal(new Set(journey.map(item => item.id)).size, journey.length);
  const result = normalizedScores(journey, responses);
  assert.ok(result.scores.D > result.scores.S);
});
