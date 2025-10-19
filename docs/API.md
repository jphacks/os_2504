# MogFinder API設計書

## 0. 前提・方針（更新）

- **識別子**
    - `room_code` : 共有URL用の短い文字列（例: `https://mogfinder.app/r/{room_code}`）。内部では `room_id` (UUID) と相互変換可能。
    - `member_id` : ルーム内で一意な UUID。**Members は (room_id, member_id:uuid) の複合主キー**。
    - `place_id` : Google Maps Place ID（文字列）。
- **状態遷移（意味変更）**
    - `waiting` = **準備中（データ収集中/要約生成中）**
    - `voting` = **準備完了・投票可能**
- **非同期準備の開始タイミング（重要）**
    - `POST /rooms` **直後**にバックエンドが候補収集/要約を**非同期ジョブ**として開始。
    - 準備完了時に**サーバが自動で `voting` へ遷移**。
- **認証**
    - ログイン不要。現段階ではメンバーIDを指定すれば投票可能（Bearer トークンなし）。
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
    { "ok": true, "data": [ {"member_id": "8a1b...", "member_name": "ゆうた"}, {"member_id": "90bf...", "member_name": "さき"} ] }
    ```
    

### 2-2. メンバー新規追加

- **POST** `/rooms/{room_code}/members`
- **Req**
    
    ```json
    { "member_name": "りんたろー" }
    ```
    
- **Res 201**
    
    ```json
    { "ok": true, "data": { "member_id": "b5d7...", "member_name": "りんたろー" } }
    ```
    
- **補足**：クライアントは `member_id` をローカルに保持し、後続の投票APIでパスパラメータとして指定する。
    

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

- **POST** `/rooms/{room_code}/{member_id}/likes`
- **Req**
    
    ```json
    { "place_id": "ChIJ...", "is_liked": true }
    ```
    
- **Res 200**（作成/更新）
    
    ```json
    { "ok": true, "data": { "member_id": "b5d7...", "place_id": "ChIJ...", "is_liked": true, "updated_at": "2025-10-18T13:12:00Z" } }
    ```
    
- **主なエラー**
    - `ROOM_NOT_IN_VOTING`（409）: status が `voting` 以外
    - `PLACE_NOT_FOUND`（404）: 該当候補が存在しない（下準備中など）
    - `INVALID_REQUEST`（400）: Body validation エラー

### 3-2. 投票一覧（メンバー別）

- **GET** `/rooms/{room_code}/{member_id}/likes`
- **Query（任意）**:
    - `place_id`
    - `is_liked`（`true` / `false`）
    - `cursor`, `limit`（将来用）
- **挙動**:
    - 指定メンバーの投票履歴を返す。`voting` で利用可能。
- **Res 200**
    
    ```json
    {
      "ok": true,
      "data": {
        "items": [
          {
            "member": { "member_id": "b5d7...", "member_name": "りんたろー" },
            "place":  { "place_id": "ChIJ...", "name": "トリキン" },
            "is_liked": true,
            "updated_at": "2025-10-18T13:12:00Z"
          }
        ],
        "next_cursor": null
      }
    }
    ```

### 3-3. 投票リセット（メンバー全件）

- **DELETE** `/rooms/{room_code}/{member_id}/likes`
- **やりたいこと**: 指定 `member_id` の当該ルーム内投票を全削除して初期化。
- **前提**:
    - ルーム `status = voting` のときのみ許可。
- **Res 200**
    
    ```json
    { "ok": true, "data": { "reset": true, "deleted_count": 17 } }
    ```
    
- **主なエラー**
    - `ROOM_NOT_IN_VOTING`（409）: 投票フェーズ外
    - `MEMBER_NOT_FOUND`（404）: メンバー未登録

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
