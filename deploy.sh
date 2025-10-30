#!/bin/bash

# MoguFinder Cloud Run Deployment Script

set -e

# .envの内容を自動で読み込む（都度exportする手間を省く）
if [ -f .env ]; then
  echo "📄 .envファイルを読み込んでいます..."
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "❌ エラー: .envファイルが見つかりません"
  exit 1
fi

# 設定
PROJECT_ID="${GCP_PROJECT_ID:-mogufinder-app}"
REGION="${GCP_REGION:-asia-northeast1}"
BACKEND_SERVICE="mogufinder-backend"
FRONTEND_SERVICE="mogufinder-frontend"

echo "🚀 MoguFinder デプロイ開始"
echo "プロジェクト: $PROJECT_ID"
echo "リージョン: $REGION"
echo ""

if [ -z "$VITE_GOOGLE_MAPS_API_KEY" ]; then
  echo "❌ エラー: VITE_GOOGLE_MAPS_API_KEY が設定されていません (.env などでエクスポートしてください)"
  exit 1
fi

# Cloud SQL 認証情報は Secret Manager に保存できる
CLOUD_SQL_SECRET_NAME="${CLOUD_SQL_SECRET_NAME:-}"
if [ -n "$CLOUD_SQL_SECRET_NAME" ]; then
  echo "🔐 Secret Manager から Cloud SQL 認証情報を読み込んでいます ($CLOUD_SQL_SECRET_NAME)..."
  if CLOUD_SQL_SECRET_JSON=$(gcloud secrets versions access latest --secret "$CLOUD_SQL_SECRET_NAME"); then
    export CLOUD_SQL_SECRET_JSON
    if CLOUD_SQL_EXPORTS=$(python3 - <<'PY'
import json
import os
import shlex
import sys

raw = os.environ.get("CLOUD_SQL_SECRET_JSON", "").strip()
if not raw:
    print("Secret payload is empty", file=sys.stderr)
    sys.exit(1)

try:
    data = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"Secret payload is not valid JSON: {exc}", file=sys.stderr)
    sys.exit(1)

required = [("instance", "CLOUD_SQL_INSTANCE"),
            ("db", "CLOUD_SQL_DB"),
            ("user", "CLOUD_SQL_USER"),
            ("password", "CLOUD_SQL_PASSWORD")]

missing = [key for key, _ in required if not data.get(key)]
if missing:
    print("Secret JSON is missing keys: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)

for key, env_name in required:
    value = str(data[key])
    print(f"export {env_name}={shlex.quote(value)}")
PY
    ); then
      eval "$CLOUD_SQL_EXPORTS"
    else
      echo "⚠️ Secret Manager の値の解析に失敗しました。環境変数の値を使用します。"
    fi
    unset CLOUD_SQL_SECRET_JSON
  else
    echo "⚠️ Secret Manager から Cloud SQL 認証情報を取得できませんでした。環境変数の値を使用します。"
  fi
fi

if [ -z "$CLOUD_SQL_INSTANCE" ] || [ -z "$CLOUD_SQL_DB" ] || [ -z "$CLOUD_SQL_USER" ] || [ -z "$CLOUD_SQL_PASSWORD" ]; then
  echo "❌ エラー: Cloud SQL の認証情報が見つかりません。Secret Manager ($CLOUD_SQL_SECRET_NAME) または環境変数 CLOUD_SQL_INSTANCE / CLOUD_SQL_DB / CLOUD_SQL_USER / CLOUD_SQL_PASSWORD を確認してください"
  exit 1
fi

# URL エンコード済みパスワードで Cloud SQL 用 DATABASE_URL を組み立て
ENCODED_SQL_PASSWORD=$(python3 - <<'PY'
import os
from urllib.parse import quote

password = os.environ["CLOUD_SQL_PASSWORD"]
print(quote(password, safe=""))
PY
)

DATABASE_URL="mysql+aiomysql://${CLOUD_SQL_USER}:${ENCODED_SQL_PASSWORD}@/${CLOUD_SQL_DB}?unix_socket=/cloudsql/${CLOUD_SQL_INSTANCE}"

# プロジェクト設定
echo "📝 プロジェクト設定..."
gcloud config set project $PROJECT_ID

# バックエンドのデプロイ
echo ""
echo "🔧 バックエンドをビルド・デプロイ中..."
gcloud builds submit ./backend \
  --suppress-logs \
  --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE

gcloud run deploy $BACKEND_SERVICE \
  --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-cloudsql-instances $CLOUD_SQL_INSTANCE \
  --set-env-vars DATABASE_URL=$DATABASE_URL,GOOGLE_API_KEY=$GOOGLE_API_KEY,FRONTEND_BASE_URL=${FRONTEND_BASE_URL:-http://localhost:5173} \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10

# バックエンドのURLを取得
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ バックエンドデプロイ完了: $BACKEND_URL"

# フロントエンドのビルド設定を環境変数として渡す
echo ""
echo "🎨 フロントエンドをビルド・デプロイ中..."

# フロントエンドのビルド（本番用Dockerfileを使用）
gcloud builds submit ./frontend \
  --suppress-logs \
  --config ./frontend/cloudbuild.yaml \
  --substitutions _VITE_API_URL=$BACKEND_URL,_VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY:-}

gcloud run deploy $FRONTEND_SERVICE \
  --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 10

# フロントエンドのURLを取得
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ フロントエンドデプロイ完了: $FRONTEND_URL"

# バックエンドのCORS設定を更新
echo ""
echo "🔄 バックエンドのCORS設定を更新中..."
gcloud run services update $BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --set-env-vars DATABASE_URL=$DATABASE_URL,GOOGLE_API_KEY=$GOOGLE_API_KEY,ALLOWED_ORIGINS=$FRONTEND_URL,FRONTEND_BASE_URL=$FRONTEND_URL

echo ""
echo "✨ デプロイ完了！"
echo ""
echo "📍 アクセスURL:"
echo "   フロントエンド: $FRONTEND_URL"
echo "   バックエンド: $BACKEND_URL"
echo ""
