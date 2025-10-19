import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { Member, RankingItem, Restaurant, RoomSummary } from '../../lib/types';
import { buttonMuted, buttonPrimary, buttonSecondary, panelClass } from '../../lib/ui';
import { RestaurantCard } from './components/RestaurantCard';
import { RestaurantDetailPanel } from './components/RestaurantDetailPanel';
import { useRestaurantDetail } from './hooks/useRestaurantDetail';

const DEFAULT_SETTINGS = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3.0,
  min_price_level: 0,
  max_price_level: 4,
};

type OrganizerScene = 'landing' | 'setup' | 'share' | 'cards' | 'ranking';
type StatusTone = 'info' | 'success' | 'error';

interface StatusState {
  tone: StatusTone;
  text: string;
}

export function DashboardView() {
  const [scene, setScene] = useState<OrganizerScene>('landing');
  const [roomName, setRoomName] = useState('飲み会@神田');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusState | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRefreshingRoom, setIsRefreshingRoom] = useState(false);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  const [isIssuingToken, setIsIssuingToken] = useState(false);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [isFetchingRanking, setIsFetchingRanking] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const {
    selectedPlaceId,
    detail: selectedDetail,
    reviews: selectedReviews,
    isLoading: isDetailLoading,
    error: detailError,
    loadDetail,
    reset: resetDetail,
  } = useRestaurantDetail();

  const roomCode = room?.room_code ?? null;
  const hasRoom = Boolean(roomCode);
  const hasMemberToken = Boolean(memberToken);

  useEffect(() => {
    if (!roomCode || room?.status !== 'waiting') return;
    const timer = window.setInterval(async () => {
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
        }
      } catch {
        // polling errors can be ignored
      }
    }, 2000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [roomCode, room?.status]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const showMessage = (tone: StatusTone, text: string) => {
    setStatusMessage({ tone, text });
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = window.setTimeout(() => setStatusMessage(null), 4000);
  };

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
        setMemberToken(null);
        setSelectedMemberId(null);
        await loadMembers({ roomCode: result.data.room_code, silent: true });
        setScene('share');
        showMessage('success', 'ルームを作成しました。共有画面で参加者を招待しましょう。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const refreshRoom = async () => {
    if (!roomCode) return;
    setIsRefreshingRoom(true);
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
        showMessage('info', 'ルーム情報を更新しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsRefreshingRoom(false);
    }
  };

  const loadMembers = async ({ roomCode: overrideRoomCode, silent = false }: { roomCode?: string; silent?: boolean } = {}) => {
    const targetRoomCode = overrideRoomCode ?? roomCode;
    if (!targetRoomCode) return;
    setIsRefreshingMembers(true);
    try {
      const result = await api<{ ok: boolean; data: Member[] }>(`/api/rooms/${targetRoomCode}/members`);
      if (result.ok) {
        setMembers(result.data);
        if (!selectedMemberId || !result.data.some((m) => m.member_id === selectedMemberId)) {
          setSelectedMemberId(result.data[0]?.member_id ?? null);
        }
        if (!silent) {
          showMessage('info', 'メンバー一覧を更新しました。');
        }
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsRefreshingMembers(false);
    }
  };

  const handleAddMember = async () => {
    const trimmed = memberName.trim();
    if (!roomCode) {
      showMessage('info', 'メンバー追加の前にルームを作成してください。');
      return;
    }
    if (!trimmed) {
      showMessage('info', '名前を入力してください。');
      return;
    }
    try {
      await api(`/api/rooms/${roomCode}/members`, {
        method: 'POST',
        body: JSON.stringify({ member_name: trimmed }),
      });
      setMemberName('');
      await loadMembers({ silent: true });
      showMessage('success', 'メンバーを追加しました。');
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const issueMemberSession = async () => {
    if (!roomCode || !selectedMemberId) {
      showMessage('info', '参加させたいメンバーを選択してください。');
      return;
    }
    setIsIssuingToken(true);
    try {
      const result = await api<{ ok: boolean; data: { member_token: string; expires_in: number } }>(
        `/api/rooms/${roomCode}/members/${selectedMemberId}/session`,
        { method: 'POST' },
      );
      if (result.ok) {
        setMemberToken(result.data.member_token);
        setScene('cards');
        showMessage('success', 'メンバー用の投票トークンを発行しました。カード画面に移動します。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsIssuingToken(false);
    }
  };

  const fetchRestaurants = async () => {
    if (!roomCode || !memberToken) {
      showMessage('info', 'カード取得にはメンバーとしてログインする必要があります。');
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
        if (result.data.items.length === 0) {
          showMessage('info', '表示できるカードがまだありません。候補の準備が完了するとここに表示されます。');
        } else {
          showMessage('success', '最新の候補カードを取得しました。');
        }
      }
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 425) {
        showMessage('info', '候補を準備中です。時間をおいて再取得してください。');
      } else {
        showMessage('error', err.message);
      }
    } finally {
      setIsFetchingCards(false);
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
    setIsFetchingRanking(true);
    try {
      const result = await api<{ ok: boolean; data: RankingItem[] }>(`/api/rooms/${roomCode}/ranking`);
      if (result.ok) {
        setRanking(result.data);
        showMessage('info', '最新のランキングを取得しました。');
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsFetchingRanking(false);
    }
  };

  const copyShareUrl = async () => {
    if (!room?.share_url) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('クリップボードに対応していません。手動でコピーしてください。');
      }
      await navigator.clipboard.writeText(room.share_url);
      showMessage('success', '共有URLをコピーしました。');
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  };

  const openShareUrl = () => {
    if (!room?.share_url) return;
    window.open(room.share_url, '_blank', 'noopener,noreferrer');
    showMessage('info', '別タブで共有URLを開きました。');
  };

  const handleNavigate = (next: OrganizerScene) => {
    if (next === scene) return;
    if (next === 'share' && !hasRoom) {
      showMessage('info', 'まずはルームを作成してください。');
      setScene('setup');
      return;
    }
    if (next === 'cards' && !hasMemberToken) {
      if (!hasRoom) {
        showMessage('info', 'カードを確認する前にルームを作成してください。');
        setScene('setup');
      } else {
        showMessage('info', '投票トークンを発行するとカードが取得できます。');
        setScene('share');
      }
      return;
    }
    if (next === 'ranking' && !hasRoom) {
      showMessage('info', 'まずはルームを作成してください。');
      setScene('setup');
      return;
    }
    setScene(next);
  };

  const beginFromLanding = () => {
    if (hasRoom) {
      setScene(hasMemberToken ? 'cards' : 'share');
    } else {
      setScene('setup');
    }
  };

  const updateSettings = (patch: Partial<typeof DEFAULT_SETTINGS>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      let min = Math.max(0, Math.min(4, next.min_price_level));
      let max = Math.max(0, Math.min(4, next.max_price_level));
      if (min > max) {
        if (patch.min_price_level !== undefined) {
          max = min;
        } else if (patch.max_price_level !== undefined) {
          min = max;
        } else {
          [min, max] = [Math.min(min, max), Math.max(min, max)];
        }
      }
      return { ...next, min_price_level: min, max_price_level: max };
    });
  };

  const radiusLabel = `${settings.radius.toFixed(1)} km`;
  const priceLabels = ['¥', '¥¥', '¥¥¥', '¥¥¥¥', '¥¥¥¥¥'];

  return (
    <div className="min-h-screen bg-[#FFF4C6] text-[#1D1B20] flex flex-col">
      <OrganizerHeader
        scene={scene}
        roomCode={roomCode}
        hasRoom={hasRoom}
        hasMemberToken={hasMemberToken}
        onNavigate={handleNavigate}
      />

      {statusMessage && (
        <StatusToast message={statusMessage} onClose={() => setStatusMessage(null)} />
      )}

      <main className="flex-1 w-full flex justify-center px-4 pb-24 pt-6">
        <div className="w-full max-w-[420px] space-y-8">
          {scene === 'landing' && <LandingScreen onStart={beginFromLanding} />}

          {scene === 'setup' && (
            <SetupScreen
              roomName={roomName}
              onRoomNameChange={setRoomName}
              settings={settings}
              onUpdateSettings={updateSettings}
              radiusLabel={radiusLabel}
              priceLabels={priceLabels}
              onCreateRoom={handleCreateRoom}
              isCreatingRoom={isCreatingRoom}
              hasRoom={hasRoom}
              room={room}
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
              onReloadMembers={loadMembers}
              onIssueToken={issueMemberSession}
              onCopyShareUrl={copyShareUrl}
              onOpenShareUrl={openShareUrl}
              onRefreshRoom={refreshRoom}
              isRefreshingMembers={isRefreshingMembers}
              isIssuingToken={isIssuingToken}
              isRefreshingRoom={isRefreshingRoom}
              hasMemberToken={hasMemberToken}
            />
          )}

          {scene === 'cards' && (
            <CardScreen
              restaurants={restaurants}
              onFetch={fetchRestaurants}
              onLike={(placeId) => sendVote(placeId, true)}
              onDislike={(placeId) => sendVote(placeId, false)}
              onDetail={loadDetail}
              isFetching={isFetchingCards}
              hasMemberToken={hasMemberToken}
            />
          )}

          {scene === 'ranking' && (
            <RankingScreen
              ranking={ranking}
              onRefresh={fetchRanking}
              isRefreshing={isFetchingRanking}
              roomName={room?.room_name ?? ''}
              members={members}
            />
          )}
        </div>
      </main>

      <OrganizerFooter />

      <RestaurantDetailPanel
        isOpen={Boolean(selectedPlaceId)}
        isLoading={isDetailLoading}
        error={detailError}
        detail={selectedDetail}
        reviews={selectedReviews}
        onClose={resetDetail}
      />
    </div>
  );
}

function OrganizerHeader({
  scene,
  roomCode,
  hasRoom,
  hasMemberToken,
  onNavigate,
}: {
  scene: OrganizerScene;
  roomCode: string | null;
  hasRoom: boolean;
  hasMemberToken: boolean;
  onNavigate: (scene: OrganizerScene) => void;
}) {
  const navItems: Array<{ id: OrganizerScene; label: string; enabled: boolean }> = [
    { id: 'landing', label: 'ホーム', enabled: true },
    { id: 'setup', label: 'グループ作成', enabled: true },
    { id: 'share', label: '共有', enabled: hasRoom },
    { id: 'cards', label: 'カード', enabled: hasMemberToken },
    { id: 'ranking', label: '結果', enabled: hasRoom },
  ];

  return (
    <header className="bg-[#FFF4C6] border-b border-[#FFD59A]/50">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center leading-none">
          <h1 className="text-[#EB8D00] text-[30px] font-bold">いー幹事？</h1>
          <span className="text-[#EB8D00] text-[15px] font-bold">i-kanji?</span>
        </div>
        {roomCode && (
          <div className="text-center text-[#EB8D00] text-xs font-bold">
            <p className="uppercase tracking-[0.2em]">ROOM CODE</p>
            <p className="mt-1 text-base tracking-[0.35em]">{roomCode}</p>
          </div>
        )}
        <nav className="flex flex-wrap justify-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-colors duration-150 ${
                item.id === scene
                  ? 'bg-[#EB8D00] text-white shadow-[0_6px_12px_rgba(235,141,0,0.3)]'
                  : 'bg-white/80 text-[#EB8D00] border border-[#EB8D00]/60 hover:bg-[#FFE7DF]'
              } ${
                item.enabled ? '' : 'cursor-not-allowed opacity-40 hover:bg-white/80'
              }`}
              onClick={() => item.enabled && onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function OrganizerFooter() {
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

function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-10 pb-16">
      <section className={`${panelClass} bg-[#FFF9E0] p-8 text-center`}>
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/eb44c09ee8d6349b97ce397a77fd2c1ca978695e?width=314"
            alt="サービスロゴ"
            className="h-[140px] w-[140px] rounded-full object-cover"
          />
          <h2 className="text-[#EB8D00] text-[30px] font-bold leading-tight">「ここどうかな？」の負担はもうない。</h2>
          <p className="text-base font-bold text-[#EB8D00] -mt-2">MoguMogu | モグモグ</p>
        </div>
        <p className="mt-8 text-[17px] leading-relaxed text-black">
          「いー幹事？」は、グループでのお店探しをぐっとラクにする無料サービスです。みんなでカードをめくりながら最強のお店を決めましょう。
        </p>
        <button type="button" className={`${buttonPrimary} mt-8 px-10 py-2 text-lg`} onClick={onStart}>
          はじめる
        </button>
      </section>

      <section className="space-y-6">
        <FeatureCard
          title="1番簡単な投票方法"
          caption="特徴その1"
          description={
            'スワイプによるYES / NO選択で、グループ全員の好みをスムーズに集められます。'
          }
        />
        <FeatureCard
          title="会員登録不要でかんたん利用"
          caption="特徴その2"
          description={'URLやQRコードを共有するだけで、誰でもすぐに参加できます。'}
        />
      </section>

      <section className={`${panelClass} bg-white p-6`}>
        <h3 className="text-[18px] font-bold text-center text-[#EB8D00]">1分でわかる「いー幹事？」の使い方</h3>
        <ol className="mt-6 space-y-5 text-left">
          <li className="rounded-[16px] bg-[#FFF4C6] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#EB8D00]">STEP 1</p>
            <h4 className="mt-1 text-lg font-bold text-black">グループを作成する</h4>
            <p className="mt-3 text-sm leading-relaxed text-[#333]">
              イベントのタイトルと探したいお店の条件を設定します。半径や価格帯で候補の雰囲気を調整できます。
            </p>
          </li>
          <li className="rounded-[16px] bg-[#FFF4C6] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#EB8D00]">STEP 2</p>
            <h4 className="mt-1 text-lg font-bold text-black">URLとQRで共有する</h4>
            <p className="mt-3 text-sm leading-relaxed text-[#333]">
              発行されたシェアURLを友だちに配りましょう。URLが届けば、誰でもすぐに投票に参加できます。
            </p>
          </li>
          <li className="rounded-[16px] bg-[#FFF4C6] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#EB8D00]">STEP 3</p>
            <h4 className="mt-1 text-lg font-bold text-black">カードをめくって投票</h4>
            <p className="mt-3 text-sm leading-relaxed text-[#333]">
              YES / NO の2択でテンポ良く評価。気になるお店は詳細から雰囲気を確認できます。
            </p>
          </li>
          <li className="rounded-[16px] bg-[#FFF4C6] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#EB8D00]">STEP 4</p>
            <h4 className="mt-1 text-lg font-bold text-black">みんなで結果をチェック</h4>
            <p className="mt-3 text-sm leading-relaxed text-[#333]">
              集まった投票からランキングを自動算出。上位のお店を押さえて、最高の会をつくりましょう。
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  caption,
  description,
}: {
  title: string;
  caption: string;
  description: string;
}) {
  return (
    <div className={`${panelClass} bg-[#FFE7DF] p-6 text-center`}>
      <p className="text-[#EB8D00] text-sm font-bold">{caption}</p>
      <h3 className="mt-2 text-lg font-bold text-black">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#4A4A4A]">{description}</p>
    </div>
  );
}

interface SetupScreenProps {
  roomName: string;
  onRoomNameChange: (value: string) => void;
  settings: typeof DEFAULT_SETTINGS;
  onUpdateSettings: (patch: Partial<typeof DEFAULT_SETTINGS>) => void;
  radiusLabel: string;
  priceLabels: string[];
  onCreateRoom: () => void;
  isCreatingRoom: boolean;
  hasRoom: boolean;
  room: RoomSummary | null;
}

function SetupScreen({
  roomName,
  onRoomNameChange,
  settings,
  onUpdateSettings,
  radiusLabel,
  priceLabels,
  onCreateRoom,
  isCreatingRoom,
  hasRoom,
  room,
}: SetupScreenProps) {
  const handleLatitudeChange = (value: string) => {
    const next = Number(value);
    if (!Number.isNaN(next)) {
      onUpdateSettings({ latitude: next });
    }
  };

  const handleLongitudeChange = (value: string) => {
    const next = Number(value);
    if (!Number.isNaN(next)) {
      onUpdateSettings({ longitude: next });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <section className={`${panelClass} bg-white p-6 space-y-6`}>
        <header className="text-center space-y-2">
          <h2 className="text-[20px] font-bold text-[#EB8D00]">グループ作成</h2>
          <p className="text-sm text-[#5D5D5D]">イベント名と検索条件を決めて候補の準備を始めましょう。</p>
        </header>

        <div className="space-y-4 text-left">
          <div>
            <label className="text-sm font-bold text-[#1D1B20]">グループ名</label>
            <div className="mt-2 border-b border-[#D9D9D9]">
              <input
                value={roomName}
                onChange={(event) => onRoomNameChange(event.target.value)}
                placeholder="JPHACK打ち上げ など"
                className="w-full bg-transparent px-1 py-2 text-lg font-bold text-[#1D1B20] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5D5D5D]">緯度</label>
              <input
                type="number"
                value={settings.latitude}
                onChange={(event) => handleLatitudeChange(event.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#D9D9D9] bg-[#FFF4C6] px-3 py-2 text-sm font-bold text-[#1D1B20]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5D5D5D]">経度</label>
              <input
                type="number"
                value={settings.longitude}
                onChange={(event) => handleLongitudeChange(event.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#D9D9D9] bg-[#FFF4C6] px-3 py-2 text-sm font-bold text-[#1D1B20]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#5D5D5D]">
              <span>検索半径</span>
              <span className="text-[#EB8D00] text-sm">{radiusLabel}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={settings.radius}
              onChange={(event) => onUpdateSettings({ radius: Number(event.target.value) })}
              className="mt-3 h-[6px] w-full cursor-pointer appearance-none rounded-full bg-[#FFD59A] accent-[#EB8D00]"
            />
            <div className="mt-2 flex justify-between text-[10px] text-[#5D5D5D]">
              <span>0.5km</span>
              <span>5.0km</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#5D5D5D]">価格帯</p>
            <div className="relative mt-4 h-[32px]">
              <div
                className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#FFA9A9]"
                style={{
                  left: `${(settings.min_price_level / 4) * 100}%`,
                  width: `${((settings.max_price_level - settings.min_price_level) / 4) * 100}%`,
                }}
              />
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={settings.min_price_level}
                onChange={(event) => onUpdateSettings({ min_price_level: Number(event.target.value) })}
                className="pointer-events-auto absolute left-0 top-0 h-[32px] w-full cursor-pointer appearance-none bg-transparent accent-white"
              />
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={settings.max_price_level}
                onChange={(event) => onUpdateSettings({ max_price_level: Number(event.target.value) })}
                className="pointer-events-auto absolute left-0 top-0 h-[32px] w-full cursor-pointer appearance-none bg-transparent accent-white"
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[#5D5D5D]">
              {priceLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`${buttonPrimary} w-full px-6 py-2 text-lg`}
          onClick={onCreateRoom}
          disabled={isCreatingRoom}
        >
          {isCreatingRoom ? '作成中…' : 'ルームを作成'}
        </button>

        {hasRoom && room && (
          <p className="rounded-[12px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
            すでに <strong>{room.room_name}</strong> のルームが作成されています。設定を変更したい場合は新しいルームを作成してください。
          </p>
        )}
      </section>
    </div>
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
  onReloadMembers: () => void;
  onIssueToken: () => void;
  onCopyShareUrl: () => void;
  onOpenShareUrl: () => void;
  onRefreshRoom: () => void;
  isRefreshingMembers: boolean;
  isIssuingToken: boolean;
  isRefreshingRoom: boolean;
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
  onReloadMembers,
  onIssueToken,
  onCopyShareUrl,
  onOpenShareUrl,
  onRefreshRoom,
  isRefreshingMembers,
  isIssuingToken,
  isRefreshingRoom,
  hasMemberToken,
}: ShareScreenProps) {
  const progress = room.preparation.progress;
  const memberNames = members.map((member) => member.member_name).join('・') || 'まだメンバーが登録されていません';

  return (
    <div className="space-y-6 pb-16">
      <section className={`${panelClass} bg-white p-6 space-y-4`}>
        <header className="text-center space-y-1">
          <h2 className="text-[20px] font-bold text-[#EB8D00]">共有リンク</h2>
          <p className="text-sm text-[#5D5D5D]">URLを配ってメンバーを呼び込みましょう。QRコードにも対応しています。</p>
        </header>
        <div className="rounded-[14px] bg-[#FFF4C6] p-4 text-left text-sm text-[#1D1B20]">
          <p className="font-bold text-[#EB8D00]">{room.room_name}</p>
          <p className="mt-2 break-all text-[#333]">{room.share_url}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className={`${buttonSecondary} px-4 py-1.5 text-sm`} onClick={onCopyShareUrl}>
            コピー
          </button>
          <button type="button" className={`${buttonMuted} px-4 py-1.5 text-sm`} onClick={onOpenShareUrl}>
            ブラウザで開く
          </button>
          <button
            type="button"
            className={`${buttonMuted} px-4 py-1.5 text-sm`}
            onClick={onRefreshRoom}
            disabled={isRefreshingRoom}
          >
            {isRefreshingRoom ? '更新中…' : 'ルーム更新'}
          </button>
        </div>
        <div>
          <p className="text-xs font-bold text-[#5D5D5D]">準備状況</p>
          <div className="mt-2 h-2 w-full rounded-full bg-[#FFE7DF]">
            <div className="h-full rounded-full bg-[#EB8D00]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#5D5D5D]">
            {room.preparation.preparedCount}/{room.preparation.expectedCount} 件の候補を準備中です。
          </p>
        </div>
      </section>

      <section className={`${panelClass} bg-white p-6 space-y-5`}>
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-[#EB8D00]">メンバー管理</h3>
            <p className="text-xs text-[#5D5D5D]">登録済み: {memberNames}</p>
          </div>
          <button
            type="button"
            className={`${buttonMuted} px-3 py-1 text-xs`}
            onClick={onReloadMembers}
            disabled={isRefreshingMembers}
          >
            {isRefreshingMembers ? '更新中…' : '再取得'}
          </button>
        </header>

        <div className="rounded-[16px] bg-[#FFF4C6] p-4">
          <label className="text-xs font-bold text-[#5D5D5D]">メンバーを追加</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              value={memberName}
              onChange={(event) => onMemberNameChange(event.target.value)}
              placeholder="名前を入力"
              className="flex-1 rounded-[10px] border border-[#D9D9D9] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              className={`${buttonPrimary} px-4 py-2 text-sm`}
              onClick={onAddMember}
              disabled={!memberName.trim()}
            >
              追加
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[#5D5D5D]">参加するメンバーを選択</p>
          <div className="space-y-2">
            <label
              className={`flex items-center justify-between rounded-[14px] border px-4 py-2 text-sm ${
                !selectedMemberId ? 'border-[#EB8D00] bg-[#FFF4C6] text-[#EB8D00]' : 'border-[#E4E4E4] bg-white text-[#333]'
              }`}
            >
              <span>未選択</span>
              <input type="radio" name="selected-member" checked={!selectedMemberId} onChange={() => onSelectMember(null)} />
            </label>
            {members.map((member) => {
              const checked = selectedMemberId === member.member_id;
              return (
                <label
                  key={member.member_id}
                  className={`flex items-center justify-between rounded-[14px] border px-4 py-2 text-sm ${
                    checked ? 'border-[#EB8D00] bg-[#FFF4C6] text-[#EB8D00]' : 'border-[#E4E4E4] bg-white text-[#333]'
                  }`}
                >
                  <span>{member.member_name}</span>
                  <input
                    type="radio"
                    name="selected-member"
                    checked={checked}
                    onChange={() => onSelectMember(member.member_id)}
                  />
                </label>
              );
            })}
            {members.length === 0 && (
              <p className="rounded-[12px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
                まだメンバーが登録されていません。先に追加してから投票トークンを発行してください。
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          className={`${buttonSecondary} w-full px-6 py-2 text-lg`}
          onClick={onIssueToken}
          disabled={!selectedMemberId || isIssuingToken}
        >
          {isIssuingToken ? '発行中…' : '投票トークンを発行'}
        </button>

        {hasMemberToken && (
          <p className="rounded-[12px] bg-[#E8F8ED] px-4 py-3 text-xs text-[#0F7A39]">
            このブラウザにメンバートークンが保存されました。カード画面から投票を体験できます。
          </p>
        )}
      </section>
    </div>
  );
}

interface CardScreenProps {
  restaurants: Restaurant[];
  onFetch: () => void;
  onLike: (placeId: string) => void;
  onDislike: (placeId: string) => void;
  onDetail: (placeId: string) => void;
  isFetching: boolean;
  hasMemberToken: boolean;
}

function CardScreen({
  restaurants,
  onFetch,
  onLike,
  onDislike,
  onDetail,
  isFetching,
  hasMemberToken,
}: CardScreenProps) {
  return (
    <div className="space-y-6 pb-16">
      <section className={`${panelClass} bg-white p-6 space-y-4`}>
        <header className="text-center space-y-1">
          <h2 className="text-[20px] font-bold text-[#EB8D00]">候補カード</h2>
          <p className="text-sm text-[#5D5D5D]">YES / NO で評価しながら、みんなの好みを集めましょう。</p>
        </header>
        <button
          type="button"
          className={`${buttonPrimary} w-full px-6 py-2 text-lg`}
          onClick={onFetch}
          disabled={isFetching || !hasMemberToken}
        >
          {isFetching ? '取得中…' : 'カードを取得'}
        </button>
        {!hasMemberToken && (
          <p className="rounded-[12px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
            先にメンバーとして参加してトークンを発行するとカードを取得できます。
          </p>
        )}
      </section>

      <div className="space-y-6">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.place_id}
            restaurant={restaurant}
            onLike={onLike}
            onDislike={onDislike}
            onDetail={onDetail}
          />
        ))}
        {restaurants.length === 0 && (
          <p className="rounded-[16px] bg-white px-6 py-8 text-center text-sm text-[#5D5D5D] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            カードがまだ表示されていません。候補の準備が完了するまで少しお待ちください。
          </p>
        )}
      </div>
    </div>
  );
}

interface RankingScreenProps {
  ranking: RankingItem[];
  onRefresh: () => void;
  isRefreshing: boolean;
  roomName: string;
  members: Member[];
}

function RankingScreen({ ranking, onRefresh, isRefreshing, roomName, members }: RankingScreenProps) {
  return (
    <div className="space-y-6 pb-16">
      <section className={`${panelClass} bg-white p-6 space-y-5`}>
        <header className="space-y-2 text-left">
          <h2 className="text-[20px] font-bold text-[#EB8D00]">最終候補</h2>
          <p className="text-sm font-bold text-[#1D1B20]">{roomName || 'グループ未指定'}</p>
          <p className="text-xs text-[#5D5D5D]">投票済みメンバー: {members.map((m) => m.member_name).join('・') || '未登録'}</p>
        </header>
        <button
          type="button"
          className={`${buttonSecondary} w-full px-6 py-2 text-sm`}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '更新中…' : 'ランキングを更新'}
        </button>
      </section>

      <section className="space-y-4">
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
          <p className="rounded-[16px] bg-white px-6 py-8 text-center text-sm text-[#5D5D5D] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            まだランキングがありません。投票が集まるとここに結果が表示されます。
          </p>
        )}
      </section>
    </div>
  );
}
