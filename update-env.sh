#!/bin/bash

# MoguFinder Environment Variables Update Script

set -e

# .envファイルから環境変数を読み込む
if [ -f .env ]; then
  echo "📄 .envファイルを読み込んでいます..."
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ エラー: .envファイルが見つかりません"
  exit 1
fi

# 設定
PROJECT_ID="${GCP_PROJECT_ID:-mogupoc}"
REGION="${GCP_REGION:-asia-northeast1}"
BACKEND_SERVICE="mogufinder-backend"
FRONTEND_SERVICE="mogufinder-frontend"

echo "🔧 環境変数を更新します"
echo "プロジェクト: $PROJECT_ID"
echo "リージョン: $REGION"
echo ""

# 本番用APIキーの確認
if [ -z "$GOOGLE_API_KEY_PRODUCTION" ]; then
  echo "❌ エラー: GOOGLE_API_KEY_PRODUCTION が .env ファイルに設定されていません"
  echo ".env ファイルに以下を追加してください:"
  echo "  GOOGLE_API_KEY_PRODUCTION=your-production-api-key"
  exit 1
fi

# Cloud SQL 認証情報は Secret Manager に保存できる
CLOUD_SQL_SECRET_NAME="${CLOUD_SQL_SECRET_NAME:-}"
if [ -n "$CLOUD_SQL_SECRET_NAME" ]; then
  echo "🔐 Secret Manager から Cloud SQL 認証情報を取得しています ($CLOUD_SQL_SECRET_NAME)..."
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

DATABASE_URL=$(python3 - <<'PY'
import os
from urllib.parse import quote

instance = os.environ["CLOUD_SQL_INSTANCE"]
db = os.environ["CLOUD_SQL_DB"]
user = os.environ["CLOUD_SQL_USER"]
password = quote(os.environ["CLOUD_SQL_PASSWORD"], safe="")

print(f"mysql+aiomysql://{user}:{password}@/{db}?unix_socket=/cloudsql/{instance}")
PY
)

# フロントエンドのURLを取得
echo "📍 フロントエンドのURLを取得中..."
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

if [ -z "$FRONTEND_URL" ]; then
  echo "❌ エラー: フロントエンドのURLが取得できませんでした"
  exit 1
fi

echo "フロントエンドURL: $FRONTEND_URL"
echo ""

# バックエンドの環境変数を更新
echo "🔄 バックエンドの環境変数を更新中..."
gcloud run services update $BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --set-env-vars "DATABASE_URL=$DATABASE_URL,GOOGLE_API_KEY=$GOOGLE_API_KEY_PRODUCTION,ALLOWED_ORIGINS=$FRONTEND_URL,FRONTEND_BASE_URL=$FRONTEND_URL"

echo ""
echo "✅ 環境変数の更新が完了しました"
echo ""
echo "設定内容:"
echo "  GOOGLE_API_KEY: ${GOOGLE_API_KEY_PRODUCTION:0:20}..."
echo "  ALLOWED_ORIGINS: $FRONTEND_URL"
echo ""
