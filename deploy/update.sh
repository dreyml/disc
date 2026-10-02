#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/disc}"
BRANCH="${BRANCH:-main}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Erro: $APP_DIR não contém um clone Git." >&2
  exit 1
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# O site atual não exige build. Se Node estiver instalado, executa a suíte como proteção.
if command -v node >/dev/null 2>&1; then
  node --test tests/scoring.test.ts tests/adaptive.test.mjs tests/report.test.mjs
else
  echo "Node não encontrado: testes automatizados ignorados; conteúdo estático atualizado."
fi

sudo nginx -t
sudo systemctl reload nginx

echo "DISC atualizado para $(git rev-parse --short HEAD)."
