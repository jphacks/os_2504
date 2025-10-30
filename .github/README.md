# CI/CD

`main` ブランチに変更がマージされると、GitHub Actions の `Deploy to Cloud Run` ワークフローが自動で実行され、バックエンド・フロントエンドを Cloud Run へデプロイします。必要に応じて Actions 画面から `Run workflow` で手動実行も可能です。

## 必要な GitHub Secrets
以下のシークレットをリポジトリ、または組織レベルで登録してください。

- `GCP_SA_KEY`: Cloud Run / Cloud Build / Secret Manager にアクセスできるサービスアカウントの JSON キー
- `GCP_PROJECT_ID`: デプロイ先 GCP プロジェクト ID
- `GCP_REGION`: Cloud Run のリージョン (例: `asia-northeast1`)
- `GOOGLE_API_KEY`: バックエンド用の Google API キー
- `GOOGLE_API_KEY_PRODUCTION`: 本番用 Google API キー
- `VITE_GOOGLE_MAPS_API_KEY`: フロントエンド (Vite) 用 Google Maps API キー (`VITE_` プレフィックス付き)
- `FRONTEND_BASE_URL`: 本番フロントエンドの公開 URL
- `ALLOWED_ORIGINS_PRODUCTION`: バックエンド CORS 設定で許可するオリジン (カンマ区切り)
- `CLOUD_SQL_SECRET_NAME`: GCP Secret Manager に保存した Cloud SQL 認証情報のシークレット名

## Secret Manager の準備
`CLOUD_SQL_SECRET_NAME` で指定したシークレットには、以下の JSON を格納してください。

```json
{
  "instance": "<PROJECT>:<REGION>:<INSTANCE>",
  "db": "foodfinder",
  "user": "foodfinder",
  "password": "<PASSWORD>"
}
```

サービスアカウントには Secret Manager Secret Access 権限を付与しておいてください。
