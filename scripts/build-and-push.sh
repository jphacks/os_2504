#!/usr/bin/env bash
set -euo pipefail

# Build and push the API container image to Artifact Registry.
# Environment variables can be used to customise the target:
#   PROJECT_ID (default: mogufinder)
#   REGION (default: asia-northeast2)
#   ARTIFACT_REPOSITORY (default: mogu-finder-image)
#   IMAGE_NAME (default: mogufinder-apiatest)
#   IMAGE_TAG (default: current git commit SHA or timestamp fallback)
#   PUSH_LATEST (default: true) — also push the :latest tag when true
#   BUILD_CONTEXT (default: current directory)

PROJECT_ID="${PROJECT_ID:-mogufinder}"
REGION="${REGION:-asia-northeast2}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-mogu-finder-image}"
IMAGE_NAME="${IMAGE_NAME:-mogufinder-apiatest}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
PUSH_LATEST="${PUSH_LATEST:-true}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"

IMAGE_URI_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/${IMAGE_NAME}"

TAG_ARGS=(-t "${IMAGE_URI_BASE}:${IMAGE_TAG}")
if [[ "${PUSH_LATEST}" == "true" ]]; then
  TAG_ARGS+=(-t "${IMAGE_URI_BASE}:latest")
fi

echo "Building ${IMAGE_URI_BASE}:${IMAGE_TAG} (platform linux/amd64)…"
docker buildx build --platform=linux/amd64 "${TAG_ARGS[@]}" --push "${BUILD_CONTEXT}"

echo
echo "Pushed image(s):"
printf '  %s\n' "${IMAGE_URI_BASE}:${IMAGE_TAG}"
if [[ "${PUSH_LATEST}" == "true" ]]; then
  printf '  %s\n' "${IMAGE_URI_BASE}:latest"
fi
