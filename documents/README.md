# 開発ドキュメント

## データベース ER 図
- Mermaid 図ファイル: [`schema.mmd`](./schema.mmd)
- DBML ファイル: [`schema.dbml`](./schema.dbml)
- 表示方法: dbdiagram.io などの DBML 対応ツールに上記ファイルを読み込むと ER 図として閲覧できます。
- 更新手順（プロジェクトルートで実行）:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r backend/requirements.txt
  python scripts/generate_dbdiagram.py
  ```
  CI でも自動生成され、差分が残っている場合はジョブが失敗します。
- GitHub 上でも以下の Mermaid 図から直接確認できます。
<!-- BEGIN ER MERMAID -->
```mermaid
%%{init: {'theme': 'neutral'}}%%
erDiagram
    group_members {
        int id PK
        string group_id "len=32, not null"
        string member_id "len=64, not null"
        datetime joined_at "not null"
    }
    group_restaurants {
        int id PK
        string group_id "len=32, not null"
        string place_id "len=128, not null"
        int position "not null"
        string name "len=255, not null"
        string address "len=255"
        float rating
        int price_level
        text photo_url
        json photo_urls
        float lat "not null"
        float lng "not null"
        json types
        json reviews
        string phone_number "len=64"
        string website "len=255"
        string google_maps_url "len=255"
        int user_ratings_total
        json opening_hours
        text summary
    }
    group_votes {
        int id PK
        string group_id "len=32, not null"
        string member_id "len=64, not null"
        string place_id "len=128, not null"
        string value "len=10, not null"
        datetime created_at "not null"
    }
    groups {
        string id PK "len=32"
        string group_name "len=50"
        string organizer_id "len=64, not null"
        float latitude "not null"
        float longitude "not null"
        int radius "not null"
        int min_price
        int max_price
        json types
        string status "len=20, not null"
        datetime created_at "not null"
    }

    groups ||--o{ group_members : "group_id"
    groups ||--o{ group_restaurants : "group_id"
    groups ||--o{ group_votes : "group_id"
```
<!-- END ER MERMAID -->

## API ドキュメント
- Swagger UI HTML: [`api/swagger.html`](./api/swagger.html)
- OpenAPI JSON: [`api/openapi.json`](./api/openapi.json)
- GitHub 上でのクイックプレビュー（`main` ブランチ）:  
  https://htmlpreview.github.io/?https://raw.githubusercontent.com/jphacks/os_2504/main/documents/api/swagger.html
- 更新手順（プロジェクトルートで実行）:
  ```bash
  python backend/scripts/export_swagger.py
  ```
  ※ 互換ラッパーとして `python scripts/generate_api_docs.py` でも同じ成果物が生成できます。  
  こちらも CI が生成＆差分検知を行います。

## 補足
- スクリプトはルート直下の `scripts/` に配置されています。
- `schema.dbml` や `api/` 以下の成果物はリポジトリにコミットし、常に最新状態を保つようにしてください。
