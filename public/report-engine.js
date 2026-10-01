const FACTORS = ["D", "I", "S", "C"];

const profiles = {
  D: { name: "Ação Direta", call: "Comandante de avanço", overview: "Tende a responder com rapidez, assumir decisões e concentrar energia no resultado.", strength: "Transforma impasses em movimento e sustenta direção sob pressão.", blind: "Pode avançar antes que riscos, impactos ou necessidades das pessoas estejam claros.", adjustment: "Antes de uma decisão importante, faça uma pausa curta e peça uma objeção relevante.", motivators: ["Autonomia para decidir", "Metas desafiadoras", "Progresso visível"], drains: ["Indefinição prolongada", "Excesso de controle", "Conversas sem decisão"] },
  I: { name: "Conexão Ativa", call: "Catalisador de equipe", overview: "Tende a criar movimento por meio de conversa, entusiasmo e mobilização de pessoas.", strength: "Amplia participação, conecta ideias e ajuda o grupo a enxergar possibilidades.", blind: "Pode subestimar detalhes, tempo de preparação ou resistência menos visível.", adjustment: "Converta o entusiasmo em um acordo escrito com responsáveis e prazo.", motivators: ["Troca com pessoas", "Liberdade para criar", "Reconhecimento e novidade"], drains: ["Isolamento prolongado", "Rotina excessiva", "Ambientes muito fechados"] },
  S: { name: "Ritmo Cooperativo", call: "Guardião do time", overview: "Tende a preservar continuidade, apoiar pessoas e construir um ritmo confiável de trabalho.", strength: "Cria segurança para colaboração e mantém entregas consistentes ao longo do tempo.", blind: "Pode adiar confrontos ou mudanças necessárias para proteger a harmonia.", adjustment: "Nomeie cedo o desconforto e proponha uma mudança pequena com data para revisão.", motivators: ["Previsibilidade saudável", "Cooperação genuína", "Tempo para adaptação"], drains: ["Mudanças abruptas", "Conflitos constantes", "Pressão sem apoio"] },
  C: { name: "Precisão Tática", call: "Estrategista de qualidade", overview: "Tende a investigar, estruturar critérios e proteger a qualidade das decisões e entregas.", strength: "Enxerga riscos, organiza complexidade e eleva a consistência do trabalho.", blind: "Pode prolongar a análise ou elevar o padrão além do necessário para a situação.", adjustment: "Defina antecipadamente o que significa ‘bom o suficiente’ e quando a análise termina.", motivators: ["Critérios claros", "Tempo para analisar", "Qualidade e domínio técnico"], drains: ["Ambiguidade constante", "Improviso sem critério", "Pressão para decidir sem dados"] }
};

const contextCopy = {
  "Tomada de decisão": {
    D: ["decidir com velocidade e assumir a direção", "testar impactos antes de fechar a escolha"], I: ["envolver pessoas e construir adesão", "separar popularidade de qualidade da decisão"], S: ["preservar continuidade e considerar impactos humanos", "não adiar escolhas necessárias para evitar desconforto"], C: ["comparar critérios, evidências e riscos", "definir um prazo para encerrar a análise"]
  },
  "Comunicação": {
    D: ["ser direto e orientar para a ação", "confirmar se o tom abriu espaço para perguntas"], I: ["engajar por histórias, energia e proximidade", "registrar os acordos depois da conversa"], S: ["escutar com atenção e criar segurança", "expressar sua própria posição de forma explícita"], C: ["explicar com estrutura, precisão e contexto", "adaptar o nível de detalhe à necessidade do público"]
  },
  "Execução do trabalho": {
    D: ["priorizar impacto e acelerar entregas", "proteger qualidade e sustentabilidade do ritmo"], I: ["gerar ideias e manter o grupo mobilizado", "criar uma rotina simples para acompanhamento"], S: ["manter constância e apoiar o fluxo coletivo", "reavaliar rotinas que já perderam valor"], C: ["organizar método e verificar padrões", "evitar revisar além do ganho real de qualidade"]
  },
  "Conflito e feedback": {
    D: ["encarar o problema e falar com franqueza", "equilibrar firmeza com escuta"], I: ["restabelecer diálogo e recuperar conexão", "não suavizar o ponto principal do feedback"], S: ["reduzir tensão e cuidar da confiança", "trazer divergências antes que se acumulem"], C: ["separar fatos, critérios e interpretações", "considerar também o impacto emocional da conversa"]
  },
  "Mudança": {
    D: ["iniciar movimento e ajustar durante o caminho", "verificar dependências antes de acelerar"], I: ["enxergar possibilidades e contagiar o grupo", "transformar possibilidades em um plano concreto"], S: ["proteger continuidade e apoiar a adaptação", "experimentar mudanças pequenas antes de resistir"], C: ["mapear riscos e compreender a lógica da mudança", "agir com hipóteses mesmo sem informação completa"]
  },
  "Colaboração e reuniões": {
    D: ["conduzir para decisões e responsabilidades", "garantir participação antes de encerrar"], I: ["conectar ideias e aumentar participação", "manter foco no resultado da reunião"], S: ["integrar contribuições e apoiar acordos", "não assumir tarefas demais para ajudar o grupo"], C: ["organizar pauta, critérios e pendências", "deixar espaço para exploração antes de estruturar"]
  },
  "Liderança e influência": {
    D: ["desafiar pessoas e dar direção", "adequar a pressão ao nível de prontidão"], I: ["inspirar, reconhecer e mobilizar", "acompanhar compromissos depois da inspiração"], S: ["desenvolver com apoio e confiança", "combinar apoio com expectativas firmes"], C: ["orientar por método, critérios e conhecimento", "dar autonomia sem exigir domínio completo no início"]
  }
};

const communication = {
  D: "Seja objetivo, apresente opções e deixe claro qual decisão é necessária.",
  I: "Comece pelo panorama, permita troca e mostre como outras pessoas participam.",
  S: "Dê contexto, tempo para elaborar e demonstre disponibilidade para apoiar.",
  C: "Traga dados, critérios e detalhes relevantes sem pressionar por resposta imediata."
};

function contextScores(items, responses) {
  const result = {};
  responses.forEach((response, index) => {
    const context = items[index]?.context;
    if (!context) return;
    result[context] ??= { D: 0, I: 0, S: 0, C: 0 };
    result[context][response.most] += 1;
    result[context][response.least] -= 1;
  });
  return result;
}

export function buildReport(playerName, journey, responses, result) {
  const ranking = Object.entries(result.scores).sort((a,b) => b[1] - a[1]);
  const dominant = ranking[0][0];
  const secondary = ranking[1][0];
  const profile = profiles[dominant];
  const byContext = contextScores(journey, responses);
  const contexts = Object.entries(byContext).map(([name, scores]) => {
    const factor = Object.entries(scores).sort((a,b) => b[1] - a[1])[0][0];
    const [tendency, adjustment] = contextCopy[name][factor];
    return { name, factor, tendency, adjustment };
  });
  return {
    playerName, generatedAt: new Date().toLocaleDateString("pt-BR"), dominant, secondary,
    title: profile.name, call: profile.call, overview: profile.overview,
    strength: profile.strength, blind: profile.blind, adjustment: profile.adjustment,
    motivators: profile.motivators, drains: profile.drains, scores: result.scores,
    confidence: result.confidence, contexts,
    communication: FACTORS.map(factor => ({ factor, text: communication[factor] })),
    quests: [
      `Pratique por uma semana: ${profile.adjustment}`,
      `Peça a alguém de confiança um exemplo de quando sua tendência ${dominant} ajudou e quando limitou o trabalho.`,
      `Em uma decisão relevante, convide uma pessoa com tendência ${secondary} para revisar seu plano.`
    ]
  };
}
