import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import { buttonDanger, buttonMuted, buttonPrimary, buttonSecondary, panelClass } from '../../lib/ui';
import type { StoredMemberSession } from '../../utils/session';
import { loadParticipantSession, saveParticipantSession } from '../../utils/session';

type ParticipantStep = 'join' | 'voting' | 'finished';
type StatusTone = 'info' | 'success' | 'error';

interface StatusState {
  tone: StatusTone;
  text: string;
}

export function ParticipantView({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [session, setSession] = useState<StoredMemberSession | null>(() => loadParticipantSession(roomCode));
  const [selectedMemberId, setSelectedMemberId] = useState(session?.memberId ?? '');
  const [newMemberName, setNewMemberName] = useState('');
  const [statusMessage, setStatusMessage] = useState<StatusState | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [step, setStep] = useState<ParticipantStep>(session ? 'voting' : 'join');
  const [queue, setQueue] = useState<Restaurant[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const dismissTimerRef = useRef<number | null>(null);

  const answeredCount = totalCards - queue.length;
  const currentCard = queue[0] ?? null;
  const canStartVoting = session && room?.status === 'voting' && !isFetchingCards;

  const showMessage = useCallback((tone: StatusTone, text: string) => {
    setStatusMessage({ tone, text });
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = window.setTimeout(() => setStatusMessage(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoadingRoom(true);
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
        // ignore polling errors
      }
    }, 2000);
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
          showMessage('info', 'まだ候補が準備中です。時間を置いて再取得してください。');
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
        showMessage('success', 'すべてのカードを評価しました。結果を確認してください。');
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

  return (
    <div className="min-h-screen bg-[#FFF4C6] text-[#1D1B20] flex flex-col">
      <ParticipantHeader roomCode={roomCode} roomName={room?.room_name ?? 'ルームに参加'} />

      {statusMessage && (
        <StatusToast message={statusMessage} onClose={() => setStatusMessage(null)} />
      )}

      <main className="flex-1 w-full flex justify-center px-4 pb-24 pt-6">
        <div className="w-full max-w-[420px] space-y-6">
          <RoomStatusPanel
            room={room}
            isLoadingRoom={isLoadingRoom}
            onRefresh={refreshRoom}
          />

          {step === 'join' && (
            <JoinScreen
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onJoinExisting={joinAsExisting}
              newMemberName={newMemberName}
              onNewMemberNameChange={setNewMemberName}
              onJoinNew={joinAsNew}
              isJoining={isJoining}
              canStartVoting={Boolean(canStartVoting)}
              onStartVoting={() => startVoting()}
              session={session}
              onLeaveSession={leaveSession}
              roomStatus={room?.status ?? 'waiting'}
            />
          )}

          {step === 'voting' && (
            <VoteScreen
              roomName={room?.room_name ?? ''}
              currentCard={currentCard}
              answeredCount={answeredCount}
              totalCards={totalCards}
              onVote={handleVote}
              onReload={() => startVoting()}
              isFetchingCards={isFetchingCards}
              isSubmittingVote={isSubmittingVote}
            />
          )}

          {step === 'finished' && (
            <ResultScreen
              ranking={ranking}
              onRestart={() => startVoting()}
              roomName={room?.room_name ?? ''}
              onRefreshRanking={fetchRanking}
            />
          )}
        </div>
      </main>

      <ParticipantFooter />
    </div>
  );
}

function ParticipantHeader({ roomCode, roomName }: { roomCode: string; roomName: string }) {
  return (
    <header className="bg-[#FFF4C6] border-b border-[#FFD59A]/50">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5D5D5D]">参加中のルーム</p>
        <h1 className="mt-2 text-[20px] font-bold text-[#EB8D00]">{roomName}</h1>
        <div className="mt-3 inline-flex items-center justify-center gap-3 rounded-full bg-white/80 px-4 py-1 text-xs font-bold text-[#EB8D00]">
          <span>ROOM CODE</span>
          <span className="tracking-[0.35em]">{roomCode}</span>
        </div>
      </div>
    </header>
  );
}

function ParticipantFooter() {
  return (
    <footer className="bg-[#242424] text-white">
      <div className="mx-auto w-full max-w-[480px] px-9 py-6 space-y-2 text-[12px]">
        <a href="#" className="block leading-[30px] hover:underline">
          プライバシーポリシー
        </a>
        <a href="#" className="block leading-[30px] hover:underline">
          利用規約
        </a>
        <p className="text-[#BCBCBC] text-[10px] leading-[30px] mt-2">@2025 E-kanji</p>
      </div>
    </footer>
  );
}

function StatusToast({ message, onClose }: { message: StatusState; onClose: () => void }) {
  const toneStyles: Record<StatusTone, string> = {
    info: 'bg-[#FFE7DF] text-[#EB8D00]',
    success: 'bg-[#CFF3D1] text-[#1C7C2D]',
    error: 'bg-[#FFD1D1] text-[#B42318]',
  };

  return (
    <div className="fixed top-24 left-1/2 z-40 w-full max-w-[360px] -translate-x-1/2 px-4">
      <div
        role="status"
        className={`flex items-center justify-between gap-3 rounded-full px-5 py-3 text-sm font-bold shadow-[0_8px_16px_rgba(0,0,0,0.15)] ${toneStyles[message.tone]}`}
      >
        <span>{message.text}</span>
        <button type="button" className="text-xs underline" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}

function RoomStatusPanel({
  room,
  isLoadingRoom,
  onRefresh,
}: {
  room: RoomSummary | null;
  isLoadingRoom: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className={`${panelClass} bg-white p-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#EB8D00]">ルーム状況</h2>
          <p className="text-xs text-[#5D5D5D]">開催ステータスと準備状況を確認しましょう。</p>
        </div>
        <button type="button" className={`${buttonMuted} px-3 py-1 text-xs`} onClick={onRefresh}>
          再読み込み
        </button>
      </div>
      {isLoadingRoom && <p className="text-xs text-[#5D5D5D]">ルーム情報を読み込み中です…</p>}
      {!isLoadingRoom && !room && (
        <p className="rounded-[12px] bg-[#FFD1D1] px-4 py-3 text-xs text-[#B42318]">
          ルームが見つかりませんでした。URLが正しいか幹事に確認してください。
        </p>
      )}
      {room && (
        <div className="space-y-3 text-sm text-[#1D1B20]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5D5D5D]">ステータス</span>
            <span className="text-sm font-bold text-[#EB8D00]">
              {room.status === 'waiting' ? '準備中' : '投票受付中'}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#5D5D5D]">準備状況</p>
            <div className="mt-2 h-2 w-full rounded-full bg-[#FFE7DF]">
              <div className="h-full rounded-full bg-[#EB8D00]" style={{ width: `${room.preparation.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#5D5D5D]">
              {room.preparation.preparedCount}/{room.preparation.expectedCount} 件の候補を準備中です。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

interface JoinScreenProps {
  members: Member[];
  selectedMemberId: string;
  onSelectMember: (value: string) => void;
  onJoinExisting: () => void;
  newMemberName: string;
  onNewMemberNameChange: (value: string) => void;
  onJoinNew: () => void;
  isJoining: boolean;
  canStartVoting: boolean;
  onStartVoting: () => void;
  session: StoredMemberSession | null;
  onLeaveSession: () => void;
  roomStatus: RoomSummary['status'];
}

function JoinScreen({
  members,
  selectedMemberId,
  onSelectMember,
  onJoinExisting,
  newMemberName,
  onNewMemberNameChange,
  onJoinNew,
  isJoining,
  canStartVoting,
  onStartVoting,
  session,
  onLeaveSession,
  roomStatus,
}: JoinScreenProps) {
  return (
    <section className={`${panelClass} bg-white p-6 space-y-6`}>
      <header className="space-y-2 text-center">
        <h2 className="text-[20px] font-bold text-[#EB8D00]">参加手続き</h2>
        <p className="text-xs text-[#5D5D5D]">既存メンバーを選ぶか、新しく名前を登録して投票を始めましょう。</p>
      </header>

      {roomStatus === 'waiting' && (
        <p className="rounded-[12px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
          現在候補を準備中です。投票開始まで少しお待ちください。
        </p>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-[#5D5D5D]" htmlFor="existing-member">
          既存メンバーで参加
        </label>
        <select
          id="existing-member"
          value={selectedMemberId}
          onChange={(event) => onSelectMember(event.target.value)}
          className="w-full rounded-[12px] border border-[#D9D9D9] bg-[#FFF4C6] px-3 py-2 text-sm font-bold text-[#1D1B20]"
        >
          <option value="">未選択</option>
          {members.map((member) => (
            <option key={member.member_id} value={member.member_id}>
              {member.member_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${buttonPrimary} w-full px-6 py-2 text-lg`}
          onClick={onJoinExisting}
          disabled={!selectedMemberId || isJoining}
        >
          {isJoining ? '処理中…' : '選択したメンバーで参加'}
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-[#5D5D5D]" htmlFor="new-member-name">
          新しく名前を登録
        </label>
        <input
          id="new-member-name"
          value={newMemberName}
          onChange={(event) => onNewMemberNameChange(event.target.value)}
          placeholder="例: さき"
          className="w-full rounded-[12px] border border-[#D9D9D9] bg-[#FFF4C6] px-3 py-2 text-sm"
        />
        <button
          type="button"
          className={`${buttonMuted} w-full px-6 py-2 text-lg`}
          onClick={onJoinNew}
          disabled={isJoining}
        >
          {isJoining ? '登録中…' : '登録して参加'}
        </button>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={`${buttonSecondary} w-full px-6 py-2 text-lg`}
          onClick={onStartVoting}
          disabled={!canStartVoting}
        >
          カードを取得
        </button>
        {session && (
          <div className="rounded-[12px] bg-[#E8F8ED] px-4 py-3 text-xs text-[#0F7A39]">
            現在 <strong>{session.memberName}</strong> として参加中です。
            <button type="button" className="mt-2 block text-xs underline" onClick={onLeaveSession}>
              セッションを終了する
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface VoteScreenProps {
  roomName: string;
  currentCard: Restaurant | null;
  answeredCount: number;
  totalCards: number;
  onVote: (isLiked: boolean) => void;
  onReload: () => void;
  isFetchingCards: boolean;
  isSubmittingVote: boolean;
}

function VoteScreen({
  roomName,
  currentCard,
  answeredCount,
  totalCards,
  onVote,
  onReload,
  isFetchingCards,
  isSubmittingVote,
}: VoteScreenProps) {
  return (
    <section className={`${panelClass} bg-white p-0`}>
      <header className="px-6 pt-6 text-center">
        <p className="text-xs font-bold text-[#5D5D5D]">{roomName}</p>
        <h2 className="mt-2 text-[20px] font-bold text-[#EB8D00]">カードを評価</h2>
        {totalCards > 0 && (
          <p className="mt-1 text-xs text-[#5D5D5D]">
            {Math.min(answeredCount + 1, totalCards)} / {totalCards}
          </p>
        )}
        <div className="mt-4 px-6">
          <button
            type="button"
            className={`${buttonMuted} w-full px-6 py-2 text-sm`}
            onClick={onReload}
            disabled={isFetchingCards}
          >
            {isFetchingCards ? '再取得中…' : 'カードを再取得'}
          </button>
        </div>
      </header>

      {currentCard ? (
        <article className="mt-6 flex flex-col gap-4 px-6 pb-8">
          <div className="overflow-hidden rounded-[20px] bg-[#FFF4C6]">
            {currentCard.photo_urls[0] ? (
              <img
                src={currentCard.photo_urls[0]}
                alt={currentCard.name}
                className="h-[200px] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-[#5D5D5D]">
                画像は準備中です
              </div>
            )}
          </div>
          <div className="space-y-3 text-left">
            <h3 className="text-lg font-bold text-[#1D1B20]">{currentCard.name}</h3>
            <p className="text-sm leading-relaxed text-[#5D5D5D]">{currentCard.summary_simple}</p>
            <div className="flex items-center gap-2 text-xs text-[#5D5D5D]">
              <span className="rounded-full bg-[#FFE7DF] px-3 py-1 font-bold text-[#EB8D00]">
                ★ {currentCard.rating.toFixed(1)}
              </span>
              <span>{currentCard.user_ratings_total} 件のレビュー</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              className={`${buttonMuted} w-32 px-6 py-3 text-sm`}
              onClick={() => onVote(false)}
              disabled={isSubmittingVote}
            >
              良くないね
            </button>
            <button
              type="button"
              className={`${buttonDanger} w-32 px-6 py-3 text-sm`}
              onClick={() => onVote(true)}
              disabled={isSubmittingVote}
            >
              いいね
            </button>
          </div>
        </article>
      ) : (
        <div className="px-6 pb-8 text-center text-sm text-[#5D5D5D]">
          カードを準備しています。少し待ってから再取得をお試しください。
        </div>
      )}
    </section>
  );
}

interface ResultScreenProps {
  ranking: RankingItem[];
  onRestart: () => void;
  roomName: string;
  onRefreshRanking: () => void;
}

function ResultScreen({ ranking, onRestart, roomName, onRefreshRanking }: ResultScreenProps) {
  return (
    <section className={`${panelClass} bg-white p-6 space-y-5`}>
      <header className="space-y-2 text-center">
        <h2 className="text-[20px] font-bold text-[#EB8D00]">暫定ランキング</h2>
        <p className="text-sm font-bold text-[#1D1B20]">{roomName || 'ルーム名未設定'}</p>
        <button type="button" className={`${buttonSecondary} w-full px-6 py-2 text-sm`} onClick={onRefreshRanking}>
          ランキングを更新
        </button>
      </header>
      <div className="space-y-4">
        {ranking.map((item) => (
          <div
            key={item.place_id}
            className={`${panelClass} flex items-center justify-between bg-[#FFE7DF] px-5 py-3`}
          >
            <div>
              <p className="text-sm font-bold text-[#EB8D00]">#{item.rank}</p>
              <p className="text-lg font-bold text-black">{item.name}</p>
              <p className="text-xs text-[#5D5D5D]">
                いいね {item.like_count} / 良くないね {item.dislike_count} ・ ★ {item.rating.toFixed(1)}
              </p>
            </div>
            <span className="text-xs font-bold text-[#5D5D5D]">{item.user_ratings_total} 件</span>
          </div>
        ))}
        {ranking.length === 0 && (
          <p className="rounded-[16px] bg-[#FFF4C6] px-6 py-5 text-center text-sm text-[#5D5D5D]">
            まだランキングがありません。幹事が集計を再実行するまでお待ちください。
          </p>
        )}
      </div>
      <button type="button" className={`${buttonMuted} w-full px-6 py-2 text-sm`} onClick={onRestart}>
        もう一度カードを取得
      </button>
    </section>
  );
}
