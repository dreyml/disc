const missions = [
  { context: "Tomada de decisão", icon: "⚡", question: "Surge um problema inesperado a dois dias de uma entrega importante. Qual é sua primeira reação?", answers: [
    ["D", "Defino rapidamente o que será priorizado e distribuo as ações."], ["I", "Reúno o grupo para alinhar expectativas e renovar a energia."], ["S", "Verifico quem precisa de apoio e ajudo a reorganizar o ritmo."], ["C", "Investigo a causa e confiro os impactos antes de mudar o plano."] ] },
  { context: "Comunicação", icon: "◈", question: "Você precisa apresentar uma proposta para pessoas com opiniões diferentes. Como conduz a conversa?", answers: [
    ["I", "Uso exemplos envolventes e convido todos a construir a ideia."], ["C", "Organizo evidências e explico com precisão como cheguei à conclusão."], ["D", "Vou direto ao ponto e mostro qual decisão precisa ser tomada."], ["S", "Crio espaço para cada pessoa falar e busco pontos de concordância."] ] },
  { context: "Execução", icon: "▣", question: "Um projeto longo entra em uma etapa repetitiva. O que ajuda você a manter a entrega?", answers: [
    ["S", "Mantenho um ritmo constante e acompanho as necessidades do time."], ["D", "Transformo a etapa em metas curtas e avanço com senso de urgência."], ["C", "Uso um método claro e confiro a qualidade em cada ciclo."], ["I", "Crio marcos de celebração e compartilho o progresso com o grupo."] ] },
  { context: "Conflito e feedback", icon: "✦", question: "Uma discordância começa a travar o trabalho da equipe. Como você tende a agir?", answers: [
    ["D", "Trago o impasse para a mesa e proponho uma decisão objetiva."], ["S", "Escuto os envolvidos separadamente e ajudo a reduzir a tensão."], ["I", "Estimulo uma conversa aberta para recuperar a conexão do grupo."], ["C", "Separo fatos de interpretações e retomo os critérios combinados."] ] },
  { context: "Mudança", icon: "↻", question: "Uma mudança importante é anunciada com poucas informações. O que você faz primeiro?", answers: [
    ["C", "Mapeio dúvidas, riscos e informações que ainda precisam ser confirmadas."], ["I", "Converso com as pessoas para explorar possibilidades e gerar abertura."], ["S", "Procuro entender como a rotina e as pessoas serão afetadas."], ["D", "Identifico o que já pode ser iniciado e começo a mover a execução."] ] },
  { context: "Colaboração", icon: "◎", question: "Em uma reunião com muitas ideias e pouco tempo, qual contribuição surge mais naturalmente?", answers: [
    ["I", "Conecto ideias e incentivo a participação de quem está mais quieto."], ["D", "Faço o grupo escolher uma direção e assumir próximos passos."], ["S", "Organizo os acordos de modo que todos consigam acompanhar."], ["C", "Aponto critérios e inconsistências que precisam ser resolvidos."] ] },
  { context: "Liderança", icon: "▲", question: "Um colega perde confiança diante de uma tarefa nova. Como você procura ajudar?", answers: [
    ["S", "Ofereço presença, paciência e apoio durante os primeiros passos."], ["I", "Reforço possibilidades e ajudo a pessoa a visualizar um bom resultado."], ["C", "Divido a tarefa em um método claro e explico os pontos de atenção."], ["D", "Proponho um primeiro desafio concreto e incentivo a pessoa a agir."] ] }
];

const screens = [...document.querySelectorAll(".screen")];
const answers = [];
let current = 0;
let draft = { most: null, least: null };
let playerName = "Jogador";
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const showScreen = (id) => {
  screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const toast = (message) => {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
};

function renderMission() {
  const mission = missions[current];
  draft = answers[current] ? { ...answers[current] } : { most: null, least: null };
  $("#mission-label").textContent = `FASE ${String(current + 1).padStart(2, "0")}`;
  $("#progress-label").textContent = `${current + 1} / ${missions.length}`;
  $("#progress-bar").style.width = `${((current + 1) / missions.length) * 100}%`;
  $(".progress-track").setAttribute("aria-valuenow", String(current + 1));
  $("#mission-title").textContent = mission.context.toUpperCase();
  $("#mission-icon").textContent = mission.icon;
  $("#challenge-number").textContent = String(current + 1).padStart(2, "0");
  $("#question-text").textContent = mission.question;
  $("#back-button").disabled = current === 0;
  const grid = $("#answer-grid");
  grid.innerHTML = "";
  mission.answers.forEach(([factor, text], index) => {
    const card = document.createElement("article");
    card.className = "answer-card";
    card.dataset.factor = factor;
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
  draft[kind] = factor;
  updateCards();
}

function updateCards() {
  document.querySelectorAll(".answer-card").forEach(card => {
    card.classList.toggle("is-most", card.dataset.factor === draft.most);
    card.classList.toggle("is-least", card.dataset.factor === draft.least);
  });
  $("#next-button").disabled = !draft.most || !draft.least;
}

function finish() {
  const score = { D: 0, I: 0, S: 0, C: 0 };
  answers.forEach(answer => { score[answer.most] += 1; score[answer.least] -= 1; });
  const normalized = Object.fromEntries(Object.entries(score).map(([factor, value]) => [factor, Math.round((value + missions.length) / (missions.length * 2) * 100)]));
  const dominant = Object.entries(normalized).sort((a,b) => b[1] - a[1])[0][0];
  const profiles = {
    D: ["AÇÃO DIRETA", "Você tende a ganhar energia quando pode avançar, definir prioridades e enfrentar desafios de forma objetiva."],
    I: ["CONEXÃO ATIVA", "Você tende a ganhar energia ao envolver pessoas, compartilhar ideias e criar movimento por meio da comunicação."],
    S: ["RITMO COOPERATIVO", "Você tende a ganhar energia ao sustentar o grupo, oferecer apoio e construir continuidade com as pessoas."],
    C: ["PRECISÃO TÁTICA", "Você tende a ganhar energia ao analisar cenários, organizar critérios e proteger a qualidade das entregas."]
  };
  $("#profile-badge").textContent = dominant;
  $("#profile-name").textContent = profiles[dominant][0];
  $("#profile-copy").textContent = profiles[dominant][1];
  $("#result-summary").textContent = `${playerName}, esta demonstração apresenta tendências a partir de sete situações. O relatório definitivo usará os 50 itens revisados.`;
  const bars = $("#stat-bars");
  bars.innerHTML = Object.entries(normalized).map(([factor, value]) => `<div class="stat-row"><b>${factor}</b><div class="stat-track"><i style="width:${value}%"></i></div><span>${value}</span></div>`).join("");
  showScreen("result-screen");
}

$("#player-form").addEventListener("submit", event => {
  event.preventDefault();
  playerName = $("#player-name").value.trim() || "Jogador";
  $("#hud-name").textContent = playerName;
  current = 0;
  answers.length = 0;
  renderMission();
  showScreen("quiz-screen");
});

$("#next-button").addEventListener("click", () => {
  if (!draft.most || !draft.least) return toast("Escolha uma opção MAIS e uma MENOS.");
  answers[current] = { ...draft };
  if (current === missions.length - 1) return finish();
  current += 1;
  renderMission();
});
$("#back-button").addEventListener("click", () => { if (current > 0) { current -= 1; renderMission(); } });
$("#exit-button").addEventListener("click", () => { if (confirm("Sair da missão e voltar ao início?")) showScreen("start-screen"); });
$("#restart-button").addEventListener("click", () => { showScreen("start-screen"); $("#player-name").focus(); });
$("#sound-toggle").addEventListener("click", event => {
  const active = event.currentTarget.getAttribute("aria-pressed") === "true";
  event.currentTarget.setAttribute("aria-pressed", String(!active));
  event.currentTarget.setAttribute("aria-label", active ? "Ativar efeitos sonoros" : "Desativar efeitos sonoros");
  toast(active ? "SOM DESATIVADO" : "SOM ATIVADO · efeitos entram na próxima fase");
});

document.addEventListener("keydown", event => {
  if (!$("#quiz-screen").classList.contains("active")) return;
  if (/^[1-4]$/.test(event.key)) {
    const card = document.querySelectorAll(".answer-card")[Number(event.key) - 1];
    if (card) { card.focus?.(); toast("Use M para MAIS ou L para MENOS."); card.dataset.keyboardSelected = "true"; }
  }
  const selected = document.querySelector('.answer-card[data-keyboard-selected="true"]');
  if (selected && event.key.toLowerCase() === "m") { choose("most", selected.dataset.factor); delete selected.dataset.keyboardSelected; }
  if (selected && event.key.toLowerCase() === "l") { choose("least", selected.dataset.factor); delete selected.dataset.keyboardSelected; }
});
