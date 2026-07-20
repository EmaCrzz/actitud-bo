#!/bin/bash
# scripts/db-restore-dev.sh
#
# Modo por defecto: snapshot de PROD y restore full en DEV.
# Modo --from-backup <dir>: restaurar en DEV desde un backup local ya generado.
#
# En ambos modos se sobrescribe schema public + data de auth/storage +
# tabla de migraciones en DEV.
#
# Requiere:
#   Modo default:       SUPABASE_DB_URL_PROD y SUPABASE_DB_URL_DEV en .env.local
#   Modo --from-backup: SUPABASE_DB_URL_DEV en .env.local

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }
echo_step()  { echo -e "\n${BLUE}==>${NC} $1"; }

usage() {
    cat <<EOF
Uso:
  $0                              Snapshot de PROD y restore en DEV
  $0 --from-backup <dir>          Restaurar en DEV desde un backup local

En modo --from-backup, el directorio debe contener exactamente un archivo por patrón:
  schema_*.sql       (estructura de public)
  data_*.sql         (data combinada: auth + public + storage)
  migrations_*.sql   (data de supabase_migrations.schema_migrations)
EOF
}

FROM_BACKUP=""
while [ $# -gt 0 ]; do
    case "$1" in
        --from-backup)
            if [ $# -lt 2 ]; then
                echo_error "--from-backup requiere un directorio"
                usage
                exit 1
            fi
            FROM_BACKUP="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo_error "Flag desconocido: $1"
            usage
            exit 1
            ;;
    esac
done

confirm() {
    local prompt="$1"
    read -p "$prompt (yes/no): " answer
    if [ "$answer" != "yes" ]; then
        echo_info "Cancelado."
        exit 0
    fi
}

load_env() {
    if [ ! -f .env.local ]; then
        echo_error ".env.local no existe. Necesitás SUPABASE_DB_URL_DEV (y SUPABASE_DB_URL_PROD en modo default)."
        exit 1
    fi
    set -a
    # shellcheck disable=SC2046
    eval $(grep -E '^SUPABASE_DB_URL_[A-Z]+=' .env.local | sed 's/^/export /')
    set +a

    if [ -z "${SUPABASE_DB_URL_DEV:-}" ]; then
        echo_error "SUPABASE_DB_URL_DEV no está en .env.local"
        exit 1
    fi

    if [ -z "$FROM_BACKUP" ] && [ -z "${SUPABASE_DB_URL_PROD:-}" ]; then
        echo_error "SUPABASE_DB_URL_PROD no está en .env.local (requerido en modo default)"
        exit 1
    fi
}

check_tools() {
    command -v psql >/dev/null 2>&1 || { echo_error "Falta 'psql'"; exit 1; }

    # En modo --from-backup no necesitamos supabase CLI ni docker.
    if [ -n "$FROM_BACKUP" ]; then
        return
    fi

    command -v supabase >/dev/null 2>&1 || { echo_error "Falta 'supabase' CLI"; exit 1; }
    command -v docker >/dev/null 2>&1   || { echo_error "Falta 'docker' (Supabase CLI lo usa para dump)"; exit 1; }

    # Supabase CLI >= 2.x: los proyectos de PROD ya corren Postgres 17,
    # y el pg_dump embebido en la CLI v1.x es 15 → falla con "server version mismatch".
    local cli_major
    cli_major=$(supabase --version | cut -d. -f1)
    if [ "$cli_major" -lt 2 ]; then
        echo_error "Supabase CLI $(supabase --version) es muy vieja (necesita >= 2.x)."
        echo_error "Corré: brew upgrade supabase/tap/supabase"
        exit 1
    fi

    # Docker daemon corriendo — la CLI lanza pg_dump dentro de un container.
    if ! docker info >/dev/null 2>&1; then
        echo_error "Docker daemon no responde. Arrancá Docker Desktop y reintentá:"
        echo_error "  open -a Docker"
        exit 1
    fi
}

# Resuelve un único archivo que matchea un glob dentro de un directorio.
# Falla si hay 0 o >1 matches.
resolve_backup_file() {
    local dir="$1"
    local pattern="$2"
    local matches=()
    while IFS= read -r -d '' f; do
        matches+=("$f")
    done < <(find "$dir" -maxdepth 1 -type f -name "$pattern" -print0)

    if [ "${#matches[@]}" -eq 0 ]; then
        echo_error "No se encontró ningún archivo con patrón '$pattern' en $dir"
        exit 1
    fi
    if [ "${#matches[@]}" -gt 1 ]; then
        echo_error "Múltiples archivos con patrón '$pattern' en $dir:"
        printf '  %s\n' "${matches[@]}" >&2
        exit 1
    fi
    printf '%s\n' "${matches[0]}"
}

load_env
check_tools

# =============================================================================
# MODO --from-backup: restore desde un backup local ya generado
# =============================================================================
if [ -n "$FROM_BACKUP" ]; then
    if [ ! -d "$FROM_BACKUP" ]; then
        echo_error "El directorio '$FROM_BACKUP' no existe."
        exit 1
    fi

    SCHEMA_FILE=$(resolve_backup_file "$FROM_BACKUP" 'schema_*.sql')
    DATA_FILE=$(resolve_backup_file "$FROM_BACKUP" 'data_*.sql')
    MIGRATIONS_FILE=$(resolve_backup_file "$FROM_BACKUP" 'migrations_*.sql')

    echo_step "Plan (modo --from-backup)"
    echo "  Backup:      $FROM_BACKUP"
    echo "  Schema:      $(basename "$SCHEMA_FILE") ($(du -h "$SCHEMA_FILE" | cut -f1))"
    echo "  Data:        $(basename "$DATA_FILE") ($(du -h "$DATA_FILE" | cut -f1))"
    echo "  Migrations:  $(basename "$MIGRATIONS_FILE") ($(du -h "$MIGRATIONS_FILE" | cut -f1))"
    echo ""
    echo "  1. Wipe en DEV: DROP SCHEMA public CASCADE"
    echo "                  + TRUNCATE de todas las tablas de auth y storage"
    echo "                  + TRUNCATE supabase_migrations.schema_migrations"
    echo "  2. Aplicar schema (recrea public)"
    echo "  3. Aplicar data (auth + public + storage)"
    echo "  4. Aplicar migrations (schema_migrations)"
    echo "  5. Verificación de row counts"

    DEV_HOST=$(echo "$SUPABASE_DB_URL_DEV" | sed -E 's|.*@([^/:]+).*|\1|')
    echo ""
    echo_warn "URL de DEV apunta a: $DEV_HOST"
    echo_warn "OPERACIÓN DESTRUCTIVA sobre DEV — reemplaza public + auth + storage + schema_migrations."
    confirm "¿Continuar?"

    echo_step "Wipe en DEV"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- TRUNCATE tablas de auth y storage; skipear las que son propiedad del servicio
    -- interno de Supabase (auth.schema_migrations, storage.migrations, etc.) sobre las que
    -- el rol postgres no tiene permiso — tampoco vienen en el backup.
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'auth') LOOP
        BEGIN
            EXECUTE 'TRUNCATE TABLE auth.' || quote_ident(r.tablename) || ' CASCADE';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'skip auth.%: sin permiso (tabla interna del servicio)', r.tablename;
        END;
    END LOOP;
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'storage') LOOP
        BEGIN
            EXECUTE 'TRUNCATE TABLE storage.' || quote_ident(r.tablename) || ' CASCADE';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'skip storage.%: sin permiso (tabla interna del servicio)', r.tablename;
        END;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
    ) THEN
        TRUNCATE supabase_migrations.schema_migrations;
    END IF;
END $$;
SQL

    echo_step "Restore schema (public)"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

    echo_step "Restore data (auth + public + storage)"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$DATA_FILE"

    echo_step "Restore migrations (schema_migrations)"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_FILE"

    echo_step "Verificación"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'auth.users'          AS tabla, count(*)::text AS rows FROM auth.users
UNION ALL SELECT 'customers',            count(*)::text FROM customers
UNION ALL SELECT 'customer_membership',  count(*)::text FROM customer_membership
UNION ALL SELECT 'assistance',           count(*)::text FROM assistance
UNION ALL SELECT 'profile',              count(*)::text FROM profile
UNION ALL SELECT 'user_roles',           count(*)::text FROM user_roles;
SQL

    echo_info "Restore completado desde $FROM_BACKUP."
    exit 0
fi

# =============================================================================
# MODO default: dump PROD → restore DEV
# =============================================================================

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${STAMP}"
mkdir -p "$BACKUP_DIR"

echo_step "Plan"
echo "  1. Dumpear desde PROD: public (schema + data), auth (data), migrations (data)"
echo "     → $BACKUP_DIR/"
echo "  2. Confirmación final antes de tocar DEV"
echo "  3. Wipe en DEV: DROP SCHEMA public, TRUNCATE auth.users CASCADE, TRUNCATE schema_migrations"
echo "  4. Restore de los dumps en DEV en el orden correcto"
echo ""
echo_warn "El dump incluye PII (emails, hashes de passwords de staff)."
echo_warn "Los archivos quedan en $BACKUP_DIR/ (gitignored)."
echo ""
confirm "¿Empezar con el dump de PROD?"

echo_step "Dumpeando public schema (estructura) desde PROD"
supabase db dump --db-url "$SUPABASE_DB_URL_PROD" \
    --schema public \
    -f "$BACKUP_DIR/public_schema.sql"

echo_step "Dumpeando public data desde PROD"
supabase db dump --db-url "$SUPABASE_DB_URL_PROD" \
    --schema public \
    --data-only --use-copy \
    -f "$BACKUP_DIR/public_data.sql"

echo_step "Dumpeando auth data desde PROD"
supabase db dump --db-url "$SUPABASE_DB_URL_PROD" \
    --schema auth \
    --data-only --use-copy \
    -f "$BACKUP_DIR/auth_data.sql"

echo_step "Dumpeando supabase_migrations desde PROD"
supabase db dump --db-url "$SUPABASE_DB_URL_PROD" \
    --schema supabase_migrations \
    --data-only --use-copy \
    -f "$BACKUP_DIR/migrations_data.sql" || {
        echo_warn "schema supabase_migrations no existe o falló el dump — sigo sin él."
        rm -f "$BACKUP_DIR/migrations_data.sql"
    }

echo_info "Dumps guardados:"
du -sh "$BACKUP_DIR"/*

echo_step "PELIGRO: paso siguiente sobrescribe DEV"
DEV_HOST=$(echo "$SUPABASE_DB_URL_DEV" | sed -E 's|.*@([^/:]+).*|\1|')
echo_warn "URL de DEV apunta a: $DEV_HOST"
echo_warn "Se va a: DROP SCHEMA public CASCADE + TRUNCATE auth.users CASCADE + TRUNCATE schema_migrations."
confirm "¿Continuar y restaurar en DEV?"

echo_step "Wipe en DEV"
psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
TRUNCATE TABLE auth.users CASCADE;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
    ) THEN
        TRUNCATE supabase_migrations.schema_migrations;
    END IF;
END $$;
SQL

echo_step "Restore auth data"
psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/auth_data.sql"

echo_step "Restore public schema"
psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/public_schema.sql"

echo_step "Restore public data"
psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/public_data.sql"

if [ -f "$BACKUP_DIR/migrations_data.sql" ]; then
    echo_step "Restore migrations table"
    psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/migrations_data.sql"
fi

echo_step "Verificación"
psql "$SUPABASE_DB_URL_DEV" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'auth.users'          AS tabla, count(*)::text AS rows FROM auth.users
UNION ALL SELECT 'customers',            count(*)::text FROM customers
UNION ALL SELECT 'customer_membership',  count(*)::text FROM customer_membership
UNION ALL SELECT 'assistance',           count(*)::text FROM assistance
UNION ALL SELECT 'profile',              count(*)::text FROM profile
UNION ALL SELECT 'user_roles',           count(*)::text FROM user_roles;
SQL

echo_info "Listo. Dumps en $BACKUP_DIR/ (gitignored)."
