#!/bin/bash

# MoguFinder Cloud Run Deployment Script

set -e

# 設定
PROJECT_ID="${GCP_PROJECT_ID:-mogufinder-app}"
REGION="${GCP_REGION:-asia-northeast1}"
BACKEND_SERVICE="mogufinder-backend"
FRONTEND_SERVICE="mogufinder-frontend"

echo "🚀 MoguFinder デプロイ開始"
echo "プロジェクト: $PROJECT_ID"
echo "リージョン: $REGION"
echo ""

# プロジェクト設定
echo "📝 プロジェクト設定..."
gcloud config set project $PROJECT_ID

# バックエンドのデプロイ
echo ""
echo "🔧 バックエンドをビルド・デプロイ中..."
gcloud builds submit ./backend \
  --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE

gcloud run deploy $BACKEND_SERVICE \
  --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GOOGLE_API_KEY \
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
  --config ./frontend/cloudbuild.yaml \
  --substitutions _VITE_API_URL=$BACKEND_URL

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
  --set-env-vars GOOGLE_API_KEY=$GOOGLE_API_KEY,ALLOWED_ORIGINS=$FRONTEND_URL

echo ""
echo "✨ デプロイ完了！"
echo ""
echo "📍 アクセスURL:"
echo "   フロントエンド: $FRONTEND_URL"
echo "   バックエンド: $BACKEND_URL"
echo ""
