import { useEffect, useMemo, useState } from 'react';

type RoomStatus = 'waiting' | 'voting';
type StepId = 'create' | 'members' | 'voting';

type RoomSummary = {
  room_code: string;
  room_name: string;
  share_url: string;
  status: RoomStatus;
  preparation: { progress: number; preparedCount: number; expectedCount: number };
};

type Member = { member_id: string; member_name: string };

type Restaurant = {
  place_id: string;
  name: string;
  summary_simple: string;
  rating: number;
  user_ratings_total: number;
  photo_urls: string[];
};

type RankingItem = {
  rank: number;
  place_id: string;
  name: string;
  score: number;
  like_count: number;
  dislike_count: number;
  rating: number;
  user_ratings_total: number;
  google_maps_url: string;
};

const DEFAULT_SETTINGS = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3.0,
  min_price_level: 0,
  max_price_level: 4,
};

const panelClass = 'panel';
const buttonPrimary = 'btn btn--primary';
const buttonSecondary = 'btn btn--secondary';
const buttonMuted = 'btn btn--ghost';
const buttonDanger = 'btn btn--danger';

const steps: Array<{ id: StepId; title: string; caption: string; description: string }> = [
  { id: 'create', title: 'Step 1', caption: 'ルーム作成', description: '検索条件と名称を決めて準備を開始します。' },
  { id: 'members', title: 'Step 2', caption: 'メンバー招待', description: '参加者を追加し、投票用トークンを発行します。' },
  { id: 'voting', title: 'Step 3', caption: '投票＆結果確認', description: 'カードを評価し、ランキングを確認します。' },
];

async function api<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `API Error: ${res.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as T;
}

function StepIndicator({ active }: { active: StepId }) {
  return (
    <ol className="step-indicator">
      {steps.map((step, index) => {
        const isActive = step.id === active;
        const isCompleted = steps.findIndex((s) => s.id === active) > index;
        return (
          <li
            key={step.id}
            className={`step-card ${isCompleted ? 'step-card--done' : isActive ? 'step-card--active' : ''}`}
          >
            <div className="step-card__header">
              <span className={`step-card__badge ${isCompleted ? 'is-done' : isActive ? 'is-active' : ''}`}>{index + 1}</span>
              <div>
                <p className="step-card__title">{step.title}</p>
                <p className="step-card__caption">{step.caption}</p>
              </div>
            </div>
            <p className="step-card__description">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function App() {
  const [roomName, setRoomName] = useState('飲み会@神田');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roomCode = room?.room_code ?? null;

  const stepId: StepId = useMemo(() => {
    if (!room) return 'create';
    if (!memberToken) return 'members';
    return 'voting';
  }, [room, memberToken]);

  useEffect(() => {
    let timer: number | undefined;
    if (room && room.status === 'waiting') {
      timer = window.setInterval(async () => {
        try {
          const next = await api<{ ok: boolean; data: RoomSummary & { qr: { text: string } } }>(
            `/api/rooms/${room.room_code}`,
          );
          if (next.ok) {
            setRoom({
              room_code: room.room_code,
              room_name: next.data.room_name,
              share_url: next.data.share_url,
              status: next.data.status,
              preparation: next.data.preparation,
            });
          }
        } catch {
          // ポーリング中のエラーは握りつぶす
        }
      }, 1500);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [room]);

  const showMessage = (tone: 'info' | 'success' | 'error', text: string) => {
    setStatusMessage({ tone, text });
    window.setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const result = await api<{ ok: boolean; data: RoomSummary }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ room_name: roomName.trim(), settings }),
      });
      if (result.ok) {
        setRoom(result.data);
        setMembers([]);
        setMemberToken(null);
        showMessage('success', 'ルームを作成しました。準備が完了するまで少しお待ちください。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRoom = async () => {
    if (!roomCode) return;
    try {
      const result = await api<{ ok: boolean; data: RoomSummary & { qr: { text: string } } }>(
        `/api/rooms/${roomCode}`,
      );
      if (result.ok) {
        setRoom({
          room_code: roomCode,
          room_name: result.data.room_name,
          share_url: result.data.share_url,
          status: result.data.status,
          preparation: result.data.preparation,
        });
        showMessage('info', '最新のルーム状態を取得しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const loadMembers = async () => {
    if (!roomCode) return;
    try {
      const result = await api<{ ok: boolean; data: Member[] }>(`/api/rooms/${roomCode}/members`);
      if (result.ok) {
        setMembers(result.data);
        if (!selectedMemberId && result.data.length > 0) {
          setSelectedMemberId(result.data[0].member_id);
        }
        showMessage('info', 'メンバー一覧を更新しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const handleAddMember = async () => {
    if (!roomCode || !memberName.trim()) return;
    try {
      await api(`/api/rooms/${roomCode}/members`, {
        method: 'POST',
        body: JSON.stringify({ member_name: memberName.trim() }),
      });
      setMemberName('');
      await loadMembers();
      showMessage('success', 'メンバーを追加しました。');
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const issueMemberSession = async () => {
    if (!roomCode || !selectedMemberId) return;
    try {
      const result = await api<{ ok: boolean; data: { member_token: string; expires_in: number } }>(
        `/api/rooms/${roomCode}/members/${selectedMemberId}/session`,
        { method: 'POST' },
      );
      if (result.ok) {
        setMemberToken(result.data.member_token);
        showMessage('success', 'メンバートークンを発行しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const fetchRestaurants = async () => {
    if (!roomCode || !memberToken) return;
    try {
      const result = await api<{ ok: boolean; data: { items: Restaurant[] } }>(
        `/api/rooms/${roomCode}/restaurants`,
        {
          headers: { Authorization: `Bearer ${memberToken}` },
        },
      );
      if (result.ok) {
        setRestaurants(result.data.items);
        showMessage('info', '最新の候補カードを取得しました。');
      }
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 425) {
        showMessage('info', 'まだ候補が準備中です。少し待ってから再取得してください。');
      } else {
        showMessage('error', err.message);
      }
    }
  };

  const sendVote = async (placeId: string, isLiked: boolean) => {
    if (!roomCode || !memberToken) return;
    try {
      await api(`/api/rooms/${roomCode}/likes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ place_id: placeId, is_liked: isLiked }),
      });
      showMessage('success', isLiked ? 'いいねを記録しました。' : '良くないねを記録しました。');
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const fetchRanking = async () => {
    if (!roomCode) return;
    try {
      const result = await api<{ ok: boolean; data: RankingItem[] }>(`/api/rooms/${roomCode}/ranking`);
      if (result.ok) {
        setRanking(result.data);
        showMessage('info', 'ランキングを更新しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  return (
    <main className="app">
      <div className="app__container">
        <header className="app__header">
          <div className="app__headline">
            <div>
              <h1>MogFinder プロトタイプ</h1>
              <p>
                データベース導入前に、ルーム作成から投票結果確認までの体験をモック環境で確認できます。
              </p>
            </div>
            {room && (
              <div className="app__room-code">
                <span>ROOM CODE</span>
                <span>{room.room_code}</span>
              </div>
            )}
          </div>
          <StepIndicator active={stepId} />
        </header>

        {statusMessage && (
          <div className={`notice notice--${statusMessage.tone}`}>
            {statusMessage.text}
          </div>
        )}

        <div className="app__content">
          <div className="app__main-column">
            <section className={panelClass}>
              <div className="panel__header">
                <div>
                  <h2>ルーム作成</h2>
                  <p>スポット検索条件を入力し、投票の準備を始めます。</p>
                </div>
                <button
                  className={buttonPrimary}
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                >
                  {isLoading ? '作成中…' : 'ルームを作成'}
                </button>
              </div>

              <div className="panel__body">
                <label className="form-field">
                  <span>ルーム名</span>
                  <input
                    className="input"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="例: 飲み会@神田"
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>緯度</span>
                    <input
                      type="number"
                      className="input"
                      value={settings.latitude}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, latitude: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>経度</span>
                    <input
                      type="number"
                      className="input"
                      value={settings.longitude}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, longitude: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>検索半径 (km)</span>
                    <input
                      type="number"
                      className="input"
                      value={settings.radius}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, radius: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <div className="form-field">
                    <span>価格帯 (0-4)</span>
                    <div className="form-range">
                      <input
                        type="number"
                        min={0}
                        max={4}
                        className="input"
                        value={settings.min_price_level}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, min_price_level: Number(e.target.value) }))
                        }
                      />
                      <span>〜</span>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        className="input"
                        value={settings.max_price_level}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, max_price_level: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {room && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>メンバー管理</h2>
                    <p>メンバーの追加と投票用トークンの発行を行います。</p>
                  </div>
                  <button className={buttonSecondary} onClick={loadMembers}>
                    メンバー再取得
                  </button>
                </div>

                <div className="panel__body panel__body--spaced">
                  <div className="member-input">
                    <label className="form-field">
                      <span>メンバー名</span>
                      <input
                        className="input"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="例: 田中 太郎"
                      />
                    </label>
                    <button
                      className={buttonMuted}
                      onClick={handleAddMember}
                      disabled={!memberName.trim()}
                    >
                      追加
                    </button>
                  </div>

                  <label className="form-field">
                    <span>投票するメンバー</span>
                    <select
                      className="input"
                      value={selectedMemberId ?? ''}
                      onChange={(e) => setSelectedMemberId(e.target.value || null)}
                    >
                      <option value="">未選択</option>
                      {members.map((m) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.member_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className={buttonPrimary}
                    onClick={issueMemberSession}
                    disabled={!selectedMemberId}
                  >
                    トークン発行
                  </button>

                  {memberToken && (
                    <p className="info-box">
                      メンバー用トークンを取得済みです。このブラウザで投票APIを利用できます。
                    </p>
                  )}
                </div>
              </section>
            )}

            {room && memberToken && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>投票カード</h2>
                    <p>候補を確認し、いいね／良くないねを送信します。</p>
                  </div>
                  <button className={buttonSecondary} onClick={fetchRestaurants}>
                    カード取得
                  </button>
                </div>

                <div className="card-grid">
                  {restaurants.map((r) => (
                    <article
                      key={r.place_id}
                      className="restaurant-card"
                    >
                      <div>
                        <h3>{r.name}</h3>
                        <p>{r.summary_simple}</p>
                      </div>
                      {r.photo_urls[0] && (
                        <img
                          src={r.photo_urls[0]}
                          alt={r.name}
                          className="restaurant-card__image"
                          loading="lazy"
                        />
                      )}
                      <div className="restaurant-card__meta">
                        <span>★ {r.rating.toFixed(1)}</span>
                        <span>{r.user_ratings_total} 件</span>
                      </div>
                      <div className="restaurant-card__actions">
                        <button
                          className={buttonSecondary}
                          onClick={() => sendVote(r.place_id, false)}
                        >
                          良くないね
                        </button>
                        <button
                          className={buttonDanger}
                          onClick={() => sendVote(r.place_id, true)}
                        >
                          いいね
                        </button>
                      </div>
                    </article>
                  ))}
                  {restaurants.length === 0 && (
                    <p className="placeholder-box">
                      カードはまだありません。候補が揃ったら「カード取得」で最新のリストを確認しましょう。
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="app__side-column">
            {room && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>ルーム概要</h2>
                    <p>共有URLと準備状況を確認できます。</p>
                  </div>
                  <button className={buttonSecondary} onClick={refreshRoom}>
                    状態更新
                  </button>
                </div>

                <dl className="room-summary">
                  <div className="room-summary__row">
                    <dt>共有URL</dt>
                    <dd>{room.share_url}</dd>
                  </div>
                  <div className="room-summary__row">
                    <dt>ステータス</dt>
                    <dd>{room.status === 'waiting' ? '準備中' : '投票受付中'}</dd>
                  </div>
                  <div>
                    <dt>準備進捗</dt>
                    <dd>
                      <div className="progress-bar">
                        <div
                          className="progress-bar__fill"
                          style={{ width: `${room.preparation.progress}%` }}
                        />
                      </div>
                      <p>
                        {room.preparation.preparedCount}/{room.preparation.expectedCount} 件の候補を準備中
                      </p>
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {room && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>ランキング</h2>
                    <p>投票結果からおすすめ順を確認します。</p>
                  </div>
                  <button className={buttonSecondary} onClick={fetchRanking}>
                    更新
                  </button>
                </div>
                <ol className="ranking-list">
                  {ranking.map((item) => (
                    <li
                      key={item.place_id}
                      className="ranking-item"
                    >
                      <div>
                        <span className="ranking-item__badge">#{item.rank}</span>
                        <p className="ranking-item__name">{item.name}</p>
                        <p className="ranking-item__votes">
                          いいね {item.like_count} / 良くないね {item.dislike_count}
                        </p>
                      </div>
                      <div className="ranking-item__meta">
                        <div>★ {item.rating.toFixed(1)}</div>
                        <div>{item.user_ratings_total} 件</div>
                      </div>
                    </li>
                  ))}
                  {ranking.length === 0 && (
                    <li className="placeholder-box">
                      まだランキングがありません。投票が集まると自動で結果が表示されます。
                    </li>
                  )}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
