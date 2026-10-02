# DISC Funcional — Etapa 1

Base técnica da primeira etapa do MVP: esquema PostgreSQL, configuração versionada e módulo de pontuação testável.

## Jornada adaptativa arcade

- Banco inicial com 42 situações originais, seis para cada contexto funcional.
- Cada jornada apresenta 21 itens comuns e 7 itens adaptativos: 28 missões, estimadas em 8–10 minutos.
- O seletor prioriza facetas com pouca evidência, equilibra contextos, evita repetição consecutiva e ajuda a diferenciar fatores próximos.
- A razão de seleção de cada item adaptativo fica disponível no objeto da jornada para futura auditoria no backend.
- Esta seleção é heurística e preliminar; parâmetros psicométricos exigem amostra real e validação profissional.

## Decisões desta etapa

- O produto mede tendências de comportamento observável; não mede competência e não serve para seleção.
- Os parâmetros são provisórios e ficam fora do código em `config/model.v1.json`.
- O máximo teórico de intensidade é `100`: os pontos possíveis formam um losango com vértices `(0,100)`, `(100,0)`, `(0,-100)` e `(-100,0)`.
- A distância máxima entre dois perfis é `200`, entre vértices opostos desse losango.
- Intensidade abaixo de `10` resulta em `FLEXIVEL`, sem forçar um estilo.
- IA generativa não participa do cálculo nem do relatório na v1.

## Executar os testes

Requer Node.js 22.6+ (execução nativa de TypeScript com sintaxe apagável):

```powershell
node --test tests/scoring.test.ts
```

## Publicar na OCI

Use o procedimento seguro para Nginx compartilhado em [`DEPLOY-OCI.md`](DEPLOY-OCI.md). O virtual host fornecido atende somente `disc.nxuslab.com` e não substitui as configurações dos demais sistemas.

## Estrutura

- `db/schema.sql`: entidades, consentimento, auditoria e exclusão lógica/anonimização preparada.
- `config/model.v1.json`: pesos, faixas, limites e versão do modelo.
- `src/scoring.ts`: cálculo puro, sem dependência da interface ou do banco.
- `tests/scoring.test.ts`: casos nominais, extremos, equilíbrio, adaptação e validade.
