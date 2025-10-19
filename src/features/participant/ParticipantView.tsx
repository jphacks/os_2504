import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import type { StoredMemberSession } from '../../utils/session';
import { loadParticipantSession, saveParticipantSession } from '../../utils/session';
import RestaurantCard from '../../components/RestaurantCard';
import SwipeArea from '../../components/SwipeArea';
import SwipeButtons from '../../components/SwipeButtons';
import MoguwanMascot from '../../components/MoguwanMascot';
import AppContainer from '../../layout/AppContainer';
import PhoneContainer from '../../layout/PhoneContainer';
import MainContent from '../../layout/MainContent';

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
    <AppContainer>
      <PhoneContainer>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <Box
                component="img"
                src="/moguwan_icon.png"
                alt="MoguFinder"
                sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
              <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 700 }}>
                MoguFinder
              </Typography>
            </Box>
            {step === 'voting' && (
              <IconButton
                onClick={() => startVoting()}
                sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
              >
                <RefreshIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        <MainContent>
          {step === 'join' && (
            <JoinScreen
              room={room}
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
              isLoadingRoom={isLoadingRoom}
            />
          )}

          {step === 'voting' && (
            <VoteScreen
              currentCard={currentCard}
              answeredCount={answeredCount}
              totalCards={totalCards}
              onVote={handleVote}
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
        </MainContent>

        <Snackbar
          open={statusMessage !== null}
          autoHideDuration={4000}
          onClose={() => setStatusMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setStatusMessage(null)} severity={statusMessage?.tone} sx={{ width: '100%' }}>
            {statusMessage?.text}
          </Alert>
        </Snackbar>
      </PhoneContainer>
    </AppContainer>
  );
}

interface JoinScreenProps {
  room: RoomSummary | null;
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
  isLoadingRoom: boolean;
}

function JoinScreen({
  room,
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
  isLoadingRoom,
}: JoinScreenProps) {
  if (isLoadingRoom) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!room) {
    return (
      <Alert severity="error">
        ルームが見つかりませんでした。URLが正しいか幹事に確認してください。
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
          {room.room_name}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ステータス: {room.status === 'waiting' ? '候補を準備中' : '投票受付中'}
          </Typography>
          <Box sx={{ mt: 1, height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', width: `${room.preparation.progress}%`, transition: 'width 0.3s' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {room.preparation.preparedCount}/{room.preparation.expectedCount} 件準備済み
          </Typography>
        </Box>
      </Paper>

      {room.status === 'waiting' && (
        <Alert severity="info">
          現在候補を準備中です。投票開始まで少しお待ちください。
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          参加方法を選択
        </Typography>

        <Box sx={{ mt: 3 }}>
          <FormControl fullWidth>
            <InputLabel>既存メンバーを選択</InputLabel>
            <Select
              value={selectedMemberId}
              onChange={(e) => onSelectMember(e.target.value)}
              label="既存メンバーを選択"
            >
              <MenuItem value="">未選択</MenuItem>
              {members.map((member) => (
                <MenuItem key={member.member_id} value={member.member_id}>
                  {member.member_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            fullWidth
            onClick={onJoinExisting}
            disabled={!selectedMemberId || isJoining}
            sx={{ mt: 2 }}
          >
            {isJoining ? '参加処理中…' : 'この名前で参加する'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            または 新しい名前で参加
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              value={newMemberName}
              onChange={(e) => onNewMemberNameChange(e.target.value)}
              placeholder="ユーザ名"
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={onJoinNew}
              disabled={isJoining || !newMemberName.trim()}
              sx={{ minWidth: 100 }}
            >
              {isJoining ? '登録中…' : '参加'}
            </Button>
          </Box>
        </Box>

        {session && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
            <Typography variant="body2" color="success.dark" gutterBottom>
              現在 <strong>{session.memberName}</strong> として参加中です。
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={onStartVoting}
                disabled={!canStartVoting}
                fullWidth
              >
                {canStartVoting ? 'カードを取得' : '準備中...'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={onLeaveSession}
                color="error"
              >
                終了
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

interface VoteScreenProps {
  currentCard: Restaurant | null;
  answeredCount: number;
  totalCards: number;
  onVote: (isLiked: boolean) => void;
  isSubmittingVote: boolean;
}

function VoteScreen({
  currentCard,
  answeredCount,
  totalCards,
  onVote,
  isSubmittingVote,
}: VoteScreenProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {currentCard ? (
        <>
          <SwipeArea currentIndex={answeredCount} totalCount={totalCards}>
            <RestaurantCard restaurant={currentCard} />
          </SwipeArea>
          <SwipeButtons
            onDislike={() => onVote(false)}
            onLike={() => onVote(true)}
            disabled={isSubmittingVote}
          />
          <MoguwanMascot summary={currentCard.summary_simple} />
        </>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          投票結果
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {roomName || 'ルーム名未設定'}
        </Typography>
        <Button variant="outlined" onClick={onRefreshRanking} sx={{ mt: 2 }} fullWidth>
          ランキングを更新
        </Button>
      </Paper>

      {ranking.length > 0 ? (
        ranking.map((item) => (
          <Paper key={item.place_id} elevation={2} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {item.rank}位
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  いいね {item.like_count} 件 • 良くないね {item.dislike_count} 件
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ★ {item.rating.toFixed(1)} / {item.user_ratings_total} 件のレビュー
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                score: {item.score.toFixed(1)}
              </Typography>
            </Box>
          </Paper>
        ))
      ) : (
        <Alert severity="info">
          まだランキングがありません。幹事が集計を再実行するまでお待ちください。
        </Alert>
      )}

      <Button variant="contained" onClick={onRestart} fullWidth sx={{ mt: 2 }}>
        もう一度カードを取得
      </Button>
    </Box>
  );
}
