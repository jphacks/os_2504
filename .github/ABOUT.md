<!-- GitHub metadata file renamed from README to avoid overriding the root README -->

# MogFinder GitHub Overview

プロジェクトのユーザー向け概要はプロジェクトルートの `README.md` をご参照ください。

## CI / CD ワークフロー
- `.github/workflows/ci.yml`: フロントエンド・バックエンドのビルドとドキュメント生成を行う定期チェック
- `.github/workflows/deploy.yml`: デプロイ用ワークフロー（必要に応じて設定）

## ドキュメント生成
- ER 図・API 定義書の生成スクリプトはルートの `scripts/` に配置しています。
- 生成された成果物は `documents/` 以下に格納され、CI で整合性チェックを行います。
