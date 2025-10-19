# MoguFinder

行きたい飲食店を探すためのPWAアプリケーション。Tinderのようなスワイプ操作で、好みのレストランを見つけることができます。

## 機能

- 📍 現在地から近くのレストランを検索
- 💳 距離、価格帯、ジャンルで絞り込み
- 👆 スワイプ操作（右：いいね、左：スキップ）
- 🔖 気に入ったレストランをブックマーク
- 📱 PWA対応でスマホにインストール可能

## セットアップ

### 1. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成：

```
GOOGLE_API_KEY=your_google_api_key_here
```

### 2. バックエンドの起動

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. フロントエンドの起動

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### 4. アプリケーションにアクセス

ブラウザで `http://localhost:5173` を開く

## 使い方

1. 初回起動時に検索条件（距離、価格帯、ジャンル）を設定
2. 位置情報の使用を許可
3. 表示されるレストランカードを：
   - 右にスワイプ：ブックマークに保存
   - 左にスワイプ：スキップ
4. ブックマークタブで保存したレストランを確認

## 技術スタック

- **Backend**: FastAPI, Python
- **Frontend**: React, Vite, Material-UI
- **API**: Google Places API
- **PWA**: Service Worker, Web App Manifest
