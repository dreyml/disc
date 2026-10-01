import { questionBank } from "./question-bank.js";
import { ADAPTIVE_COUNT, CORE_COUNT, buildCore, chooseNextItem, normalizedScores } from "./adaptive-engine.js";
import { buildReport } from "./report-engine.js";

const screens = [...document.querySelectorAll(".screen")];
let journey = [], responses = [], current = 0, adaptiveAdded = 0;
let draft = { most: null, least: null };
let playerName = "Jogador", toastTimer;
let lastReport = null;
const $ = selector => document.querySelector(selector);

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function toast(message) {
  const element = $("#toast");
  element.textContent = message; element.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
}
function saveProgress() {
  localStorage.setItem("disc-arcade-progress", JSON.stringify({ playerName, current, responses, journeyIds: journey.map(item => item.id), adaptiveAdded }));
}
function startJourney() {
  journey = buildCore(questionBank); responses = []; current = 0; adaptiveAdded = 0;
  renderMission(); showScreen("quiz-screen");
}
function renderMission() {
  const mission = journey[current];
  const total = CORE_COUNT + ADAPTIVE_COUNT;
  draft = responses[current] ? { ...responses[current] } : { most: null, least: null };
  const adaptive = !mission.core;
  $("#mission-label").textContent = adaptive ? "FASE BÔNUS · ADAPTATIVA" : `FASE ${String(current + 1).padStart(2,"0")}`;
  $("#progress-label").textContent = `${current + 1} / ${total}`;
  $("#progress-bar").style.width = `${((current + 1) / total) * 100}%`;
  $(".progress-track").setAttribute("aria-valuenow", String(current + 1));
  $("#mission-title").textContent = mission.context.toUpperCase();
  $("#mission-icon").textContent = mission.icon;
  $("#mission-help").textContent = adaptive ? "Missão escolhida para aprofundar uma área ainda pouco explorada." : "Escolha o comportamento que mais e o que menos representa você.";
  $("#challenge-number").textContent = String(current + 1).padStart(2,"0");
  $("#question-text").textContent = mission.question;
  $("#back-button").disabled = current === 0;
  const grid = $("#answer-grid"); grid.innerHTML = "";
  mission.answers.forEach(({ factor, text }, index) => {
    const card = document.createElement("article");
    card.className = "answer-card"; card.tabIndex = 0; card.dataset.factor = factor;
    card.innerHTML = `<span class="answer-key">${index + 1}</span><p>${text}</p><div class="choice-buttons"><button class="choice-button most-button" type="button" aria-label="Marcar como mais parecido">+ MAIS</button><button class="choice-button least-button" type="button" aria-label="Marcar como menos parecido">− MENOS</button></div>`;
    card.querySelector(".most-button").addEventListener("click", () => choose("most", factor));
    card.querySelector(".least-button").addEventListener("click", () => choose("least", factor));
    grid.appendChild(card);
  });
  updateCards();
}
function choose(kind, factor) {
  const other = kind === "most" ? "least" : "most";
  if (draft[other] === factor) draft[other] = null;
  draft[kind] = factor; updateCards();
}
function updateCards() {
  document.querySelectorAll(".answer-card").forEach(card => {
    card.classList.toggle("is-most", card.dataset.factor === draft.most);
    card.classList.toggle("is-least", card.dataset.factor === draft.least);
  });
  $("#next-button").disabled = !draft.most || !draft.least;
}
function appendAdaptiveIfNeeded() {
  if (current < CORE_COUNT - 1 || adaptiveAdded >= ADAPTIVE_COUNT) return false;
  const selected = chooseNextItem(questionBank, journey, responses);
  if (!selected) return false;
  journey.push({ ...selected.item, selectionReason: selected.reason }); adaptiveAdded += 1;
  return true;
}
function finish() {
  const result = normalizedScores(journey, responses);
  const dominant = Object.entries(result.scores).sort((a,b) => b[1] - a[1])[0][0];
  const profiles = {
    D:["AÇÃO DIRETA","Você tende a ganhar energia quando pode avançar, definir prioridades e enfrentar desafios de forma objetiva."],
    I:["CONEXÃO ATIVA","Você tende a ganhar energia ao envolver pessoas, compartilhar ideias e criar movimento por meio da comunicação."],
    S:["RITMO COOPERATIVO","Você tende a ganhar energia ao sustentar o grupo, oferecer apoio e construir continuidade com as pessoas."],
    C:["PRECISÃO TÁTICA","Você tende a ganhar energia ao analisar cenários, organizar critérios e proteger a qualidade das entregas."]
  };
  $("#profile-badge").textContent = dominant; $("#profile-name").textContent = profiles[dominant][0]; $("#profile-copy").textContent = profiles[dominant][1];
  $("#result-summary").textContent = `${playerName}, sua jornada combinou ${CORE_COUNT} missões comuns e ${adaptiveAdded} missões escolhidas para aprofundar facetas menos exploradas. Confiança atual: ${result.confidence}.`;
  $("#stat-bars").innerHTML = Object.entries(result.scores).map(([factor,value]) => `<div class="stat-row"><b>${factor}</b><div class="stat-track"><i style="width:${value}%"></i></div><span>${value}</span></div>`).join("");
  lastReport = buildReport(playerName, journey, responses, result);
  localStorage.removeItem("disc-arcade-progress"); showScreen("result-screen");
}

function renderReport(report) {
  const stats = Object.entries(report.scores).map(([factor,value]) => `<div class="report-stat"><b>${factor}</b><div><i style="width:${value}%"></i></div><span>${value}</span></div>`).join("");
  const contexts = report.contexts.map(context => `<article class="context-card"><span class="context-factor">${context.factor}</span><h3>${context.name.toUpperCase()}</h3><p>Tende a ${context.tendency}.</p><small><strong>Ajuste de fase:</strong> ${context.adjustment}.</small></article>`).join("");
  const communications = report.communication.map(item => `<div class="report-panel"><h3>COM ${item.factor}</h3><p>${item.text}</p></div>`).join("");
  const quests = report.quests.map(quest => `<div class="quest-card"><p>${quest}</p></div>`).join("");
  $("#report-document").innerHTML = `
    <header class="report-cover"><div><p class="report-kicker">DISC FUNCIONAL · RELATÓRIO DE JORNADA</p><h1>${report.playerName}<br><span>${report.title}</span></h1><p>${report.overview}</p><p>Gerado em ${report.generatedAt} · confiança ${report.confidence.toLowerCase()}</p></div><div class="report-class"><b>${report.dominant}</b><span>${report.call.toUpperCase()}</span></div></header>
    <section class="report-section"><p class="section-label">01 · VISÃO GERAL</p><h2>SEU MODO DE JOGO</h2><div class="report-overview-grid"><div class="report-panel"><h3>POTENCIAL</h3><p>${report.strength}</p></div><div class="report-panel"><h3>PONTO CEGO</h3><p>${report.blind}</p></div><div class="report-panel"><h3>AJUSTE PRÁTICO</h3><p>${report.adjustment}</p></div></div></section>
    <section class="report-section"><p class="section-label">02 · ATRIBUTOS</p><h2>MAPA DE ENERGIA</h2><div class="report-two-column"><div>${stats}</div><div class="report-panel"><h3>LEITURA</h3><p>O fator ${report.dominant} apareceu como tendência principal e ${report.secondary} como recurso secundário. Os números mostram preferências relativas nesta jornada, não capacidade ou valor pessoal.</p></div></div></section>
    <section class="report-section"><p class="section-label">03 · CAMPANHA</p><h2>SETE CONTEXTOS DE TRABALHO</h2><div class="report-context-grid">${contexts}</div></section>
    <section class="report-section"><p class="section-label">04 · ENERGIA</p><h2>MOTIVADORES E DESGASTE</h2><div class="report-two-column"><div class="report-panel"><h3>RECARGA</h3><ul class="report-list">${report.motivators.map(item => `<li>${item}</li>`).join("")}</ul></div><div class="report-panel"><h3>DRENAGEM</h3><ul class="report-list">${report.drains.map(item => `<li>${item}</li>`).join("")}</ul></div></div></section>
    <section class="report-section"><p class="section-label">05 · CO-OP</p><h2>COMUNICAÇÃO COM CADA ESTILO</h2><div class="communication-grid">${communications}</div></section>
    <section class="report-section"><p class="section-label">06 · PRÓXIMAS MISSÕES</p><h2>PLANO DE 30 DIAS</h2><div class="quest-list">${quests}</div></section>
    <section class="report-section"><p class="section-label">07 · USO RESPONSÁVEL</p><h2>O QUE ESTE MAPA NÃO DIZ</h2><p class="responsible-note">Este resultado descreve tendências de comportamento observável e pode variar conforme o contexto. Não mede inteligência, competência, caráter, saúde mental ou potencial profissional. Nenhum estilo é superior a outro. A ferramenta está em desenvolvimento e não deve ser usada para contratação, demissão, promoção, punição ou diagnóstico.</p></section>`;
}

$("#player-form").addEventListener("submit", event => { event.preventDefault(); playerName = $("#player-name").value.trim() || "Jogador"; $("#hud-name").textContent = playerName; startJourney(); });
$("#next-button").addEventListener("click", () => {
  if (!draft.most || !draft.least) return toast("Escolha uma opção MAIS e uma MENOS.");
  responses[current] = { ...draft };
  const added = appendAdaptiveIfNeeded();
  if (current === journey.length - 1 && adaptiveAdded >= ADAPTIVE_COUNT) return finish();
  current += 1; saveProgress(); renderMission(); if (added) toast("MISSÃO ADAPTATIVA DESBLOQUEADA");
});
$("#back-button").addEventListener("click", () => { if (current > 0) { current -= 1; renderMission(); } });
$("#exit-button").addEventListener("click", () => { if (confirm("Sair da missão? Seu progresso continuará salvo neste dispositivo.")) showScreen("start-screen"); });
$("#restart-button").addEventListener("click", () => { localStorage.removeItem("disc-arcade-progress"); showScreen("start-screen"); $("#player-name").focus(); });
$("#report-button").addEventListener("click", () => { if (!lastReport) return toast("Conclua a jornada para gerar o relatório."); renderReport(lastReport); showScreen("report-screen"); });
$("#report-back").addEventListener("click", () => showScreen("result-screen"));
$("#report-print").addEventListener("click", () => window.print());
$("#sound-toggle").addEventListener("click", event => { const active = event.currentTarget.getAttribute("aria-pressed") === "true"; event.currentTarget.setAttribute("aria-pressed", String(!active)); toast(active ? "SOM DESATIVADO" : "SOM ATIVADO · efeitos entram na próxima fase"); });
document.addEventListener("keydown", event => {
  if (!$("#quiz-screen").classList.contains("active")) return;
  if (/^[1-4]$/.test(event.key)) {
    const card = document.querySelectorAll(".answer-card")[Number(event.key)-1];
    if (card) { document.querySelectorAll(".answer-card").forEach(c => delete c.dataset.keyboardSelected); card.dataset.keyboardSelected = "true"; card.focus(); toast("Use M para MAIS ou L para MENOS."); }
  }
  const selected = document.querySelector('.answer-card[data-keyboard-selected="true"]');
  if (selected && event.key.toLowerCase() === "m") { choose("most", selected.dataset.factor); delete selected.dataset.keyboardSelected; }
  if (selected && event.key.toLowerCase() === "l") { choose("least", selected.dataset.factor); delete selected.dataset.keyboardSelected; }
});
