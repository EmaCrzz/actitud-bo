#!/bin/bash
# scripts/rehearse-migrations.sh
#
# Ensaya las migraciones pendientes contra un entorno REAL sin persistir nada.
#
# Cómo: DDL en Postgres es transaccional, así que las migraciones corren dentro
# de BEGIN … ROLLBACK. Se ejecutan las sentencias exactas, contra el schema y
# los datos reales, y al terminar no queda absolutamente nada.
#
# Por qué existe: las migraciones se escriben midiendo dev, pero `db:push-prod`
# es un paso manual que puede correrse semanas después, contra datos distintos.
# Un `db push` que falla a mitad deja el entorno en un estado intermedio; este
# ensayo descubre esa falla antes, sin consecuencias.
#
# Uso:
#   ./scripts/rehearse-migrations.sh prod
#   ./scripts/rehearse-migrations.sh dev
#
# Requiere SUPABASE_DB_URL_PROD / SUPABASE_DB_URL_DEV en .env.local.
#
# Limitación conocida: no puede ensayar migraciones con CREATE INDEX
# CONCURRENTLY, que no corre dentro de una transacción. El script las detecta y
# avisa en vez de fallar de forma confusa.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
echo_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }
echo_step()  { echo -e "\n${BLUE}==>${NC} $1"; }

TARGET="${1:-}"

if [[ "$TARGET" != "prod" && "$TARGET" != "dev" ]]; then
    echo "Uso: $0 {prod|dev}"
    echo ""
    echo "Corre las migraciones pendientes del entorno dentro de una transacción"
    echo "y hace ROLLBACK. No persiste ningún cambio."
    exit 1
fi

if [[ ! -f .env.local ]]; then
    echo_error "No se encontró .env.local"
    exit 1
fi

set -a; . ./.env.local; set +a

# Sin `${TARGET^^}`: macOS trae bash 3.2, que no soporta esa expansión.
if [[ "$TARGET" == "prod" ]]; then
    DB_URL="${SUPABASE_DB_URL_PROD:-}"
    VAR_NAME="SUPABASE_DB_URL_PROD"
else
    DB_URL="${SUPABASE_DB_URL_DEV:-}"
    VAR_NAME="SUPABASE_DB_URL_DEV"
fi

if [[ -z "$DB_URL" ]]; then
    echo_error "Falta $VAR_NAME en .env.local"
    exit 1
fi

echo_step "Consultando migraciones ya aplicadas en $TARGET"

APPLIED=$(psql "$DB_URL" -t -A --no-psqlrc \
    -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;")

PENDING=()
for f in supabase/migrations/*.sql; do
    version="$(basename "$f" | cut -d_ -f1)"
    if ! grep -qx "$version" <<< "$APPLIED"; then
        PENDING+=("$f")
    fi
done

if [[ ${#PENDING[@]} -eq 0 ]]; then
    echo_info "No hay migraciones pendientes en $TARGET. Nada que ensayar."
    exit 0
fi

echo_info "${#PENDING[@]} migración(es) pendiente(s):"
for f in "${PENDING[@]}"; do echo "    - $(basename "$f")"; done

# CREATE INDEX CONCURRENTLY no puede correr dentro de una transacción, así que
# el ensayo no la cubre. Avisar explícitamente en vez de fallar con un error
# oscuro de Postgres a mitad de camino.
for f in "${PENDING[@]}"; do
    if grep -qi "concurrently" "$f"; then
        echo_warn "$(basename "$f") usa CONCURRENTLY — no es transaccionable."
        echo_warn "El ensayo no la puede cubrir. Revisala a mano."
        exit 1
    fi
done

echo_step "Ensayando contra $TARGET dentro de BEGIN … ROLLBACK"
echo_warn "No se persiste nada. Los ALTER TABLE toman locks breves durante el ensayo."

# `lock_timeout` corto: si hay tráfico real en el medio, preferimos fallar
# rápido antes que encolar y bloquear a los usuarios del entorno.
SCRIPT="\\timing on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
"
i=0
for f in "${PENDING[@]}"; do
    i=$((i + 1))
    SCRIPT+="\\echo ''
\\echo '--- ${i}/${#PENDING[@]} $(basename "$f") ---'
\\i $f
"
done
SCRIPT+="ROLLBACK;
"

if psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off <<< "$SCRIPT"; then
    echo_step "Ensayo OK"
    echo_info "Las ${#PENDING[@]} migraciones aplican limpio contra los datos reales de $TARGET."
    echo_info "No quedó ningún cambio: la transacción hizo ROLLBACK."
    echo ""
    echo_info "Siguiente paso: correr la auditoría y aplicar de verdad."
    echo "    psql \"\$$VAR_NAME\" -f supabase/scripts/audit-integrity.sql"
    echo "    npm run db:push-$TARGET"
else
    echo_step "Ensayo FALLIDO"
    echo_error "Alguna migración no aplica contra $TARGET. NO correr db:push-${TARGET}."
    echo_error "El error de arriba es el mismo que habría roto el push real."
    echo_info "No se persistió nada: la transacción abortó."
    exit 1
fi
