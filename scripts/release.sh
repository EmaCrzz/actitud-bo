#!/bin/bash

# Script de Release Automatizado para Actitud BO
# Usage: ./scripts/release.sh [major|minor|patch]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "📦 Release Script para Actitud BO"
    echo ""
    echo "Usage: ./scripts/release.sh [tipo]"
    echo ""
    echo "Tipos de release:"
    echo "  major    - Cambios breaking (v1.0.0 → v2.0.0)"
    echo "  minor    - Nuevas features (v1.0.0 → v1.1.0)"  
    echo "  patch    - Bug fixes (v1.0.0 → v1.0.1)"
    echo ""
    echo "Ejemplos:"
    echo "  ./scripts/release.sh minor   # Nueva feature"
    echo "  ./scripts/release.sh patch   # Bug fix"
    echo ""
}

# Validar parámetros
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

RELEASE_TYPE=$1

# Validar tipo de release
if [[ ! "$RELEASE_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo -e "${RED}❌ Error: Tipo de release inválido: '$RELEASE_TYPE'${NC}"
    echo ""
    show_help
    exit 1
fi

# Verificar que estamos en la rama develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo -e "${RED}❌ Error: Debes estar en la rama 'develop' para hacer un release${NC}"
    echo -e "${YELLOW}💡 Ejecuta: git checkout develop${NC}"
    exit 1
fi

# Verificar que no hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Hay cambios sin commitear${NC}"
    echo -e "${YELLOW}💡 Ejecuta: git add . && git commit -m 'mensaje'${NC}"
    exit 1
fi

# Obtener el último tag (buscar globalmente)
LAST_TAG=$(git tag -l "v*" | sort -V | tail -n1)
if [ -z "$LAST_TAG" ]; then
    LAST_TAG="v0.0.0"
fi
echo -e "${BLUE}📋 Último tag: $LAST_TAG${NC}"

# Extraer números de versión
VERSION=${LAST_TAG#v}
IFS='.' read -r -a VERSION_PARTS <<< "$VERSION"
MAJOR=${VERSION_PARTS[0]:-0}
MINOR=${VERSION_PARTS[1]:-0}
PATCH=${VERSION_PARTS[2]:-0}

# Calcular nueva versión
case $RELEASE_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="v$MAJOR.$MINOR.$PATCH"
echo -e "${GREEN}🚀 Nueva versión: $NEW_VERSION${NC}"

# Mostrar changelog preview
echo ""
echo -e "${BLUE}📝 Cambios desde $LAST_TAG:${NC}"
if [ "$LAST_TAG" != "v0.0.0" ]; then
    git log --oneline $LAST_TAG..HEAD | head -10
else
    git log --oneline | head -10
fi
echo ""

# Confirmar release
echo -e "${YELLOW}¿Continuar con el release $NEW_VERSION? [y/N]${NC}"
read -r CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Release cancelado${NC}"
    exit 0
fi

# Actualizar rama develop
echo -e "${BLUE}📥 Actualizando rama develop...${NC}"
git pull origin develop

# Actualizar versión en package.json
echo -e "${BLUE}📝 Actualizando versión en package.json...${NC}"
sed -i '' "s/\"version\": \".*\"/\"version\": \"${NEW_VERSION#v}\"/" package.json
git add package.json
git commit -m "Bump version to $NEW_VERSION"

# Mergear develop a main
echo -e "${BLUE}🔄 Cambiando a main y mergeando develop...${NC}"
git checkout main
git pull origin main
git merge develop --no-ff -m "Release $NEW_VERSION: Merge develop to main"

# Crear tag
echo -e "${BLUE}🏷️  Creando tag $NEW_VERSION...${NC}"
CHANGELOG=""
if [ "$LAST_TAG" != "v0.0.0" ]; then
    CHANGELOG=$(git log --oneline $LAST_TAG..HEAD --grep="^Add\|^Fix\|^Update" | head -10)
else
    CHANGELOG=$(git log --oneline --grep="^Add\|^Fix\|^Update" | head -10)
fi

git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION

Changelog:
$CHANGELOG

🤖 Generated with release script
🚀 Deploy: https://actitud-bo.vercel.app"

# Push a main con tags
echo -e "${BLUE}📤 Pushing a main con tags...${NC}"
git push origin main
git push origin main --tags

# Volver a develop
echo -e "${BLUE}↩️  Volviendo a rama develop...${NC}"
git checkout develop

# Mostrar resumen
echo ""
echo -e "${GREEN}✅ Release completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "  🏷️  Tag creado: $NEW_VERSION"
echo -e "  🌐 Production URL: https://actitud-bo.vercel.app"
echo -e "  📈 Vercel Dashboard: https://vercel.com/dashboard"
echo ""
echo -e "${YELLOW}⏳ El deploy a producción debería completarse en 2-3 minutos${NC}"
echo -e "${BLUE}🔍 Puedes ver el progreso en Vercel Dashboard${NC}"