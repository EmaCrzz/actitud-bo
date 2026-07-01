#!/bin/bash
# Supabase Multi-Environment Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Carga variables SUPABASE_DB_URL_* de .env.local si existe.
# Grep filtra para no exportar otras variables por accidente.
load_supabase_db_urls() {
    if [ -f .env.local ]; then
        set -a
        # shellcheck disable=SC2046
        eval $(grep -E '^SUPABASE_DB_URL_[A-Z]+=' .env.local | sed 's/^/export /')
        set +a
    fi
}

# Function to link to production and generate migration
link_production() {
    echo_info "Linking to production project..."
    read -p "Enter your production project ID (from Supabase dashboard): " PROD_PROJECT_ID

    if [ -z "$PROD_PROJECT_ID" ]; then
        echo_error "Production project ID is required"
        exit 1
    fi

    supabase link --project-ref $PROD_PROJECT_ID
    echo_info "Linked to production project: $PROD_PROJECT_ID"

    # Generate initial migration from production
    echo_info "Generating initial migration from production schema..."
    supabase db pull
    echo_info "Initial migration generated successfully"
}

# Function to link to development
link_development() {
    echo_info "Linking to development project..."
    read -p "Enter your development project ID (from Supabase dashboard): " DEV_PROJECT_ID

    if [ -z "$DEV_PROJECT_ID" ]; then
        echo_error "Development project ID is required"
        exit 1
    fi

    supabase link --project-ref $DEV_PROJECT_ID
    echo_info "Linked to development project: $DEV_PROJECT_ID"

    # Apply migrations to development
    echo_info "Applying migrations to development..."
    supabase db push
    echo_info "Migrations applied to development successfully"
}

# Function to generate new migration
new_migration() {
    echo_info "Generating new migration..."
    read -p "Enter migration name: " MIGRATION_NAME

    if [ -z "$MIGRATION_NAME" ]; then
        echo_error "Migration name is required"
        exit 1
    fi

    supabase migration new $MIGRATION_NAME
    echo_info "New migration created: $MIGRATION_NAME"
    echo_warn "Edit the migration file in supabase/migrations/ and then run 'push-dev' or 'push-prod'"
}

# Function to push to development
push_dev() {
    echo_info "Pushing migrations to development..."

    load_supabase_db_urls

    if [ -n "$SUPABASE_DB_URL_DEV" ]; then
        # Modo pooler: usa el connection string del Session Pooler (IPv4).
        # Bypassa `supabase link` y la conexión directa por IPv6 que falla
        # en la mayoría de las redes desde 2024.
        echo_info "Using SUPABASE_DB_URL_DEV from .env.local (Session Pooler)"
        supabase db push --db-url "$SUPABASE_DB_URL_DEV"
        echo_info "Migrations pushed to development successfully"
        return
    fi

    # Fallback interactivo (probablemente falla con "no route to host" en IPv6).
    echo_warn "SUPABASE_DB_URL_DEV no está en .env.local. Puede fallar con IPv6."
    echo_warn "Ver instrucciones en WORKFLOW.md para configurar el Session Pooler."
    read -p "Enter your development project ID: " DEV_PROJECT_ID

    if [ -z "$DEV_PROJECT_ID" ]; then
        echo_error "Development project ID is required"
        exit 1
    fi

    supabase link --project-ref $DEV_PROJECT_ID
    supabase db push
    echo_info "Migrations pushed to development successfully"
}

# Function to push to production
push_prod() {
    echo_warn "⚠️  CAUTION: You are about to push migrations to PRODUCTION"
    read -p "Are you sure? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo_info "Operation cancelled"
        exit 0
    fi

    echo_info "Pushing migrations to production..."

    load_supabase_db_urls

    if [ -n "$SUPABASE_DB_URL_PROD" ]; then
        # Modo pooler: mismo mecanismo que push_dev pero apuntando a PROD.
        echo_info "Using SUPABASE_DB_URL_PROD from .env.local (Session Pooler)"
        supabase db push --db-url "$SUPABASE_DB_URL_PROD"
        echo_info "Migrations pushed to production successfully"
        return
    fi

    # Fallback interactivo (probablemente falla con IPv6).
    echo_warn "SUPABASE_DB_URL_PROD no está en .env.local. Puede fallar con IPv6."
    echo_warn "Ver instrucciones en WORKFLOW.md para configurar el Session Pooler."
    read -p "Enter your production project ID: " PROD_PROJECT_ID

    if [ -z "$PROD_PROJECT_ID" ]; then
        echo_error "Production project ID is required"
        exit 1
    fi

    supabase link --project-ref $PROD_PROJECT_ID
    supabase db push
    echo_info "Migrations pushed to production successfully"
}

# Function to show current migration status
status() {
    echo_info "Current migration status:"
    supabase migration list
}

# Main script
case "$1" in
    "init-prod")
        link_production
        ;;
    "link-dev")
        link_development
        ;;
    "new")
        new_migration
        ;;
    "push-dev")
        push_dev
        ;;
    "push-prod")
        push_prod
        ;;
    "status")
        status
        ;;
    *)
        echo "Usage: $0 {init-prod|link-dev|new|push-dev|push-prod|status}"
        echo ""
        echo "Commands:"
        echo "  init-prod   Link to production and generate initial migration"
        echo "  link-dev    Link to development and apply migrations"
        echo "  new         Create a new migration"
        echo "  push-dev    Push migrations to development"
        echo "  push-prod   Push migrations to production (with confirmation)"
        echo "  status      Show current migration status"
        exit 1
        ;;
esac