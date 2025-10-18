# MogFinder API設計書

## 0. 前提・方針（更新）

- **識別子**
    - `room_code` : 共有URL用の短い文字列（例: `https://mogfinder.app/r/{room_code}`）。内部では `room_id` (UUID) と相互変換可能。
    - `member_id` : UUID。**Member は (room_id, member_id) の複合主キー**。
    - `place_id` : Google Maps Place ID（文字列）。
- **状態遷移（意味変更）**
    - `waiting` = **準備中（データ収集中/要約生成中）**
    - `voting` = **準備完了・投票可能**
- **非同期準備の開始タイミング（重要）**
    - `POST /rooms` **直後**にバックエンドが候補収集/要約を**非同期ジョブ**として開始。
    - 準備完了時に**サーバが自動で `voting` へ遷移**。
- **認証（1st Release）**
    - ログイン不要。メンバー確定時に `member_token`（短命JWT）を払い出し、投票系APIは `Authorization: Bearer <member_token>` 必須。
- **共通レスポンス**
    
    ```json
    { "ok": true, "data": <payload> }
    ```
    
- **共通エラー**
    
    ```json
    { "ok": false, "error": { "code": "<STRING>", "message": "<HUMAN_READABLE>", "details": {} } }
    ```
    

---

## 1. グループ作成・設定・共有

### 1-1. ルーム作成（準備ジョブ自動開始）

- **POST** `/rooms`
- **Req**
    
    ```json
    {
      "room_name": "飲み会@Kanda",
      "settings": {
        "latitude": 35.690921,
        "longitude": 139.700258,
        "radius": 3.0,
        "min_price_level": 0,
        "max_price_level": 4
      }
    }
    
    ```
    
- **Res 201**
    
    ```json
    {
      "ok": true,
      "data": {
        "room_id": "b3c7f2f8-...",
        "room_code": "k9Fa2Q",
        "share_url": "https://mogfinder.app/r/k9Fa2Q",
        "status": "waiting",
        "settings": { "latitude": 35.690921, "longitude": 139.700258, "radius": 3.0, "min_price_level": 0, "max_price_level": 4 },
        "preparation": { "started": true, "progress": 0 }
      }
    }
    ```
    

### 1-2. ルーム設定更新（再準備をトリガ）

- **PATCH** `/rooms/{room_code}/settings`
- **挙動**：候補集合に影響する変更があれば **`status=waiting` に戻し再準備** をキューイング。
- **Req（例）**
    
    ```json
    { "radius": 2.0, "min_price_level": 1 }
    ```
    
- **Res 200**：更新後設定＋`status`/`preparation` を返却。

### 1-3. 共有情報取得（待機UI用）

- **GET** `/rooms/{room_code}`
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "room_name": "飲み会@Kanda",
        "status": "waiting",
        "share_url": "https://mogfinder.app/r/k9Fa2Q",
        "qr": { "text": "https://mogfinder.app/r/k9Fa2Q" },
        "preparation": { "progress": 65, "prepared_count": 84, "expected_count": 120 }
      }
    }
    ```
    

---

## 2. グループ参加（ユーザ選択/新規追加）

### 2-1. メンバー一覧取得

- **GET** `/rooms/{room_code}/members`
- **Res 200**
    
    ```json
    { "ok": true, "data": [ {"member_id":"8a1...","member_name":"ゆうた"}, {"member_id":"90b...","member_name":"さき"} ] }
    ```
    

### 2-2. メンバー新規追加

- **POST** `/rooms/{room_code}/members`
- **Req**
    
    ```json
    { "member_name": "りんたろー" }
    ```
    
- **Res 201**
    
    ```json
    { "ok": true, "data": { "member_id": "b5d...", "member_name": "りんたろー" } }
    ```
    

### 2-3. メンバー確定→セッショントークン発行

- **POST** `/rooms/{room_code}/members/{member_id}/session`
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "member_token": "eyJhbGciOiJI...", "expires_in": 10800,
        "member": { "member_id": "b5d...", "member_name": "りんたろー" }
      }
    }
    ```
    

---

## 3. 投票（マチアプ式）

> 重要：status が voting になるまで /restaurants は取得不可。
> 

### 3-0. 候補カード取得（準備ガード付き）

- **GET** `/rooms/{room_code}/restaurants?cursor=<opt>&limit=<opt>`
- **成功（`voting` 時のみ） Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "items": [
          {
            "place_id": "ChIJ...",
            "name": "トリキン",
            "address": "千代田区...",
            "rating": 4.2,
            "user_ratings_total": 230,
            "photo_urls": ["https://.../p1.jpg"],
            "types": ["izakaya","japanese"],
            "latitude": 35.69,
            "longitude": 139.70,
            "summary_simple": "焼き鳥が人気・0.3km"
          }
        ],
        "next_cursor": "eyJwYWdlIjoyfQ=="
      }
    }
    ```
    
- **準備中（`waiting`） Res 425**
    
    ```json
    {
      "ok": false,
      "error": { "code": "ROOM_NOT_READY", "message": "Restaurant data is not ready yet." }
    }
    ```
    

### 3-1. スワイプ（いいね/良くないね）

- **POST** `/rooms/{room_code}/likes`
- **Headers**: `Authorization: Bearer <member_token>`
- **Req**
    
    ```json
    { "place_id": "ChIJ...", "is_liked": true }
    ```
    
- **Res 200**（作成/更新）
    
    ```json
    { "ok": true, "data": { "member_id": "b5d...", "place_id": "ChIJ...", "is_liked": true, "updated_at": "2025-10-18T13:12:00Z" } }
    ```
    

### 3-2. 投票一覧（ルーム内・メンバー別フィルタ対応）

- **GET** `/rooms/{room_code}/likes`
- **Headers**: `Authorization: Bearer <member_token>`
- **Query（任意）**:
    - `member_id`（複数可。例: `member_id=8a1...&member_id=90b...`）
    - `place_id`
    - `is_liked`（`true` / `false`）
    - `cursor`, `limit`（ページング）
- **挙動**:
    - ルーム内の投票を**「誰が（member）」「どこに（place）」「どう（is_liked）」**の粒度で返す。
    - `voting` で利用可能（`waiting` では通常は空配列）。
    - 呼び出しメンバーが**当該ルームの参加者であること**を検証（部外者は 403）。
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "items": [
          {
            "member": { "member_id": "8a1...", "member_name": "ゆうた" },
            "place":  { "place_id": "ChIJ...", "name": "トリキン" },
            "is_liked": true,
            "updated_at": "2025-10-18T13:12:00Z"
          },
          {
            "member": { "member_id": "90b...", "member_name": "さき" },
            "place":  { "place_id": "ChIK...", "name": "魚金 本店" },
            "is_liked": false,
            "updated_at": "2025-10-18T13:15:22Z"
          }
        ],
        "next_cursor": "eyJwYWdlIjoyfQ=="
      }
    }
    
    ```
    
    > place.name は JOIN 可能なら同梱（なければ place_id のみでもOK）
    > 

---

### 3-3. 投票リセット（メンバー全件）

- **DELETE** `/rooms/{room_code}/likes/{member_id}`
- **Headers**: `Authorization: Bearer <member_token>`
- **やりたいこと**: 指定 `member_id` の**当該ルーム内の投票を全削除**して初期化（「最初からやり直し」）。
- **前提/認可**:
    - ルーム `status = voting` のときのみ許可。
    - **本人以外でも削除可**
- **Res 200**
    
    ```json
    { "ok": true, "data": { "reset": true, "deleted_count": 17 } }
    
    ```
    
- **主なエラー**
    - `ROOM_NOT_IN_VOTING`（409）: 投票フェーズ外
    - `NOT_FOUND`（404）: メンバー未登録 など

> リセット後は未投票扱いとなり、次回カード配布で再提示されます。
> 

---

## 4. 投票集計

### 4-1. 集計結果（ランキング）

- **GET** `/rooms/{room_code}/ranking`
- **集計仕様（初期案）**
    
    `score = (#likes) - α * (#dislikes)`（α は既定 1.0、同点は `rating` 降順→ `distance` 昇順でブレーク）
    
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": [
        {
          "rank": 1,
          "place_id": "ChIJ...",
          "name": "トリキン",
          "score": 12,
          "like_count": 9,
          "dislike_count": 3,
          "rating": 4.2,
          "user_ratings_total": 230,
          "google_maps_url": "https://maps.google.com/?cid=..."
        }
      ]
    }
    ```
    

---

## 5. 店舗詳細

### 5-1. 店舗詳細取得

- **GET** `/restaurants/{place_id}`
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "place_id": "ChIJ...",
        "name": "トリキン",
        "address": "千代田区...",
        "summary_simple": "焼き鳥が人気・0.3km",
        "phone_number": "03-....",
        "website": "https://...",
        "google_maps_url": "https://maps.google.com/?cid=...",
        "opening_hours": { "weekday_text": ["Mon: 17:00-23:00", "..."] },
        "summary_detail": "安価で飲める焼き鳥居酒屋...",
        "photo_urls": ["https://.../p1.jpg","https://.../p2.jpg"],
        "types": ["izakaya", "japanese"]
      }
    }
    ```
    

### 5-2. レビュー（5件）

- **GET** `/restaurants/{place_id}/reviews`
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": [
        {
          "id": "c8f4...",
          "author_name": "Taro",
          "rating": 5,
          "text": "串が美味",
          "time": "2025-10-01T12:00:00Z"
        }
      ]
    }
    ```

> 開発環境では `task db:seed` を実行すると、疑似的な飲食店データとレビューが投入され、上記エンドポイントのレスポンスをすぐに確認できます。
    

---

## 6. 管理用（投票詳細の確認/編集）

### 6-1. ルーム内の投票サマリ

- **GET** `/rooms/{room_code}/votes?member_id=<opt>`
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "room": { "room_name": "飲み会@Kanda", "status": "finished" },
        "votes": [ { "member_name": "さき", "place_id": "ChIJ...", "is_liked": true } ]
      }
    }
    ```
    

### 6-2. 個別投票レコード削除

- **DELETE** `/rooms/{room_code}/votes/{member_id}/{place_id}`
- **Res 200** `{ "ok": true, "data": { "deleted": true } }`

---

## 7. 非同期処理/外部連携（サーバ内実装指針）

- **準備ジョブ**：`POST /rooms`（および設定変更）でジョブ起動 → Places API取得 → `Restaurant`/`Room_Restaurant` upsert → 要約生成（Gemini等） → **完了時 `status=voting` に自動遷移。**
