#!/usr/bin/env bash
set -euo pipefail

# Deploy the container image to Cloud Run.
# Configurable via environment variables (defaults match current production):
#   PROJECT_ID (default: mogufinder)
#   REGION (default: asia-northeast2)
#   CLOUD_RUN_SERVICE (default: mogufinder-api)
#   ARTIFACT_REPOSITORY (default: mogu-finder-image)
#   IMAGE_NAME (default: mogufinder-apiatest)
#   IMAGE_TAG (default: latest)
#   CLOUD_RUN_SERVICE_ACCOUNT (default: cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com)
#   CLOUD_SQL_CONNECTION (default: mogufinder:asia-northeast2:mogufinder-db)
#   DB_USER / DB_NAME / DB_HOST / DB_SSL / DB_SSL_STRICT / DB_MAX_CONNECTIONS
#   DATABASE_URL (optional override if using a direct connection string)
#   DB_PASSWORD_SECRET (optional; format SECRET_NAME:latest for --set-secrets)
#   VPC_CONNECTOR / VPC_EGRESS (optional networking overrides)

PROJECT_ID="${PROJECT_ID:-mogufinder}"
REGION="${REGION:-asia-northeast2}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-mogufinder-api}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-mogu-finder-image}"
IMAGE_NAME="${IMAGE_NAME:-mogufinder-apiatest}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CLOUD_RUN_SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com}"
CLOUD_SQL_CONNECTION="${CLOUD_SQL_CONNECTION:-mogufinder:asia-northeast2:mogufinder-db}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"

DB_USER="${DB_USER:-appuser}"
DB_NAME="${DB_NAME:-appdb}"
DB_HOST_DEFAULT="/cloudsql/${CLOUD_SQL_CONNECTION}"
DB_HOST="${DB_HOST:-${DB_HOST_DEFAULT}}"
DB_SSL="${DB_SSL:-false}"
DB_SSL_STRICT="${DB_SSL_STRICT:-false}"
DB_MAX_CONNECTIONS="${DB_MAX_CONNECTIONS:-5}"
DATABASE_URL="${DATABASE_URL:-}"

ENV_VARS=("DB_USER=${DB_USER}" "DB_NAME=${DB_NAME}" "DB_HOST=${DB_HOST}" "DB_SSL=${DB_SSL}" "DB_SSL_STRICT=${DB_SSL_STRICT}" "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS}")
if [[ -n "${DATABASE_URL}" ]]; then
  ENV_VARS+=("DATABASE_URL=${DATABASE_URL}")
fi

ENV_FLAG=$(IFS=,; echo "${ENV_VARS[*]}")

DEPLOY_CMD=(
  gcloud run deploy "${CLOUD_RUN_SERVICE}"
  "--project=${PROJECT_ID}"
  "--region=${REGION}"
  "--platform=managed"
  "--image=${IMAGE_URI}"
  "--allow-unauthenticated"
  "--service-account=${CLOUD_RUN_SERVICE_ACCOUNT}"
  "--add-cloudsql-instances=${CLOUD_SQL_CONNECTION}"
  "--cpu=1"
  "--memory=512Mi"
  "--timeout=300"
  "--max-instances=20"
  "--set-env-vars=${ENV_FLAG}"
)

if [[ -n "${DB_PASSWORD_SECRET:-}" ]]; then
  DEPLOY_CMD+=("--set-secrets=DB_PASSWORD=${DB_PASSWORD_SECRET}")
fi

if [[ -n "${VPC_CONNECTOR:-}" ]]; then
  DEPLOY_CMD+=("--vpc-connector=${VPC_CONNECTOR}")
fi

if [[ -n "${VPC_EGRESS:-}" ]]; then
  DEPLOY_CMD+=("--vpc-egress=${VPC_EGRESS}")
fi

echo "Deploying ${IMAGE_URI} to Cloud Run service ${CLOUD_RUN_SERVICE}…"
"${DEPLOY_CMD[@]}"
