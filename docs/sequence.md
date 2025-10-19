# MogFinder シーケンス図（画面別フロー)

> 前提：各図は ユーザ（U） と システム（W=Web/App, S=Backend, Q=Queue/Worker, D=DB, G=Google Places, L=LLM） のやりとりを示します。
> 
> 
> API名はメッセージ内に明記。
> 

---

## 0. 準備ジョブ（非同期：`POST /rooms` または `PATCH /settings` 後）

```mermaid
sequenceDiagram
    autonumber
    participant S as Backend API (S)
    participant Q as Queue/Worker (Q)
    participant D as DB (D)
    participant G as Google Places (G)
    participant L as LLM要約 (L)

    S->>D: Room/Setting を作成・更新 (status=waiting)
    S->>Q: 準備ジョブenqueue（room_id）
    Note right of Q: 以降は非同期処理
    Q->>G: 近傍候補を取得（radius, price_level...）
    Q->>D: Restaurant / Room_Restaurant を upsert
    loop 要約生成/整形
        Q->>L: summary_simple/detail 生成
        Q->>D: 要約を保存
    end
    Q->>D: 集計メタ更新（prepared_count, expected_count）
    Q->>D: Room.status=voting へ遷移

```

---

## 1. グループ作成画面（ルーム新規作成）

```mermaid
sequenceDiagram
    autonumber
    actor U as ユーザ (U)
    participant W as Web/App (W)
    participant S as Backend API (S)
    participant D as DB (D)
    participant Q as Queue/Worker (Q)

    U->>W: フォーム入力（room_name, settings）
    W->>S: POST /rooms
    S->>D: Room, Setting 作成（status=waiting, room_code生成）
    S-->>W: 201 {room_id, room_code, share_url, status=waiting, preparation.started=true}
    W-->>U: 共有URL/QRを表示（待機UI: progress表示）
    S->>Q: 準備ジョブ enqueue（非同期）

```

---

## 2. グループシェア画面（待機〜投票開始）

```mermaid
sequenceDiagram
    autonumber
    actor U as 幹事 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 共有画面を開く
    W->>S: GET /rooms/{room_code}
    S-->>W: 200 {status, share_url, qr, preparation.progress}
    W-->>U: QRコード/URLを表示・進行度表示
    rect rgb(245,245,245)
    Note over W,S: バックエンドの準備完了後
    W->>S: GET /rooms/{room_code}
    S-->>W: 200 {status=voting}
    end
    W-->>U: 「投票へ進む」ボタン活性

```

---

## 3. メンバー選択/新規追加画面（ログイン不要・セッション発行）

```mermaid
sequenceDiagram
    autonumber
    actor U as 参加者 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 画面を開く
    W->>S: GET /rooms/{room_code}/members
    S-->>W: 200 [ {member_id, member_name}, ... ]
    alt 既存メンバー選択
        U->>W: メンバー選択
    else 新規追加
        U->>W: 名前入力
        W->>S: POST /rooms/{room_code}/members
        S-->>W: 201 {member_id, member_name}
    end
    W-->>U: 投票画面へ遷移（member_id をローカル保持）

```

---

## 4. 投票（マチアプ式）画面

```mermaid
sequenceDiagram
    autonumber
    actor U as 参加者 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 投票画面を開く
    W->>S: GET /rooms/{room_code}/restaurants?cursor&limit
    alt ルームが voting
        S-->>W: 200 {items:[カード...], next_cursor}
        W-->>U: カード表示（いいね/良くないね/詳細）
    else waiting
        S-->>W: 425 ROOM_NOT_READY
        W-->>U: 準備中UI（リトライ）
    end

    loop スワイプ操作ごと
        U->>W: いいね/良くないね
        W->>S: POST /rooms/{room_code}/{member_id}/likes
        S-->>W: 200 {is_liked, updated_at}
    end

    opt 投票一覧の確認
        W->>S: GET /rooms/{room_code}/{member_id}/likes
        S-->>W: 200 {items:[...], next_cursor}
    end

    opt カード尽きたら
        W-->>U: 集計画面への導線
    end

```

---

## 5. グループ集計画面（ランキング）

```mermaid
sequenceDiagram
    autonumber
    actor U as 参加者/幹事 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 集計画面を開く
    W->>S: GET /rooms/{room_code}/ranking
    S-->>W: 200 [ {rank, place_id, name, score, like_count, dislike_count, rating, distance...} ]
    W-->>U: ランキング表示 / 店舗タップで詳細へ

```

---

## 6. 投票詳細の確認/編集（管理用）

```mermaid
sequenceDiagram
    autonumber
    actor U as 幹事 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 投票詳細を開く
    W->>S: GET /rooms/{room_code}/votes?member_id=<opt>
    S-->>W: 200 {room, votes:[{member_name, place_id, is_liked}]}
    opt 個別の投票削除
        U->>W: レコード削除操作
        W->>S: DELETE /rooms/{room_code}/votes/{member_id}/{place_id}
        S-->>W: 200 {deleted:true}
    end

```

---

## 7. 店舗詳細/レビュー画面

```mermaid
sequenceDiagram
    autonumber
    actor U as 参加者 (U)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: ランキング/カードから店舗詳細へ
    W->>S: GET /restaurants/{place_id}
    S-->>W: 200 {name, address, phone, website, maps_url, opening_hours, summary_detail, photo_urls}
    opt レビュー表示
        W->>S: GET /restaurants/{place_id}/reviews
        S-->>W: 200 [ {author_name, rating, text, time} x up to 5 ]
    end
    W-->>U: 詳細表示

```

---

## 8. 投票をリセット（やり直し）

```mermaid
sequenceDiagram
    autonumber
    actor U as 参加者 (誰でも)
    participant W as Web/App (W)
    participant S as Backend API (S)

    U->>W: 「最初からやり直す（{member_name}）」を選択
    W->>S: DELETE /rooms/{room_code}/{member_id}/likes
    alt 呼び出し者が当該roomのメンバー && status=voting
        S-->>W: 200 {reset:true, deleted_count:n, deleted_by:"<caller_member_id>"}
        W-->>U: リセット完了→カード再配布へ
    else 呼び出し者が当該roomのメンバーでない
        S-->>W: 403 NOT_IN_ROOM
        W-->>U: 権限エラー表示
    else 対象member_idがルームに存在しない
        S-->>W: 404 MEMBER_NOT_FOUND
        W-->>U: 対象が見つからない旨を表示
    else 投票フェーズ外
        S-->>W: 409 ROOM_NOT_IN_VOTING
        W-->>U: 状態遷移待ち/再試行
    end

```

---
