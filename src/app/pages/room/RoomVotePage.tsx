import { useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useParams, useSearchParams } from 'react-router-dom'

import AppHeader from '../../components/AppHeader'
import AppContainer from '../../../layout/AppContainer'
import PhoneContainer from '../../../layout/PhoneContainer'
import RestaurantCard from '../../../components/RestaurantCard'
import SwipeArea from '../../../components/SwipeArea'
import SwipeButtons from '../../../components/SwipeButtons'
import { getRoomMemberId, saveRoomMemberId, getRoomProgress, saveRoomProgress } from '../../../utils/groupUtils'
import type { Restaurant } from '../../../lib/types'

interface Coordinates {
  latitude: number
  longitude: number
}

interface RoomInfo {
  room_name: string
  status: string
  share_url: string
  preparation: {
    started: boolean
    progress: number
    preparedCount: number
    expectedCount: number
  }
}

interface Member {
  member_id: string
  member_name: string
}

interface RankingItem {
  place_id: string
  name: string
  score: number
  like_count: number
  dislike_count: number
  rating: number | null
  user_ratings_total: number | null
  google_maps_url: string | null
  rank: number
}

const RoomVotePage = (): ReactElement => {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [memberId, setMemberId] = useState<string | null>(searchParams.get('memberId'))
  const [memberToken, setMemberToken] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [candidates, setCandidates] = useState<Restaurant[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<RankingItem[]>([])
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Load memberId from localStorage if available
  useEffect(() => {
    if (!roomCode) {
      return
    }

    if (!memberId) {
      const stored = getRoomMemberId(roomCode)
      if (stored) {
        setMemberId(stored)
        const next = new URLSearchParams(searchParams)
        next.set('memberId', stored)
        setSearchParams(next, { replace: true })
      }
      return
    }

    saveRoomMemberId(roomCode, memberId)

    if (searchParams.get('memberId') !== memberId) {
      const next = new URLSearchParams(searchParams)
      next.set('memberId', memberId)
      setSearchParams(next, { replace: true })
    }
  }, [roomCode, memberId, searchParams, setSearchParams])

  // Load room data
  useEffect(() => {
    if (!roomCode || !memberId) {
      return
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setInfoMessage(null)

      try {
        // Get room info
        const roomResponse = await fetch(`/api/rooms/${roomCode}`)
        if (!roomResponse.ok) {
          throw new Error('Room not found')
        }
        const roomResult = await roomResponse.json()
        setRoomInfo(roomResult.data)

        // Get members
        const membersResponse = await fetch(`/api/rooms/${roomCode}/members`)
        if (membersResponse.ok) {
          const membersResult = await membersResponse.json()
          setMembers(membersResult.data)
        }

        // Get member token
        const sessionResponse = await fetch(`/api/rooms/${roomCode}/members/${memberId}/session`, {
          method: 'POST',
        })
        if (sessionResponse.ok) {
          const sessionResult = await sessionResponse.json()
          setMemberToken(sessionResult.data.member_token)

          // Get restaurants if room is in voting state
          if (roomResult.data.status === 'voting') {
            const restaurantsResponse = await fetch(`/api/rooms/${roomCode}/restaurants`)
            if (restaurantsResponse.ok) {
              const restaurantsResult = await restaurantsResponse.json()
              setCandidates(restaurantsResult.data.items || [])

              // Restore progress from localStorage
              const storedProgress = getRoomProgress(roomCode, memberId)
              if (storedProgress != null && storedProgress < (restaurantsResult.data.items || []).length) {
                setCurrentIndex(storedProgress)
              } else {
                setCurrentIndex(0)
              }
            }
          }
        }
      } catch (err) {
        console.error(err)
        setError('ルーム情報の取得に失敗しました。リンクを再度確認してください。')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [roomCode, memberId])

  const currentRestaurant = useMemo(() => {
    if (currentIndex >= candidates.length) {
      return null
    }
    return candidates[currentIndex]
  }, [currentIndex, candidates])

  const hasCompletedVoting = currentIndex >= candidates.length && candidates.length > 0

  const handleJoin = async () => {
    if (!roomCode || !nameInput.trim()) {
      setError('ニックネームを入力してください。')
      return
    }

    try {
      const response = await fetch(`/api/rooms/${roomCode}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_name: nameInput.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to join room')
      }

      const result = await response.json()
      const newMemberId = result.data.member_id
      setMemberId(newMemberId)
      saveRoomMemberId(roomCode, newMemberId)
      const next = new URLSearchParams(searchParams)
      next.set('memberId', newMemberId)
      setSearchParams(next, { replace: true })
    } catch (err) {
      console.error(err)
      setError('参加に失敗しました。時間をおいて再度お試しください。')
    }
  }

  const handleVote = async (isLiked: boolean) => {
    if (!roomCode || !memberId || !memberToken || !currentRestaurant) {
      return
    }

    try {
      setError(null)
      setInfoMessage(null)
      const response = await fetch(`/api/rooms/${roomCode}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          place_id: currentRestaurant.place_id,
          is_liked: isLiked,
        }),
      })

      if (!response.ok) {
        throw new Error('Vote failed')
      }

      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      // Save progress to localStorage
      saveRoomProgress(roomCode, memberId, nextIndex)
    } catch (err) {
      console.error(err)
      setError('投票に失敗しました。時間をおいて再度お試しください。')
    }
  }

  const handleFetchResults = async () => {
    if (!roomCode) {
      return
    }
    setError(null)
    setInfoMessage(null)

    try {
      const response = await fetch(`/api/rooms/${roomCode}/ranking`)
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const result = await response.json()
      setResults(result.data.ranking || [])
    } catch (err) {
      console.error(err)
      setError('結果を取得できませんでした。')
    }
  }

  if (!roomCode) {
    return (
      <AppContainer>
        <PhoneContainer>
          <Box
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: 3,
            }}
          >
            <Alert severity="error">ルームコードが指定されていません。</Alert>
          </Box>
        </PhoneContainer>
      </AppContainer>
    )
  }

  if (!memberId) {
    return (
      <AppContainer>
        <PhoneContainer>
          <AppHeader title="グループへ参加" />
          <Box
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: 3,
            }}
          >
            <Stack spacing={2}>
              <Typography>まずはニックネームを入力して参加してください。</Typography>
              <TextField
                label="ニックネーム"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="例）もぐもぐ太郎"
              />
              <Button variant="contained" onClick={handleJoin} disabled={!nameInput.trim()}>
                参加する
              </Button>
            </Stack>
          </Box>
        </PhoneContainer>
      </AppContainer>
    )
  }

  return (
    <AppContainer>
      <PhoneContainer>
        <AppHeader title={roomInfo?.room_name ?? 'MoguFinder 投票'} />

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            py: 3,
            px: { xs: 1.5, sm: 3 },
            pb: 10,
          }}
        >
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {infoMessage && <Alert severity="info">{infoMessage}</Alert>}

            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  グループ情報
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ルームコード: {roomCode}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  参加メンバー: {members.length} 人
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ステータス: {roomInfo?.status === 'voting' ? '投票中' : roomInfo?.status || '準備中'}
                </Typography>
                {roomInfo?.preparation && !roomInfo.preparation.started && (
                  <Typography variant="body2" color="text.secondary">
                    準備中: {roomInfo.preparation.preparedCount} / {roomInfo.preparation.expectedCount}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
                <CircularProgress size={28} />
                <Typography>候補を読み込んでいます…</Typography>
              </Stack>
            ) : roomInfo?.status !== 'voting' ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    準備中
                  </Typography>
                  <Typography variant="body2">
                    レストラン情報を準備しています。しばらくお待ちください。
                  </Typography>
                </CardContent>
              </Card>
            ) : currentRestaurant ? (
              <>
                <SwipeArea currentIndex={currentIndex} totalCount={candidates.length}>
                  <RestaurantCard restaurant={currentRestaurant} />
                </SwipeArea>
                <SwipeButtons
                  onDislike={() => {
                    void handleVote(false)
                  }}
                  onLike={() => {
                    void handleVote(true)
                  }}
                />
              </>
            ) : hasCompletedVoting ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    投票お疲れさまでした！
                  </Typography>
                  <Typography variant="body2">
                    すべての候補を評価しました。他のメンバーの投票が完了するまでお待ちください。
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Typography>候補が見つかりませんでした。</Typography>
            )}

            <Stack spacing={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  void handleFetchResults()
                }}
              >
                最新の結果を確認
              </Button>
            </Stack>

            {results && results.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    グループのおすすめ
                  </Typography>
                  <Stack spacing={2}>
                    {results.map((item, index) => (
                      <Box
                        key={item.place_id}
                        sx={{
                          border: '1px solid',
                          borderColor: index === 0 ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          p: 2,
                          bgcolor: index === 0 ? 'primary.light' : 'background.paper',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {item.rank} 位: {item.name}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          👍 {item.like_count} / 👎 {item.dislike_count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          スコア: {item.score.toFixed(1)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Box>
      </PhoneContainer>
    </AppContainer>
  )
}

export default RoomVotePage
