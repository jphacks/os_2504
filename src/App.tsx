import { useEffect, useMemo, useState } from 'react';

type RoomStatus = 'waiting' | 'voting';

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

async function api<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return (await res.json()) as T;
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roomCode = room?.room_code ?? null;

  const step = useMemo(() => {
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
          // ignore errors during polling
        }
      }, 1500);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [room]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await api<{ ok: boolean; data: RoomSummary }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ room_name: roomName, settings }),
      });
      if (result.ok) {
        setRoom(result.data);
        setStatusMessage('ルームを作成しました。準備完了までお待ちください。');
      }
    } catch (error) {
      setStatusMessage((error as Error).message);
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
      }
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  const loadMembers = async () => {
    if (!roomCode) return;
    const result = await api<{ ok: boolean; data: Member[] }>(`/api/rooms/${roomCode}/members`);
    if (result.ok) {
      setMembers(result.data);
      if (!selectedMemberId && result.data.length > 0) {
        setSelectedMemberId(result.data[0].member_id);
      }
    }
  };

  const handleAddMember = async () => {
    if (!roomCode || !memberName.trim()) return;
    await api(`/api/rooms/${roomCode}/members`, {
      method: 'POST',
      body: JSON.stringify({ member_name: memberName }),
    });
    setMemberName('');
    await loadMembers();
  };

  const issueMemberSession = async () => {
    if (!roomCode || !selectedMemberId) return;
    const result = await api<{ ok: boolean; data: { member_token: string; expires_in: number } }>(
      `/api/rooms/${roomCode}/members/${selectedMemberId}/session`,
      { method: 'POST' },
    );
    if (result.ok) {
      setMemberToken(result.data.member_token);
      setStatusMessage('メンバートークンを発行しました。');
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
      if (result.ok) setRestaurants(result.data.items);
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  const sendVote = async (placeId: string, isLiked: boolean) => {
    if (!roomCode || !memberToken) return;
    await api(`/api/rooms/${roomCode}/likes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ place_id: placeId, is_liked: isLiked }),
    });
  };

  const fetchRanking = async () => {
    if (!roomCode) return;
    const result = await api<{ ok: boolean; data: RankingItem[] }>(`/api/rooms/${roomCode}/ranking`);
    if (result.ok) setRanking(result.data);
  };

  const RoomCreateForm = (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h2 className="text-xl font-semibold">ルーム作成</h2>
      <label className="block space-y-1">
        <span className="text-sm text-slate-300">ルーム名</span>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-sm text-slate-300">緯度</span>
          <input
            type="number"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            value={settings.latitude}
            onChange={(e) => setSettings((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-300">経度</span>
          <input
            type="number"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            value={settings.longitude}
            onChange={(e) => setSettings((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-300">検索半径 (km)</span>
          <input
            type="number"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            value={settings.radius}
            onChange={(e) => setSettings((prev) => ({ ...prev, radius: Number(e.target.value) }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-300">価格帯 (0-4)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
              value={settings.min_price_level}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, min_price_level: Number(e.target.value) }))
              }
            />
            <span className="text-slate-400">〜</span>
            <input
              type="number"
              min={0}
              max={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
              value={settings.max_price_level}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, max_price_level: Number(e.target.value) }))
              }
            />
          </div>
        </label>
      </div>
      <button
        className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        onClick={handleCreateRoom}
        disabled={isLoading}
      >
        {isLoading ? '作成中…' : 'ルームを作成'}
      </button>
    </section>
  );

  const RoomStatusPanel = room && (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">ルーム情報</h2>
        <button
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          onClick={refreshRoom}
        >
          状態更新
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-400">ルームコード</dt>
          <dd className="font-mono text-lg">{room.room_code}</dd>
        </div>
        <div>
          <dt className="text-slate-400">ステータス</dt>
          <dd className="font-medium">
            {room.status === 'waiting' ? '準備中' : '投票受付中'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">共有URL</dt>
          <dd className="truncate text-blue-400">{room.share_url}</dd>
        </div>
        <div>
          <dt className="text-slate-400">準備進捗</dt>
          <dd>{room.preparation.progress}%</dd>
        </div>
      </dl>
    </section>
  );

  const MembersPanel = room && (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">メンバー管理</h2>
        <button
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          onClick={loadMembers}
        >
          メンバー再取得
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="grow space-y-1">
          <span className="text-sm text-slate-300">メンバー名を追加</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
        </label>
        <button
          className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
          onClick={handleAddMember}
          disabled={!memberName.trim()}
        >
          追加
        </button>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-300">投票するメンバー</label>
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
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
        <button
          className="rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          onClick={issueMemberSession}
          disabled={!selectedMemberId}
        >
          トークン発行
        </button>
      </div>
      {memberToken && (
        <p className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
          メンバー用トークンを取得済みです。ブラウザ内で保持されます。
        </p>
      )}
    </section>
  );

  const RestaurantsPanel = room && memberToken && (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">投票カード</h2>
        <button
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          onClick={fetchRestaurants}
        >
          カード取得
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {restaurants.map((r) => (
          <article key={r.place_id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <h3 className="text-lg font-semibold">{r.name}</h3>
              <p className="text-sm text-slate-300">{r.summary_simple}</p>
            </div>
            {r.photo_urls[0] && (
              <img
                src={r.photo_urls[0]}
                alt={r.name}
                className="h-32 w-full rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>★ {r.rating.toFixed(1)}</span>
              <span>{r.user_ratings_total} 件</span>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => sendVote(r.place_id, false)}
              >
                良くないね
              </button>
              <button
                className="flex-1 rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-500"
                onClick={() => sendVote(r.place_id, true)}
              >
                いいね
              </button>
            </div>
          </article>
        ))}
        {restaurants.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-300">
            カードがまだありません。投票を開始するには「カード取得」を押してください。
          </p>
        )}
      </div>
    </section>
  );

  const RankingPanel = room && (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">ランキング</h2>
        <button
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          onClick={fetchRanking}
        >
          更新
        </button>
      </div>
      <ol className="space-y-2">
        {ranking.map((item) => (
          <li key={item.place_id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-pink-400">#{item.rank}</span>
              <span className="text-sm text-slate-400">スコア {item.score}</span>
            </div>
            <div className="mt-2 text-lg font-semibold">{item.name}</div>
            <div className="text-sm text-slate-400">
              いいね: {item.like_count} / 良くないね: {item.dislike_count}
            </div>
            <div className="text-sm text-slate-500">口コミ {item.user_ratings_total} 件・★ {item.rating.toFixed(1)}</div>
          </li>
        ))}
        {ranking.length === 0 && <li className="text-sm text-slate-400">まだランキングがありません。</li>}
      </ol>
    </section>
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 bg-slate-950 p-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">MogFinder プロトタイプ</h1>
        <p className="text-sm text-slate-400">
          データベース導入前にフロントとバックエンドのコアフローを確認するためのモック実装です。
        </p>
      </header>

      {statusMessage && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
          {statusMessage}
        </div>
      )}

      {step === 'create' && RoomCreateForm}

      {room && (
        <>
          {RoomStatusPanel}
          {MembersPanel}
          {RestaurantsPanel}
          {RankingPanel}
        </>
      )}
    </main>
  );
}
