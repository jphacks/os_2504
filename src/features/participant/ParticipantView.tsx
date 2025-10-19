import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import {
  buttonCircleNegative,
  buttonCirclePositive,
  buttonMuted,
  buttonPrimary,
  buttonSecondary,
} from '../../lib/ui';
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
    <header className="bg-[#FFF4C6] shadow-[0_4px_12px_rgba(235,141,0,0.12)]">
      <div className="mx-auto w-full max-w-[500px] px-4 pb-4">
        <div className="relative flex h-[50px] items-center justify-center">
          <h1 className="font-noto text-[30px] font-bold leading-none text-[#EB8D00]">いー幹事？</h1>
          <span className="absolute right-0 text-[15px] font-bold text-[#EB8D00]">i-kanji?</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-[#5D5D5D]">参加中のルーム</span>
          <p className="text-[20px] font-bold text-[#EB8D00]">{roomName}</p>
          <div className="rounded-full bg-white/80 px-5 py-1 text-xs font-bold tracking-[0.32em] text-[#EB8D00]">
            {roomCode}
          </div>
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
    <section className="rounded-[24px] bg-white/95 px-6 py-6 shadow-[0_16px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#EB8D00]">ルーム状況</h2>
          <p className="text-xs text-[#5D5D5D]">開催ステータスと進行度を確認しましょう。</p>
        </div>
        <button type="button" className={`${buttonMuted} px-4 py-1 text-xs`} onClick={onRefresh}>
          再読み込み
        </button>
      </div>

      {isLoadingRoom && <p className="mt-4 text-xs text-[#5D5D5D]">ルーム情報を読み込み中です…</p>}

      {!isLoadingRoom && !room && (
        <p className="mt-4 rounded-[16px] bg-[#FFD1D1] px-4 py-3 text-xs text-[#B42318]">
          ルームが見つかりませんでした。URLが正しいか幹事に確認してください。
        </p>
      )}

      {room && (
        <div className="mt-6 space-y-4 text-sm text-[#1D1B20]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5D5D5D]">ステータス</span>
            <span className="text-sm font-bold text-[#EB8D00]">
              {room.status === 'waiting' ? '候補を準備中' : '投票受付中'}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#5D5D5D]">準備状況</p>
            <div className="mt-3 h-[8px] w-full rounded-full bg-[#FFD59A]">
              <div className="h-full rounded-full bg-[#EB8D00]" style={{ width: `${room.preparation.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#5D5D5D]">
              {room.preparation.preparedCount}/{room.preparation.expectedCount} 件の候補が準備済みです。
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedMember = members.find((member) => member.member_id === selectedMemberId) ?? null;
  const disabledJoinExisting = !selectedMemberId || isJoining;

  return (
    <section className="rounded-[24px] bg-white/95 px-6 py-6 shadow-[0_16px_32px_rgba(0,0,0,0.08)]">
      <header className="space-y-2 text-center">
        <h2 className="text-[20px] font-bold text-[#EB8D00]">参加手続き</h2>
        <p className="text-xs text-[#5D5D5D]">既存メンバーを選ぶか、新しい名前で参加しましょう。</p>
      </header>

      {roomStatus === 'waiting' && (
        <p className="mt-5 rounded-[16px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
          現在候補を準備中です。投票開始まで少しお待ちください。
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div className="space-y-3">
          <p className="text-[13px] text-[#5D5D5D]">ユーザを選択</p>
          <div className="relative">
            <button
              type="button"
              className={`flex h-[44px] w-full items-center justify-between rounded-[12px] border px-4 text-sm font-bold ${
                selectedMember ? 'border-[#EB8D00] bg-[#FFF4C6] text-[#EB8D00]' : 'border-[#D9D9D9] bg-white text-[#5D5D5D]'
              }`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              <span>{selectedMember?.member_name ?? 'メンバーを選択'}</span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9L12 15L18 9" stroke="#4A4459" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-full rounded-[12px] border border-[#FFD59A] bg-[#FFF9E0] shadow-xl">
                <button
                  type="button"
                  className={`block w-full px-4 py-2 text-left text-sm ${
                    !selectedMemberId ? 'font-bold text-[#EB8D00]' : 'text-[#333] hover:bg-[#FFE7DF]'
                  }`}
                  onClick={() => {
                    onSelectMember('');
                    setIsDropdownOpen(false);
                  }}
                >
                  未選択
                </button>
                {members.map((member) => (
                  <button
                    key={member.member_id}
                    type="button"
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#FFE7DF] ${
                      selectedMemberId === member.member_id ? 'font-bold text-[#EB8D00]' : 'text-[#333]'
                    }`}
                    onClick={() => {
                      onSelectMember(member.member_id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {member.member_name}
                  </button>
                ))}
                {members.length === 0 && (
                  <p className="px-4 py-3 text-[12px] text-[#5D5D5D]">まだメンバーが登録されていません。</p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${buttonPrimary} w-full px-6 py-2 text-sm`}
            onClick={onJoinExisting}
            disabled={disabledJoinExisting}
          >
            {isJoining ? '参加処理中…' : 'この名前で参加する'}
          </button>
        </div>

        <div className="rounded-[18px] bg-[#FFF4C6] px-4 py-4">
          <p className="text-[12px] font-bold text-[#5D5D5D]">または 新しい名前で参加</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={newMemberName}
              onChange={(event) => onNewMemberNameChange(event.target.value)}
              placeholder="ユーザ名"
              className="h-[44px] flex-1 rounded-[12px] border border-[#D9D9D9] bg-white px-4 text-sm font-bold text-[#1D1B20] placeholder:text-[#ADADAD] focus:border-[#EB8D00] focus:outline-none"
            />
            <button
              type="button"
              className={`${buttonSecondary} h-[44px] px-6 text-sm`}
              onClick={onJoinNew}
              disabled={isJoining || !newMemberName.trim()}
            >
              {isJoining ? '登録中…' : '新しい名前で参加'}
            </button>
          </div>
        </div>

        {session ? (
          <div className="space-y-3 rounded-[18px] bg-[#E8F8ED] px-4 py-4 text-xs text-[#0F7A39]">
            <p>
              現在 <strong>{session.memberName}</strong> として参加中です。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className={`${buttonMuted} px-4 py-2 text-xs`} onClick={onStartVoting}>
                {canStartVoting ? 'カードを取得' : '準備ができたらカード取得'}
              </button>
              <button type="button" className={`${buttonSecondary} px-4 py-2 text-xs`} onClick={onLeaveSession}>
                参加を終了
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`${buttonMuted} w-full px-6 py-2 text-sm`}
            onClick={onStartVoting}
            disabled={!canStartVoting}
          >
            {canStartVoting ? 'カードを取得' : '投票の準備が整ったら表示されます'}
          </button>
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
  const currentPosition = totalCards > 0 ? Math.min(answeredCount + 1, totalCards) : 0;

  return (
    <section className="rounded-[24px] bg-white/95 px-6 py-6 shadow-[0_16px_32px_rgba(0,0,0,0.08)]">
      <header className="text-center">
        <p className="text-xs font-bold text-[#5D5D5D]">{roomName}</p>
        <h2 className="mt-2 text-[20px] font-bold text-[#EB8D00]">カードを評価</h2>
        {totalCards > 0 && (
          <p className="mt-1 text-xs text-[#5D5D5D]">
            {currentPosition} / {totalCards}
          </p>
        )}
        <button
          type="button"
          className={`${buttonMuted} mt-4 w-full px-6 py-2 text-sm`}
          onClick={onReload}
          disabled={isFetchingCards}
        >
          {isFetchingCards ? 'カードを再取得中…' : 'カードを再取得'}
        </button>
      </header>

      {currentCard ? (
        <article className="mt-6 space-y-5">
          <div className="overflow-hidden rounded-[24px] bg-[#FFF4C6] shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
            {currentCard.photo_urls[0] ? (
              <img
                src={currentCard.photo_urls[0]}
                alt={currentCard.name}
                className="h-[220px] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-[#5D5D5D]">
                画像は準備中です
              </div>
            )}
          </div>

          <div className="space-y-3 text-left">
            <h3 className="text-[18px] font-bold text-[#1D1B20]">{currentCard.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5D5D5D]">
              <span className="rounded-full bg-[#FFE7DF] px-3 py-1 font-bold text-[#EB8D00]">
                ★ {currentCard.rating.toFixed(1)}
              </span>
              <span>{currentCard.user_ratings_total} 件のレビュー</span>
            </div>
            {currentCard.summary_simple && (
              <div className="rounded-[20px] border border-[#EB8D00]/30 bg-[#FFF4C6] px-4 py-3 text-[12px] leading-relaxed text-[#EB8D00]">
                {currentCard.summary_simple}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-12 pt-2">
            <button
              type="button"
              className={buttonCircleNegative}
              onClick={() => onVote(false)}
              disabled={isSubmittingVote}
              aria-label="良くないね"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 7.5L7.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M7.5 7.5L16.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={buttonCirclePositive}
              onClick={() => onVote(true)}
              disabled={isSubmittingVote}
              aria-label="いいね"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 20.5C11.8333 20.5 11.6667 20.4542 11.5 20.3625C8.33333 18.475 6 16.6 4.5 14.7375C3 12.875 2.25 10.95 2.25 8.9625C2.25 7.5375 2.721 6.3375 3.663 5.3625C4.605 4.3875 5.775 3.9 7.173 3.9C8.005 3.9 8.773 4.1125 9.477 4.5375C10.181 4.9625 10.75 5.55 11.184 6.3H12.816C13.25 5.55 13.819 4.9625 14.523 4.5375C15.227 4.1125 15.995 3.9 16.827 3.9C18.225 3.9 19.395 4.3875 20.337 5.3625C21.279 6.3375 21.75 7.5375 21.75 8.9625C21.75 10.95 21 12.875 19.5 14.7375C18 16.6 15.6667 18.475 12.5 20.3625C12.3333 20.4542 12.1667 20.5 12 20.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </article>
      ) : (
        <div className="mt-6 rounded-[18px] bg-[#FFF4C6] px-6 py-8 text-center text-sm text-[#5D5D5D]">
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
    <section className="rounded-[24px] bg-white/95 px-6 py-6 shadow-[0_16px_32px_rgba(0,0,0,0.08)]">
      <header className="space-y-2 text-center">
        <h2 className="text-[20px] font-bold text-[#EB8D00]">暫定ランキング</h2>
        <p className="text-sm font-bold text-[#1D1B20]">{roomName || 'ルーム名未設定'}</p>
        <button type="button" className={`${buttonSecondary} w-full px-6 py-2 text-sm`} onClick={onRefreshRanking}>
          ランキングを更新
        </button>
      </header>

      <div className="mt-6 space-y-4">
        {ranking.map((item) => (
          <div
            key={item.place_id}
            className="flex items-center justify-between rounded-[18px] bg-[#FFE7DF] px-5 py-4 shadow-[0_8px_18px_rgba(235,141,0,0.18)]"
          >
            <div>
              <p className="text-[16px] font-bold text-[#EB8D00]">
                {item.rank}位：{item.like_count}件
              </p>
              <p className="text-[18px] font-bold text-[#1D1B20]">{item.name}</p>
              <p className="text-[11px] text-[#5D5D5D]">
                良くないね {item.dislike_count} 件・★ {item.rating.toFixed(1)} / {item.user_ratings_total} 件
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#5D5D5D]">score: {item.score.toFixed(1)}</span>
          </div>
        ))}
        {ranking.length === 0 && (
          <p className="rounded-[18px] bg-[#FFF4C6] px-6 py-5 text-center text-sm text-[#5D5D5D]">
            まだランキングがありません。幹事が集計を再実行するまでお待ちください。
          </p>
        )}
      </div>

      <button type="button" className={`${buttonMuted} mt-6 w-full px-6 py-2 text-sm`} onClick={onRestart}>
        もう一度カードを取得
      </button>
    </section>
  );
}
