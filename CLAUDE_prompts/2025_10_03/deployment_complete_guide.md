# MoguFinder デプロイメント完全ガイド

このガイドでは、MoguFinderをGCPにデプロイするための**全手順**を順番に説明します。

## 📋 デプロイの流れ

```
1. APIキーの準備とセキュリティ設定（重要！）
   ↓
2. ローカル環境でのセキュリティ対策実装
   ↓
3. GCPプロジェクトのセットアップ
   ↓
4. Cloud Runへのデプロイ
   ↓
5. 本番環境のAPIキー設定
   ↓
6. 動作確認とモニタリング
```

---

# ステップ1: APIキーの準備とセキュリティ設定

まず最初に、**開発用と本番用のAPIキーを分けて作成**し、適切な制限を設定します。

## 1-1. Google Cloud Console にアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 左側メニュー → **「APIとサービス」** → **「認証情報」**

## 1-2. 必要なAPIを有効化

**「APIとサービス」** → **「ライブラリ」** で以下を検索して有効化：

- ✅ Places API
- ✅ Maps JavaScript API
- ✅ Directions API
- ✅ Generative Language API（Gemini）

## 1-3. 開発用APIキーを作成

### キーの作成
1. **「認証情報を作成」** → **「APIキー」**
2. 生成されたキーをコピー

### 制限の設定

**アプリケーションの制限**: HTTPリファラー（ウェブサイト）

**ウェブサイトの制限**（推奨：簡単な設定）:
```
http://localhost*
http://127.0.0.1*
```

**API制限**:
- Places API
- Maps JavaScript API
- Directions API
- Generative Language API

**保存** をクリック（反映まで5〜10分かかる場合あり）

## 1-4. 本番用APIキーを作成（後で設定）

デプロイ後にURLが確定してから作成します（ステップ5で実施）。

---

# ステップ2: ローカル環境でのセキュリティ対策実装

デプロイ前に、セキュリティ対策をコードに実装します。

## 2-1. 依存パッケージのインストール

```bash
cd backend
pip install -r requirements.txt
```

`requirements.txt`に以下が含まれていることを確認：
```
slowapi==0.1.9
```

## 2-2. 環境変数の設定

`.env`ファイルを編集：

```bash
# 開発用APIキーを設定
GOOGLE_API_KEY=your_development_api_key_here

# CORS設定（開発環境）
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8001
```

## 2-3. 動作確認

ローカルで起動して動作確認：

```bash
# バックエンド起動
cd backend
uvicorn main:app --reload --port 8001

# フロントエンド起動（別ターミナル）
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスして、レストラン検索が動作することを確認。

---

# ステップ3: GCPプロジェクトのセットアップ

## 3-1. Google Cloud SDKのインストール

まだインストールしていない場合：
- [Google Cloud SDK インストール](https://cloud.google.com/sdk/docs/install)

## 3-2. GCPにログイン

```bash
gcloud auth login
```

## 3-3. プロジェクトの作成または選択

### 新規作成する場合
```bash
gcloud projects create mogufinder-app --name="MoguFinder"
gcloud config set project mogufinder-app
```

### 既存プロジェクトを使う場合
```bash
gcloud config set project YOUR_PROJECT_ID
```

## 3-4. 必要なAPIを有効化

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 3-5. 課金の有効化

Cloud Runを使うには課金アカウントが必要です（無料枠内で運用可能）：

1. [Google Cloud Console - 課金](https://console.cloud.google.com/billing)
2. プロジェクトに課金アカウントをリンク

---

# ステップ4: Cloud Runへのデプロイ

## 4-1. Dockerfileの作成

プロジェクトルートに `Dockerfile.cloudrun` を作成：

```dockerfile
# マルチステージビルド
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# Pythonの依存関係をインストール
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# バックエンドのコードをコピー
COPY backend/ ./

# フロントエンドのビルド成果物をコピー
COPY --from=frontend-builder /app/frontend/dist ./static

# 環境変数
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## 4-2. backend/main.py に静的ファイル配信を追加

`backend/main.py` の最後（既存のエンドポイントの後）に追加：

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# 静的ファイルの配信
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """SPAのルーティング対応"""
    file_path = os.path.join("static", full_path)

    # ファイルが存在すればそれを返す
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    # それ以外はindex.htmlを返す（SPAルーティング）
    return FileResponse("static/index.html")
```

## 4-3. ビルドとデプロイ

```bash
# プロジェクトルートで実行
cd /path/to/moguPOC

# イメージをビルド
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/mogufinder:latest -f Dockerfile.cloudrun

# Cloud Runにデプロイ（開発用APIキーで仮デプロイ）
gcloud run deploy mogufinder \
  --image gcr.io/YOUR_PROJECT_ID/mogufinder:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=YOUR_DEV_API_KEY,ALLOWED_ORIGINS=*"

# デプロイ完了後、URLが表示されます
# 例: https://mogufinder-xxxxx-an.a.run.app
```

**重要**: この時点では仮のURLなので、`ALLOWED_ORIGINS=*` としています。

## 4-4. デプロイされたURLを確認

```bash
gcloud run services describe mogufinder --region asia-northeast1 --format "value(status.url)"
```

出力例：
```
https://mogufinder-abcd1234-an.a.run.app
```

このURLをメモしておきます。

---

# ステップ5: 本番環境のAPIキー設定

デプロイURLが確定したので、本番用APIキーを作成して制限を設定します。

## 5-1. 本番用APIキーを作成

### キーの作成
1. [Google Cloud Console - 認証情報](https://console.cloud.google.com/apis/credentials)
2. **「認証情報を作成」** → **「APIキー」**
3. 生成されたキーをコピー

### 制限の設定

**アプリケーションの制限**: HTTPリファラー（ウェブサイト）

**ウェブサイトの制限**:
```
https://mogufinder-xxxxx-an.a.run.app/*
```
※ あなたの実際のCloud Run URLに置き換えてください
※ カスタムドメインを使う場合は、それも追加

**API制限**:
- Places API
- Maps JavaScript API
- Directions API
- Generative Language API

**保存** をクリック

## 5-2. Cloud Runの環境変数を更新

本番用APIキーと正しいCORS設定で再デプロイ：

```bash
gcloud run services update mogufinder \
  --region asia-northeast1 \
  --set-env-vars "GOOGLE_API_KEY=YOUR_PRODUCTION_API_KEY,ALLOWED_ORIGINS=https://mogufinder-xxxxx-an.a.run.app"
```

※ `YOUR_PRODUCTION_API_KEY` と URL を実際のものに置き換えてください

---

# ステップ6: 動作確認とモニタリング

## 6-1. 動作確認

### フロントエンドの確認
ブラウザで Cloud Run のURLにアクセス：
```
https://mogufinder-xxxxx-an.a.run.app
```

以下を確認：
- ✅ ページが表示される
- ✅ 位置情報の取得ができる
- ✅ レストラン検索が動作する
- ✅ 地図が表示される
- ✅ スワイプ機能が動作する
- ✅ ブックマーク機能が動作する

### バックエンドAPIの確認

```bash
curl https://mogufinder-xxxxx-an.a.run.app/
```

レスポンス：
```json
{"message": "Food Finder API"}
```

### レート制限の確認

同じエンドポイントに短時間で大量アクセスすると `429 Too Many Requests` が返ることを確認。

## 6-2. ログの確認

```bash
# Cloud Runのログを表示
gcloud run services logs read mogufinder --region asia-northeast1 --limit 50
```

または Cloud Console で：
1. **Cloud Run** → **mogufinder**
2. **「ログ」** タブ

## 6-3. モニタリング設定

Cloud Console で使用状況を監視：

1. **「APIとサービス」** → **「ダッシュボード」**
2. 各APIの使用量グラフを確認
3. 異常なスパイクがないかチェック

### アラート設定（オプション）

1. **「モニタリング」** → **「アラート」**
2. **「アラートポリシーを作成」**
3. 条件を設定（例：Places API が 1日1000リクエスト超えたら通知）

---

# トラブルシューティング

## エラー: "This API project is not authorized to use this API"

**原因**: APIが有効化されていない、またはAPIキーの制限が厳しすぎる

**解決方法**:
1. Google Cloud Console → **「APIとサービス」** → **「ライブラリ」**
2. Places API、Maps JavaScript API、Gemini APIを検索
3. **「有効にする」** をクリック
4. APIキーの制限設定を確認

## エラー: "429 Too Many Requests"

**原因**: レート制限に達した

**解決方法**:
- 正常な動作（不正アクセス防止機能）
- 必要に応じて `backend/main.py` のレート制限値を調整
- 本番運用時は適切な値に設定

## CORSエラー

**原因**: `ALLOWED_ORIGINS` の設定が間違っている

**解決方法**:
```bash
# 環境変数を確認
gcloud run services describe mogufinder --region asia-northeast1 --format "value(spec.template.spec.containers[0].env)"

# 正しいURLに更新
gcloud run services update mogufinder \
  --region asia-northeast1 \
  --set-env-vars "ALLOWED_ORIGINS=https://YOUR_ACTUAL_URL"
```

## 地図が表示されない

**原因**: Maps JavaScript APIが有効化されていない、またはAPIキー制限

**解決方法**:
1. Maps JavaScript API を有効化
2. APIキーのリファラー制限にCloud Run URLが含まれているか確認

## Gemini APIが動作しない

**原因**: Gemini APIはHTTPリファラー制限に対応していない

**解決方法**:
- バックエンドでのみ使用している場合は問題なし（現在の実装）
- APIキーの制限を「なし」または「IPアドレス」に設定

---

# コスト見積もり

## Cloud Run（推奨）

**無料枠**:
- 月180万リクエスト
- 36万GB秒のメモリ
- 18万vCPU秒

**想定コスト（小規模利用）**:
- 無料枠内: **$0/月**
- 超過した場合: **$0-5/月**

## Google Places API

**無料枠**: なし

**料金**:
- Nearby Search: $32/1000リクエスト
- Place Details: $17/1000リクエスト

**想定コスト**:
- 1日100人が10件ずつ検索: 約$15-20/月

## Gemini API

**料金**:
- gemini-2.5-flash-lite: 非常に安価（詳細は[AI Studio pricing](https://ai.google.dev/pricing)参照）

**想定コスト**:
- 1日1000回要約生成: 約$1-3/月

**合計想定コスト**: 月$20-30（小規模利用）

---

# セキュリティチェックリスト

デプロイ前に以下を確認：

- [ ] 開発用と本番用のAPIキーを分けている
- [ ] 本番用APIキーにHTTPリファラー制限を設定済み
- [ ] リファラーにCloud Run URLを追加済み
- [ ] 必要最小限のAPIのみに制限済み
- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] `ALLOWED_ORIGINS` に本番URLを設定済み
- [ ] レート制限が実装されている
- [ ] 入力バリデーションが実装されている
- [ ] Cloud Console で使用状況を監視できる

---

# 次のステップ

## カスタムドメインの設定

Cloud RunのデフォルトURLではなく、独自ドメインを使う場合：

```bash
# ドメインマッピングを作成
gcloud run domain-mappings create \
  --service mogufinder \
  --domain your-domain.com \
  --region asia-northeast1
```

詳細: [Cloud Run カスタムドメイン](https://cloud.google.com/run/docs/mapping-custom-domains)

## CI/CDの設定

GitHub Actionsで自動デプロイ：

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/mogufinder
          gcloud run deploy mogufinder \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/mogufinder \
            --region asia-northeast1 \
            --platform managed
```

## スケーリング設定

トラフィックが増えた場合：

```bash
gcloud run services update mogufinder \
  --region asia-northeast1 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80
```

---

# まとめ

このガイドに従えば、**セキュアで本番運用可能なMoguFinder**をGCPにデプロイできます。

**最短フロー**:
1. APIキー作成・制限設定（10分）
2. 環境変数設定（5分）
3. Cloud Runデプロイ（10分）
4. 本番APIキー設定（5分）
5. 動作確認（5分）

**合計約35分**で本番環境が構築できます！🎉

何か問題が発生した場合は、トラブルシューティングセクションを参照してください。
