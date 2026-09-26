#!/usr/bin/env bash
#
# Borra de la DB de dev los registros que deja la suite e2e (prefijo [E2E]).
#
# Corre contra SUPABASE_DB_URL_DEV. Pide confirmación explícita porque es un
# DELETE sobre una base que comparten desarrollo y el preview donde prueba QA:
# un dedazo acá no se deshace con Ctrl-Z.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "❌ No existe .env.local — no se puede resolver SUPABASE_DB_URL_DEV."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env.local; set +a

if [ -z "${SUPABASE_DB_URL_DEV:-}" ]; then
  echo "❌ Falta SUPABASE_DB_URL_DEV en .env.local."
  echo "   Dashboard de Supabase → Connect → Session pooler."
  exit 1
fi

# Se muestra sólo el host: la URL lleva la password embebida.
HOST=$(echo "$SUPABASE_DB_URL_DEV" | sed -E 's|.*@([^:/]+).*|\1|')

echo "🧹 Limpieza de datos e2e"
echo "   Base:     $HOST"
echo "   Criterio: customers.first_name LIKE '[E2E]%' (+ sus membresías, pagos y asistencias)"
echo
read -r -p "¿Confirmás el borrado? (escribí 'si'): " answer

if [ "$answer" != "si" ]; then
  echo "Cancelado."
  exit 0
fi

psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f scripts/e2e-clean.sql
