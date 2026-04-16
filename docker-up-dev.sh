#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

USE_POSTGRES=1
USE_MINIO=1
RUN_DB_SETUP=0
BUILD_IMAGES=0

usage() {
  cat <<'EOF'
Usage: ./docker-up-dev.sh [options]

Options:
  --no-postgres   Do not start the bundled Postgres service.
  --no-minio      Do not start the bundled MinIO service.
  --run-db-setup  Run uv run python -m backend.db_management.setup after startup.
  --build         Build images before starting containers.
  --help          Show this help message.

Behavior:
  - Starts the dev stack with bind mounts and hot reload.
  - Backend runs uvicorn with --reload.
  - Frontend runs next dev on 0.0.0.0:3000.
  - If NOVA_BACKEND/.env exists, the script exports it before starting Docker Compose.
  - When bundled Postgres is enabled, DB_HOST is forced to postgres.
  - When bundled MinIO is enabled, AWS_ENDPOINT_URL is forced to http://minio:9000.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-postgres)
      USE_POSTGRES=0
      ;;
    --no-minio)
      USE_MINIO=0
      ;;
    --run-db-setup)
      RUN_DB_SETUP=1
      ;;
    --build)
      BUILD_IMAGES=1
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ -f "$ROOT_DIR/NOVA_BACKEND/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/NOVA_BACKEND/.env"
  set +a
fi

export ENV="${ENV:-DEV}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASS="${DB_PASS:-postgres}"
export DB_NAME="${DB_NAME:-nova_dev}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-minioadmin}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-minioadmin}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export RECEIPT_BUCKET="${RECEIPT_BUCKET:-nova-receipts}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-replace-me}"
export JWT_SECRET="${JWT_SECRET:-change-me}"
export JWT_ACCESS_TTL_SECONDS="${JWT_ACCESS_TTL_SECONDS:-43200}"
export JWT_REFRESH_TTL_SECONDS="${JWT_REFRESH_TTL_SECONDS:-2592000}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}"

if [[ "$USE_POSTGRES" -eq 1 ]]; then
  export DB_HOST="postgres"
fi

if [[ "$USE_MINIO" -eq 1 ]]; then
  export AWS_ENDPOINT_URL="http://minio:9000"
fi

COMPOSE_ARGS=(-f docker-compose.dev.yml)
if [[ "$BUILD_IMAGES" -eq 1 ]]; then
  COMPOSE_ARGS+=(up -d --build)
else
  COMPOSE_ARGS+=(up -d)
fi

INFRA_SERVICES=()
APP_SERVICES=(backend frontend)

if [[ "$USE_POSTGRES" -eq 1 ]]; then
  INFRA_SERVICES+=(postgres)
fi

if [[ "$USE_MINIO" -eq 1 ]]; then
  INFRA_SERVICES+=(minio minio-init)
fi

if [[ "${#INFRA_SERVICES[@]}" -gt 0 ]]; then
  docker compose "${COMPOSE_ARGS[@]}" "${INFRA_SERVICES[@]}"
fi

docker compose "${COMPOSE_ARGS[@]}" "${APP_SERVICES[@]}"

if [[ "$RUN_DB_SETUP" -eq 1 ]]; then
  docker compose -f docker-compose.dev.yml exec -T backend uv run python -m backend.db_management.setup
fi

echo "NOVA dev containers are up."
