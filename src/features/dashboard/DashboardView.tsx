import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import AppContainer from '../../layout/AppContainer';
import PhoneContainer from '../../layout/PhoneContainer';
import MainContent from '../../layout/MainContent';
import RestaurantCard from '../../components/RestaurantCard';
import SwipeArea from '../../components/SwipeArea';
import SwipeButtons from '../../components/SwipeButtons';

const DEFAULT_SETTINGS = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3.0,
  min_price_level: 0,
  max_price_level: 4,
};

type OrganizerScene = 'setup' | 'share' | 'voting' | 'ranking';
type StatusTone = 'info' | 'success' | 'error';

interface StatusState {
  tone: StatusTone;
  text: string;
}

export function DashboardView() {
  const [scene, setScene] = useState<OrganizerScene>('setup');
  const [roomName, setRoomName] = useState('飲み会@神田');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusState | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRefreshingRoom, setIsRefreshingRoom] = useState(false);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [isFetchingRanking, setIsFetchingRanking] = useState(false);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const roomCode = room?.room_code;
  const currentCard = restaurants[currentCardIndex] ?? null;

  const showMessage = (tone: StatusTone, text: string) => {
    setStatusMessage({ tone, text });
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = window.setTimeout(() => setStatusMessage(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (room?.status !== 'waiting') return;
    const timer = window.setInterval(async () => {
      if (!roomCode) return;
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

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      showMessage('error', 'ルーム名を入力してください。');
      return;
    }
    setIsCreatingRoom(true);
    try {
      const result = await api<{ ok: boolean; data: RoomSummary }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ room_name: roomName.trim(), settings }),
      });
      if (result.ok) {
        setRoom(result.data);
        setMembers([]);
        setSelectedMemberId(null);
        await loadMembers(result.data.room_code);
        setScene('share');
        showMessage('success', 'ルームを作成しました。共有画面で参加者を招待しましょう。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const loadMembers = async (code: string) => {
    setIsRefreshingMembers(true);
    try {
      const result = await api<{ ok: boolean; data: Member[] }>(`/api/rooms/${code}/members`);
      if (result.ok) {
        setMembers(result.data);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsRefreshingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!roomCode || !memberName.trim()) {
      showMessage('error', 'メンバー名を入力してください。');
      return;
    }
    try {
      const result = await api<{ ok: boolean; data: Member }>(`/api/rooms/${roomCode}/members`, {
        method: 'POST',
        body: JSON.stringify({ member_name: memberName.trim() }),
      });
      if (result.ok) {
        setMembers((prev) => [...prev, result.data]);
        setMemberName('');
        showMessage('success', `${result.data.member_name} を追加しました。`);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const issueToken = async () => {
    if (!roomCode || !selectedMemberId) {
      showMessage('error', 'メンバーを選択してください。');
      return;
    }
    try {
      const result = await api<{ ok: boolean; data: { member_token: string } }>(
        `/api/rooms/${roomCode}/members/${selectedMemberId}/session`,
        { method: 'POST' },
      );
      if (result.ok) {
        setMemberToken(result.data.member_token);
        setActiveMemberId(selectedMemberId);
        showMessage('success', '投票トークンを発行しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const fetchRestaurants = async () => {
    if (!roomCode || !memberToken) {
      showMessage('error', '先にメンバーを選択してトークンを発行してください。');
      return;
    }
    setIsFetchingCards(true);
    try {
      const result = await api<{ ok: boolean; data: { items: Restaurant[] } }>(
        `/api/rooms/${roomCode}/restaurants`,
        { headers: { Authorization: `Bearer ${memberToken}` } },
      );
      if (result.ok) {
        setRestaurants(result.data.items);
        setCurrentCardIndex(0);
        if (result.data.items.length > 0) {
          setScene('voting');
          showMessage('info', 'カードを取得しました。評価を開始してください。');
        } else {
          showMessage('info', '表示できるカードがありません。');
        }
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsFetchingCards(false);
    }
  };

  const handleVote = async (isLiked: boolean) => {
    if (!roomCode || !memberToken || !currentCard) return;
    try {
      await api(`/api/rooms/${roomCode}/likes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ place_id: currentCard.place_id, is_liked: isLiked }),
      });
      if (currentCardIndex < restaurants.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        showMessage('success', 'すべてのカードを評価しました。');
        setScene('ranking');
        await fetchRanking();
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const fetchRanking = async () => {
    if (!roomCode) return;
    setIsFetchingRanking(true);
    try {
      const result = await api<{ ok: boolean; data: RankingItem[] }>(`/api/rooms/${roomCode}/ranking`);
      if (result.ok) {
        setRanking(result.data);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsFetchingRanking(false);
    }
  };

  const copyShareUrl = () => {
    if (room?.share_url) {
      navigator.clipboard.writeText(room.share_url);
      showMessage('success', '共有URLをコピーしました。');
    }
  };

  const refreshRoom = async () => {
    if (!roomCode) return;
    setIsRefreshingRoom(true);
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
        showMessage('info', 'ルーム情報を更新しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsRefreshingRoom(false);
    }
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
                MoguFinder - 幹事
              </Typography>
            </Box>
          </Toolbar>
          {room && (
            <Tabs
              value={scene}
              onChange={(_, newValue) => setScene(newValue)}
              sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Tab label="共有" value="share" />
              <Tab label="投票" value="voting" />
              <Tab label="結果" value="ranking" />
            </Tabs>
          )}
        </AppBar>

        <MainContent>
          {scene === 'setup' && (
            <SetupScreen
              roomName={roomName}
              onRoomNameChange={setRoomName}
              settings={settings}
              onSettingsChange={setSettings}
              onCreateRoom={handleCreateRoom}
              isCreating={isCreatingRoom}
            />
          )}

          {scene === 'share' && room && (
            <ShareScreen
              room={room}
              members={members}
              memberName={memberName}
              selectedMemberId={selectedMemberId}
              onMemberNameChange={setMemberName}
              onSelectMember={setSelectedMemberId}
              onAddMember={handleAddMember}
              onIssueToken={issueToken}
              onCopyShareUrl={copyShareUrl}
              onRefreshRoom={refreshRoom}
              onRefreshMembers={() => loadMembers(room.room_code)}
              isRefreshingRoom={isRefreshingRoom}
              isRefreshingMembers={isRefreshingMembers}
              hasMemberToken={!!memberToken}
            />
          )}

          {scene === 'voting' && (
            <VotingScreen
              currentCard={currentCard}
              currentIndex={currentCardIndex}
              totalCards={restaurants.length}
              onVote={handleVote}
              onFetchCards={fetchRestaurants}
              isFetching={isFetchingCards}
              hasMemberToken={!!memberToken}
            />
          )}

          {scene === 'ranking' && (
            <RankingScreen
              ranking={ranking}
              onRefresh={fetchRanking}
              isRefreshing={isFetchingRanking}
              roomName={room?.room_name ?? ''}
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

interface SetupScreenProps {
  roomName: string;
  onRoomNameChange: (value: string) => void;
  settings: typeof DEFAULT_SETTINGS;
  onSettingsChange: (settings: typeof DEFAULT_SETTINGS) => void;
  onCreateRoom: () => void;
  isCreating: boolean;
}

function SetupScreen({
  roomName,
  onRoomNameChange,
  settings,
  onSettingsChange,
  onCreateRoom,
  isCreating,
}: SetupScreenProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
          新しいルームを作成
        </Typography>

        <Box sx={{ mt: 3 }}>
          <TextField
            label="ルーム名"
            value={roomName}
            onChange={(e) => onRoomNameChange(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="緯度"
            type="number"
            value={settings.latitude}
            onChange={(e) => onSettingsChange({ ...settings, latitude: parseFloat(e.target.value) })}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="経度"
            type="number"
            value={settings.longitude}
            onChange={(e) => onSettingsChange({ ...settings, longitude: parseFloat(e.target.value) })}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="検索半径 (km)"
            type="number"
            value={settings.radius}
            onChange={(e) => onSettingsChange({ ...settings, radius: parseFloat(e.target.value) })}
            fullWidth
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>最小価格帯</InputLabel>
            <Select
              value={settings.min_price_level}
              onChange={(e) => onSettingsChange({ ...settings, min_price_level: e.target.value as number })}
              label="最小価格帯"
            >
              <MenuItem value={0}>0 (安い)</MenuItem>
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4 (高い)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>最大価格帯</InputLabel>
            <Select
              value={settings.max_price_level}
              onChange={(e) => onSettingsChange({ ...settings, max_price_level: e.target.value as number })}
              label="最大価格帯"
            >
              <MenuItem value={0}>0 (安い)</MenuItem>
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4 (高い)</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            fullWidth
            onClick={onCreateRoom}
            disabled={isCreating || !roomName.trim()}
            size="large"
          >
            {isCreating ? 'ルーム作成中...' : 'ルームを作成'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

interface ShareScreenProps {
  room: RoomSummary;
  members: Member[];
  memberName: string;
  selectedMemberId: string | null;
  onMemberNameChange: (value: string) => void;
  onSelectMember: (value: string | null) => void;
  onAddMember: () => void;
  onIssueToken: () => void;
  onCopyShareUrl: () => void;
  onRefreshRoom: () => void;
  onRefreshMembers: () => void;
  isRefreshingRoom: boolean;
  isRefreshingMembers: boolean;
  hasMemberToken: boolean;
}

function ShareScreen({
  room,
  members,
  memberName,
  selectedMemberId,
  onMemberNameChange,
  onSelectMember,
  onAddMember,
  onIssueToken,
  onCopyShareUrl,
  onRefreshRoom,
  onRefreshMembers,
  isRefreshingRoom,
  isRefreshingMembers,
  hasMemberToken,
}: ShareScreenProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
          {room.room_name}
        </Typography>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {room.share_url}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={onCopyShareUrl}
            fullWidth
            sx={{ mt: 1 }}
          >
            URLをコピー
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ステータス: {room.status === 'waiting' ? '候補を準備中' : '投票受付中'}
          </Typography>
          <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', width: `${room.preparation.progress}%`, transition: 'width 0.3s' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {room.preparation.preparedCount}/{room.preparation.expectedCount} 件準備済み
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefreshRoom}
          disabled={isRefreshingRoom}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isRefreshingRoom ? '更新中...' : 'ルーム情報更新'}
        </Button>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          メンバー管理
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            value={memberName}
            onChange={(e) => onMemberNameChange(e.target.value)}
            placeholder="メンバー名"
            fullWidth
          />
          <Button variant="contained" onClick={onAddMember} sx={{ minWidth: 100 }}>
            追加
          </Button>
        </Box>

        <Button
          variant="outlined"
          onClick={onRefreshMembers}
          disabled={isRefreshingMembers}
          fullWidth
          size="small"
        >
          {isRefreshingMembers ? '更新中...' : 'メンバー一覧を更新'}
        </Button>

        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>投票用メンバーを選択</InputLabel>
            <Select
              value={selectedMemberId ?? ''}
              onChange={(e) => onSelectMember(e.target.value || null)}
              label="投票用メンバーを選択"
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
            onClick={onIssueToken}
            disabled={!selectedMemberId}
            fullWidth
            sx={{ mt: 2 }}
          >
            投票トークンを発行
          </Button>

          {hasMemberToken && (
            <Alert severity="success" sx={{ mt: 2 }}>
              トークンを発行しました。投票タブからカードを取得できます。
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

interface VotingScreenProps {
  currentCard: Restaurant | null;
  currentIndex: number;
  totalCards: number;
  onVote: (isLiked: boolean) => void;
  onFetchCards: () => void;
  isFetching: boolean;
  hasMemberToken: boolean;
}

function VotingScreen({
  currentCard,
  currentIndex,
  totalCards,
  onVote,
  onFetchCards,
  isFetching,
  hasMemberToken,
}: VotingScreenProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {!hasMemberToken && (
        <Alert severity="warning">
          まずは共有タブでメンバーを選択して投票トークンを発行してください。
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={onFetchCards}
        disabled={isFetching || !hasMemberToken}
        fullWidth
        size="large"
      >
        {isFetching ? 'カードを読み込み中...' : '最新のカードを取得'}
      </Button>

      {currentCard ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SwipeArea currentIndex={currentIndex} totalCount={totalCards}>
            <RestaurantCard restaurant={currentCard} />
          </SwipeArea>
          <SwipeButtons
            onDislike={() => onVote(false)}
            onLike={() => onVote(true)}
          />
        </Box>
      ) : totalCards > 0 ? (
        <Alert severity="info">
          すべてのカードを評価しました。
        </Alert>
      ) : null}
    </Box>
  );
}

interface RankingScreenProps {
  ranking: RankingItem[];
  onRefresh: () => void;
  isRefreshing: boolean;
  roomName: string;
}

function RankingScreen({ ranking, onRefresh, isRefreshing, roomName }: RankingScreenProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          投票結果
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {roomName || 'ルーム名未設定'}
        </Typography>
        <Button
          variant="outlined"
          onClick={onRefresh}
          disabled={isRefreshing}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isRefreshing ? '更新中...' : 'ランキングを更新'}
        </Button>
      </Paper>

      {ranking.length > 0 ? (
        ranking.map((item) => (
          <Card key={item.place_id} elevation={2}>
            <CardContent>
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
            </CardContent>
          </Card>
        ))
      ) : (
        <Alert severity="info">
          まだランキングがありません。
        </Alert>
      )}
    </Box>
  );
}
