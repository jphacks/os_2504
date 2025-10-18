import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import { buttonDanger, buttonMuted, buttonPrimary, buttonSecondary, panelClass } from '../../lib/ui';
import type { StoredMemberSession } from '../../utils/session';
import { loadParticipantSession, saveParticipantSession } from '../../utils/session';

type ParticipantStep = 'join' | 'voting' | 'finished';

export function ParticipantView({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [session, setSession] = useState<StoredMemberSession | null>(() => loadParticipantSession(roomCode));
  const [selectedMemberId, setSelectedMemberId] = useState(session?.memberId ?? '');
  const [newMemberName, setNewMemberName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [step, setStep] = useState<ParticipantStep>(session ? 'voting' : 'join');
  const [queue, setQueue] = useState<Restaurant[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  const answeredCount = totalCards - queue.length;
  const currentCard = queue[0] ?? null;

  const showMessage = useCallback((tone: 'info' | 'success' | 'error', text: string) => {
    setStatusMessage({ tone, text });
    window.setTimeout(() => setStatusMessage(null), 5000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await api<{ ok: boolean; data: RoomSummary & { qr: { text: string } } }>(`/api/rooms/${roomCode}`);
        if (result.ok) {
          setRoom({
            room_code: roomCode,
            room_name: result.data.room_name,
            share_url: result.data.share_url,
            status: result.data.status,
            preparation: result.data.preparation,
          });
        }
      } catch (error) {
        showMessage('error', (error as Error).message);
      } finally {
        setIsLoadingRoom(false);
      }
    })();
  }, [roomCode, showMessage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api<{ ok: boolean; data: Member[] }>(`/api/rooms/${roomCode}/members`);
        if (result.ok && !cancelled) {
          setMembers(result.data);
        }
      } catch (error) {
        if (!cancelled) showMessage('error', (error as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode, showMessage]);

  useEffect(() => {
    if (room?.status !== 'waiting') return;
    const timer = window.setInterval(async () => {
      try {
        const result = await api<{ ok: boolean; data: RoomSummary & { qr: { text: string } } }>(`/api/rooms/${roomCode}`);
        if (result.ok) {
          setRoom({
            room_code: roomCode,
            room_name: result.data.room_name,
            share_url: result.data.share_url,
            status: result.data.status,
            preparation: result.data.preparation,
          });
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [room?.status, roomCode]);

  useEffect(() => {
    if (session) {
      setSelectedMemberId(session.memberId);
    }
  }, [session]);

  const refreshRoom = async () => {
    try {
      const result = await api<{ ok: boolean; data: RoomSummary & { qr: { text: string } } }>(`/api/rooms/${roomCode}`);
      if (result.ok) {
        setRoom({
          room_code: roomCode,
          room_name: result.data.room_name,
          share_url: result.data.share_url,
          status: result.data.status,
          preparation: result.data.preparation,
        });
        showMessage('info', 'ルームの最新状態を取得しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const fetchRanking = useCallback(async () => {
    try {
      const result = await api<{ ok: boolean; data: RankingItem[] }>(`/api/rooms/${roomCode}/ranking`);
      if (result.ok) {
        setRanking(result.data);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  }, [roomCode, showMessage]);

  const startVoting = useCallback(
    async (activeSession?: StoredMemberSession) => {
      const targetSession = activeSession ?? session;
      if (!targetSession) {
        showMessage('error', '参加するメンバーを選択してください。');
        return;
      }
      if (room?.status !== 'voting') {
        showMessage('info', 'まだ候補を準備中です。しばらくお待ちください。');
        setStep('join');
        return;
      }
      if (isFetchingCards) return;

      setIsFetchingCards(true);
      setRanking([]);
      try {
        const result = await api<{ ok: boolean; data: { items: Restaurant[] } }>(
          `/api/rooms/${roomCode}/restaurants`,
          { headers: { Authorization: `Bearer ${targetSession.token}` } },
        );
        if (result.ok) {
          const items = result.data.items;
          setQueue(items);
          setTotalCards(items.length);
          if (items.length === 0) {
            setStep('finished');
            await fetchRanking();
            showMessage('info', '表示できるカードがありません。');
          } else {
            setStep('voting');
            showMessage('info', 'カードの準備ができました。順番に評価してください。');
          }
        }
      } catch (error) {
        const err = error as Error & { status?: number };
        if (err.status === 425) {
          showMessage('info', 'まだ候補が準備中です。少し時間を置いて再取得してください。');
        } else {
          showMessage('error', err.message);
        }
      } finally {
        setIsFetchingCards(false);
      }
    },
    [session, room?.status, roomCode, showMessage, fetchRanking, isFetchingCards],
  );

  useEffect(() => {
    if (session && room?.status === 'voting' && queue.length === 0 && !isFetchingCards) {
      void startVoting(session);
    }
  }, [session, room?.status, queue.length, isFetchingCards, startVoting]);

  const handleVote = async (isLiked: boolean) => {
    const target = currentCard;
    if (!target || !session || isSubmittingVote) return;
    setIsSubmittingVote(true);
    try {
      await api(`/api/rooms/${roomCode}/likes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ place_id: target.place_id, is_liked: isLiked }),
      });
      const remaining = queue.length - 1;
      setQueue((prev) => prev.slice(1));
      if (remaining <= 0) {
        setStep('finished');
        await fetchRanking();
        showMessage('success', 'すべてのカードを評価しました。結果をご確認ください。');
      } else {
        showMessage('info', '次のカードを評価してください。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const joinAsExisting = async () => {
    if (!selectedMemberId) {
      showMessage('error', '既存メンバーを選択してください。');
      return;
    }
    setIsJoining(true);
    try {
      const result = await api<{ ok: boolean; data: { member_token: string; expires_in: number } }>(
        `/api/rooms/${roomCode}/members/${selectedMemberId}/session`,
        { method: 'POST' },
      );
      if (result.ok) {
        const member = members.find((m) => m.member_id === selectedMemberId);
        const nextSession: StoredMemberSession = {
          memberId: selectedMemberId,
          memberName: member?.member_name ?? '参加メンバー',
          token: result.data.member_token,
        };
        setSession(nextSession);
        saveParticipantSession(roomCode, nextSession);
        setStep('join');
        showMessage('success', `${nextSession.memberName} として参加しました。`);
        await startVoting(nextSession);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  const joinAsNew = async () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      showMessage('error', '名前を入力してください。');
      return;
    }
    setIsJoining(true);
    try {
      const createResult = await api<{ ok: boolean; data: Member }>(`/api/rooms/${roomCode}/members`, {
        method: 'POST',
        body: JSON.stringify({ member_name: trimmed }),
      });
      if (createResult.ok) {
        const newMember = createResult.data;
        setMembers((prev) => [...prev, newMember]);
        const sessionResult = await api<{ ok: boolean; data: { member_token: string; expires_in: number } }>(
          `/api/rooms/${roomCode}/members/${newMember.member_id}/session`,
          { method: 'POST' },
        );
        if (sessionResult.ok) {
          const nextSession: StoredMemberSession = {
            memberId: newMember.member_id,
            memberName: newMember.member_name,
            token: sessionResult.data.member_token,
          };
          setSession(nextSession);
          saveParticipantSession(roomCode, nextSession);
          setNewMemberName('');
          setStep('join');
          showMessage('success', `${nextSession.memberName} として参加を開始しました。`);
          await startVoting(nextSession);
        }
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveSession = () => {
    setSession(null);
    saveParticipantSession(roomCode, null);
    setQueue([]);
    setTotalCards(0);
    setRanking([]);
    setStep('join');
    showMessage('info', '参加セッションを終了しました。');
  };

  const canStartVoting = session && room?.status === 'voting' && !isFetchingCards;

  return (
    <main className="app">
      <div className="app__container">
        <header className="app__header">
          <div className="app__headline">
            <div>
              <h1>{room ? `${room.room_name} に参加` : 'ルームに参加'}</h1>
              <p>共有されたURLからアクセスし、カードを1枚ずつ評価して合意形成に貢献しましょう。</p>
            </div>
            <div className="app__room-code">
              <span>ROOM CODE</span>
              <span>{roomCode}</span>
            </div>
          </div>
        </header>

        {statusMessage && <div className={`notice notice--${statusMessage.tone}`}>{statusMessage.text}</div>}

        <div className="app__content">
          <div className="app__main-column">
            <section className={panelClass}>
              <div className="panel__header">
                <div>
                  <h2>ルーム状況</h2>
                  <p>開催ステータスと準備状況を確認します。</p>
                </div>
                <button className={buttonSecondary} onClick={refreshRoom}>
                  再読み込み
                </button>
              </div>
              <div className="panel__body">
                {isLoadingRoom && <p className="placeholder-box">ルーム情報を読み込み中です…</p>}
                {!isLoadingRoom && !room && (
                  <p className="placeholder-box">ルームが見つかりませんでした。URLが正しいか幹事に確認してください。</p>
                )}
                {room && (
                  <dl className="room-summary">
                    <div className="room-summary__row">
                      <dt>ルーム名</dt>
                      <dd>{room.room_name}</dd>
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
                )}
              </div>
            </section>

            {step === 'join' && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>参加手続き</h2>
                    <p>既存メンバーを選択するか、新しく追加して投票を開始します。</p>
                  </div>
                  {canStartVoting && (
                    <button className={buttonSecondary} onClick={() => startVoting()}>
                      カード取得
                    </button>
                  )}
                </div>
                <div className="panel__body panel__body--spaced">
                  {room?.status === 'waiting' && (
                    <p className="placeholder-box">現在データを準備中です。投票開始まで少しお待ちください。</p>
                  )}
                  <div className="form-field">
                    <span>既存メンバーで参加</span>
                    <select
                      className="input"
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                    >
                      <option value="">未選択</option>
                      {members.map((member) => (
                        <option key={member.member_id} value={member.member_id}>
                          {member.member_name}
                        </option>
                      ))}
                    </select>
                    <button className={buttonPrimary} onClick={joinAsExisting} disabled={!selectedMemberId || isJoining}>
                      {isJoining ? '処理中…' : '選択したメンバーで参加'}
                    </button>
                  </div>
                  <div className="form-field">
                    <span>新しく名前を登録</span>
                    <input
                      className="input"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="例: さき"
                    />
                    <button className={buttonMuted} onClick={joinAsNew} disabled={isJoining}>
                      {isJoining ? '登録中…' : '登録して参加'}
                    </button>
                  </div>
                  {session && (
                    <div className="info-box">
                      現在 <strong>{session.memberName}</strong> として参加中です。
                      <button className="btn btn--secondary" style={{ marginTop: '12px' }} onClick={leaveSession}>
                        セッションを終了
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 'voting' && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>カードを評価</h2>
                    <p>
                      {totalCards > 0 ? `回答 ${Math.min(answeredCount + 1, totalCards)} / ${totalCards}` : 'カードを読み込み中です'}
                    </p>
                  </div>
                  <button className={buttonSecondary} onClick={() => startVoting()} disabled={isFetchingCards}>
                    {isFetchingCards ? '再取得中…' : 'カード再取得'}
                  </button>
                </div>
                <div className="panel__body">
                  {currentCard ? (
                    <article className="vote-card">
                      <header className="vote-card__header">
                        <span className="vote-card__badge">{currentCard.types?.[0] ?? '候補'}</span>
                        <span className="vote-card__progress">
                          {Math.min(answeredCount + 1, totalCards)} / {totalCards}
                        </span>
                      </header>
                      <h3 className="vote-card__title">{currentCard.name}</h3>
                      <p className="vote-card__summary">{currentCard.summary_simple}</p>
                      {currentCard.photo_urls[0] && (
                        <img
                          src={currentCard.photo_urls[0]}
                          alt={currentCard.name}
                          className="vote-card__image"
                          loading="lazy"
                        />
                      )}
                      <div className="vote-card__meta">
                        <span>★ {currentCard.rating.toFixed(1)}</span>
                        <span>{currentCard.user_ratings_total} 件のレビュー</span>
                      </div>
                      <div className="vote-card__actions">
                        <button className={buttonSecondary} onClick={() => handleVote(false)} disabled={isSubmittingVote}>
                          良くないね
                        </button>
                        <button className={buttonDanger} onClick={() => handleVote(true)} disabled={isSubmittingVote}>
                          いいね
                        </button>
                      </div>
                    </article>
                  ) : (
                    <p className="placeholder-box">カードを準備しています。少し待ってから再取得をお試しください。</p>
                  )}
                </div>
              </section>
            )}

            {step === 'finished' && (
              <section className={panelClass}>
                <div className="panel__header">
                  <div>
                    <h2>暫定ランキング</h2>
                    <p>全カードの評価が完了しました。チームで結果を確認しましょう。</p>
                  </div>
                  <button className={buttonSecondary} onClick={() => startVoting()}>
                    もう一度カード取得
                  </button>
                </div>
                <div className="panel__body">
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
                        まだランキングがありません。幹事が集計を再実行するまでお待ちください。
                      </li>
                    )}
                  </ol>
                </div>
              </section>
            )}
          </div>

          <div className="app__side-column">
            <section className={panelClass}>
              <div className="panel__header">
                <div>
                  <h2>参加のヒント</h2>
                  <p>スムーズに合意形成するためのポイント</p>
                </div>
              </div>
              <div className="panel__body">
                <ul className="tips-list">
                  <li>迷ったら「良くないね」を押して別の候補を呼び込みましょう。</li>
                  <li>画面を閉じても同じ端末ならセッションが保持され、続きから再開できます。</li>
                  <li>ランキングは暫定結果です。全員の投票が揃うと自動で更新されます。</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
