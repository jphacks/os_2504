🍽️ MogFinder  
「ご飯どこ行く？」でもう悩まない。  
ログイン不要、ワンリンクでグループ投票ができる飲食店決定支援アプリ。

---

🏆 コンセプトまとめ  
だから、もう「ご飯どこ行く？」で悩まない！  
ログイン不要！リンクで即参加！Yes/No を選ぶだけ！  

<img width="2616" height="1474" alt="image" src="https://github.com/user-attachments/assets/edc39a90-d782-4d9a-a4d1-8c4d93e4e7c8" />

---

🚀 概要 (Overview) 
MogFinder は、大学生などのグループが「今からご飯行こう！」となったとき、 
すぐに行き先を決められるようにする Web アプリです。  

📱 サイト URL  
➡️ https://mogufinder-frontend-hoji7n3kqq-an.a.run.app/  

✅ スライドURL  
➡️ https://www.canva.com/design/DAG2LrCa7kY/-gg3PFwBtXY_ITIqijopOg/edit?  utm_content=DAG2LrCa7kY&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

## 🎥 デモ動画  
➡️ https://img.youtube.com/vi/Kcumb8yQy6A/hqdefault.jpg)](https://youtube.com/shorts/Kcumb8yQy6A  
[![Watch on YouTube](https://img.youtube.com/vi/Kcumb8yQy6A/hqdefault.jpg)](https://youtube.com/shorts/Kcumb8yQy6A)

---

🧑‍🤝‍🧑 課題とペルソナ (Persona)  
ペルソナ：「放課後の大学生のグループ」  
課題：「ご飯の合意形成が遅い」  

具体例：
A「放課後だし、ご飯行こうぜ〜」  
B「店調べたけど、これどう」  
C「う〜ん、ちょっとな〜」  
B「じゃあこれは？」  
,,,  
といったなかなか決まらない状況など。  

---

💡 提案手法 (Solution)  
ログイン機能不要  
ワンリンク（QR コード）でグループ作成・共有  
近場の飲食店をマッチングアプリ風 UI（Yes/ No）で投票  
集計により、グループ全員の嗜好を反映した「最適な一軒」を自動決定  
合意形成を支援・高速化  

<img width="416" height="914" alt="image" src="https://github.com/user-attachments/assets/a21b1b42-3c10-4d2e-8fed-56dd7ac270f8" />

---

📦 スコープ (Scope)  
🥇 1st Release (Must)  
グループ ID によってワンリンク、ログイン不要でグループ投票ができる。  
グループ幹事がグループ URL を発行し、各種設定を行い、グループを作成する。  
メンバーがグループにワンリンク（QR コード読み込み）によって参加し、近場の飲食店をスワイプ形式で投票（UI はマッチングアプリ風）。  
個人でそれぞれ投票終了後、グループに適した飲食店がランキング形式で出力される。  

---

🔄 ユーザーフロー (User Flow)  
 - グループ作成  

   
幹事が MogFinder を開く  
メンバー名、検索場所（位置情報 or 指定）を設定  
URL / QR コードを発行  

<img width="545" height="864" alt="スクリーンショット 2025-10-20 8 34 04" src="https://github.com/user-attachments/assets/5b70496a-7c85-4ff9-8b1a-d5adee4eea03" />
  
(メンバー作成画面、このあとQRが発行されます)  


 - グループ参加  

   
メンバーがリンクを踏む or QR を読み込んでアクセス  
グループにて指定された位置情報に基づく飲食店候補を取得   
表示画面を見ながら「いいね」「良くないね」を行う  

<img width="416" height="914" alt="image" src="https://github.com/user-attachments/assets/11f38c13-cc30-44e4-b2d3-10ecd8edabe1" />

(投票画面)  


投票確認

   
結果をランキング形式で出力  
グループで行く店舗の指標となる  
<img width="817" height="1348" alt="image" src="https://github.com/user-attachments/assets/42395cd0-9415-4a07-9910-895f0c2879c2" />
  
(結果画面 なお、リンク発行した代表の方が投票を締め切ることで表示可能)  

---

🧠 注力したポイント (Key Focus)  
即時アクセス性：ログイン不要、URL1 つで全員参加可能  
UI 設計：マッチングアプリのように直感的に選べる操作性  
心理的負担の軽減：幹事が提案・調整する負担を削減  
合意形成の効率化：全員の嗜好を反映しつつスピーディに決定  

---

⚙️ 技術構成 (Tech Stack)
| Category | Technology                          |
| -------- | ----------------------------------- |
| Frontend | Next.js, TypeScript, React          |
| Styling  | Sass, RadixUI                       |
| Hosting  | GCP                             |
| Data     | Google Maps API（飲食店データ取得） |
| Auth     | Guest Session（非ログイン参加）     |


---

🧑‍💻 チーム  
JPHACKS 2025 参加チーム「OS_2504 班」  

---

🏆 コンセプトまとめ  
だから、もう「ご飯どこ行く？」で悩まない！  
ログイン不要！リンクで即参加！Yes/No を選ぶだけ！  

---

© 2025 Team 2504 / MogFinder
