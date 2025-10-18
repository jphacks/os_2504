import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type {
  Member,
  RankingItem,
  Restaurant,
  RestaurantDetail,
  RestaurantReview,
  RoomSummary,
  StepId,
} from '../../lib/types';
import { buttonDanger, buttonMuted, buttonPrimary, buttonSecondary, panelClass } from '../../lib/ui';
import { StepIndicator } from './StepIndicator';

const DEFAULT_SETTINGS = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3.0,
  min_price_level: 0,
  max_price_level: 4,
};

export function DashboardView() {
  const [roomName, setRoomName] = useState('飲み会@神田');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<RestaurantDetail | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<RestaurantReview[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
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
          // ignore
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
        const firstMember = result.data[0];
        if (!selectedMemberId && firstMember) {
          setSelectedMemberId(firstMember.member_id);
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
        { headers: { Authorization: `Bearer ${memberToken}` } },
      );
      if (result.ok) {
        resetDetailPanel();
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

  const loadRestaurantDetail = async (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const [detailRes, reviewsRes] = await Promise.all([
        api<{ ok: boolean; data: RestaurantDetail }>(`/api/restaurants/${placeId}`),
        api<{ ok: boolean; data: RestaurantReview[] }>(`/api/restaurants/${placeId}/reviews`),
      ]);
      if (detailRes.ok) {
        setSelectedDetail(detailRes.data);
      }
      if (reviewsRes.ok) {
        setSelectedReviews(reviewsRes.data);
      }
    } catch (error) {
      setDetailError((error as Error).message);
      setSelectedDetail(null);
      setSelectedReviews([]);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const resetDetailPanel = () => {
    setSelectedPlaceId(null);
    setSelectedDetail(null);
    setSelectedReviews([]);
    setDetailError(null);
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

  const copyShareUrl = async () => {
    if (!room?.share_url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(room.share_url);
        showMessage('success', '共有URLをクリップボードにコピーしました。');
      } else {
        throw new Error('クリップボードAPIが利用できません。手動でコピーしてください。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const openShareUrl = () => {
    if (!room?.share_url) return;
    window.open(room.share_url, '_blank', 'noopener,noreferrer');
    showMessage('info', '別タブで共有URLを開きました。');
  };

  return (
    <main className="app">
      <div className="app__container">
        <header className="app__header">
          <div className="app__headline">
            <div>
              <h1>MogFinder プロトタイプ</h1>
              <p>データベース導入前に、ルーム作成から投票結果確認までの体験をモック環境で確認できます。</p>
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
                <button className={buttonPrimary} onClick={handleCreateRoom} disabled={isLoading}>
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
                      onChange={(e) => setSettings((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>経度</span>
                    <input
                      type="number"
                      className="input"
                      value={settings.longitude}
                      onChange={(e) => setSettings((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>検索半径 (km)</span>
                    <input
                      type="number"
                      className="input"
                      value={settings.radius}
                      onChange={(e) => setSettings((prev) => ({ ...prev, radius: Number(e.target.value) }))}
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
                    <button className={buttonMuted} onClick={handleAddMember} disabled={!memberName.trim()}>
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
                  <button className={buttonPrimary} onClick={issueMemberSession} disabled={!selectedMemberId}>
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
                </div>
                <div className="card-grid">
                  {restaurants.map((r) => (
                    <article key={r.place_id} className="restaurant-card">
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
                      <button className={buttonSecondary} onClick={() => sendVote(r.place_id, false)}>
                        良くないね
                      </button>
                      <button className={buttonDanger} onClick={() => sendVote(r.place_id, true)}>
                        いいね
                      </button>
                      <button className={buttonMuted} onClick={() => loadRestaurantDetail(r.place_id)}>
                        詳細
                      </button>
                    </div>
                  </article>
                ))}
                  {restaurants.length === 0 && (
                    <p className="placeholder-box">
                      カードがまだありません。投票を開始するには「カード取得」を押してください。
                    </p>
                  )}
                  <button className={buttonSecondary} onClick={fetchRestaurants}>
                    カード取得
                  </button>
                </div>
              </section>
            )}
          </div>

          <div className="app__side-column">
            {room && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>共有リンク</h2>
                    <p>参加者に共有するURLやQRコードをここから取得できます。</p>
                  </div>
                  <button className={buttonSecondary} onClick={copyShareUrl}>
                    コピー
                  </button>
                </div>
                <div className="panel__body">
                  <div className="share-panel__url">
                    <span>{room.share_url}</span>
                    <button className={buttonSecondary} onClick={openShareUrl}>
                      ブラウザで開く
                    </button>
                  </div>
                  <p className="share-panel__hint">
                    ローカル開発では <code>http://localhost:5173/r/{room.room_code}</code> を共有してください。参加者はこのURLから投票画面にアクセスできます。
                  </p>
                </div>
              </section>
            )}

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
                    <li key={item.place_id} className="ranking-item">
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

            {room && selectedPlaceId && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>店舗詳細</h2>
                    <p>投票候補の情報と最新レビューを確認できます。</p>
                  </div>
                  <button className={buttonSecondary} onClick={resetDetailPanel}>
                    閉じる
                  </button>
                </div>
                <div className="panel__body panel__body--spaced">
                  {isDetailLoading && <p className="placeholder-box">読み込み中です…</p>}
                  {detailError && <p className="notice notice--error">{detailError}</p>}
                  {!isDetailLoading && !detailError && selectedDetail && (
                    <div className="detail-panel">
                      <div className="detail-panel__header">
                        <h3>{selectedDetail.name}</h3>
                        {selectedDetail.summary_simple && <p>{selectedDetail.summary_simple}</p>}
                        <div className="detail-panel__meta">
                          {selectedDetail.rating !== null && (
                            <span>★ {selectedDetail.rating.toFixed(1)}</span>
                          )}
                          {selectedDetail.user_ratings_total !== null && (
                            <span>{selectedDetail.user_ratings_total} 件</span>
                          )}
                          {selectedDetail.types && selectedDetail.types.length > 0 && (
                            <span>{selectedDetail.types.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <dl className="detail-panel__list">
                        {selectedDetail.address && (
                          <div>
                            <dt>住所</dt>
                            <dd>{selectedDetail.address}</dd>
                          </div>
                        )}
                        {selectedDetail.phone_number && (
                          <div>
                            <dt>電話</dt>
                            <dd>{selectedDetail.phone_number}</dd>
                          </div>
                        )}
                        {selectedDetail.website && (
                          <div>
                            <dt>公式サイト</dt>
                            <dd>
                              <a href={selectedDetail.website} target="_blank" rel="noreferrer">
                                {selectedDetail.website}
                              </a>
                            </dd>
                          </div>
                        )}
                        {selectedDetail.google_maps_url && (
                          <div>
                            <dt>Google Maps</dt>
                            <dd>
                              <a href={selectedDetail.google_maps_url} target="_blank" rel="noreferrer">
                                マップで開く
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                      {selectedDetail.opening_hours?.weekday_text && (
                        <div className="detail-panel__hours">
                          <h4>営業時間</h4>
                          <ul>
                            {selectedDetail.opening_hours.weekday_text.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="detail-panel__reviews">
                        <h4>レビュー</h4>
                        {selectedReviews.length === 0 && <p className="placeholder-box">レビューがまだありません。</p>}
                        <ul>
                          {selectedReviews.map((review) => (
                            <li key={review.id} className="detail-panel__review">
                              <p className="detail-panel__review-meta">
                                <span>{review.author_name ?? '匿名'}</span>
                                {review.rating !== null && <span>★ {review.rating}</span>}
                                {review.time && <span>{new Date(review.time).toLocaleString()}</span>}
                              </p>
                              {review.text && <p>{review.text}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
