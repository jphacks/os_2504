import axios from 'axios'
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
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import AppHeader from '../../components/AppHeader'
import AppContainer from '../../layout/AppContainer'
import PhoneContainer from '../../layout/PhoneContainer'
import { RestaurantCard, SwipeArea, SwipeButtons } from '../../../features/restaurants'
import {
  fetchGroupCandidates,
  fetchGroupInfo,
  fetchGroupResults,
  finishGroupVoting,
  submitGroupVote,
} from '../../../shared/lib/api/groups'
import { getGroupMemberId, saveGroupMemberId, getGroupProgress, saveGroupProgress } from '../../../shared/lib/storage/localStorage'
import { generateMemberId } from '../../../shared/lib/group/utils'
import type {
  Coordinates,
  GroupInfo,
  GroupResultsResponse,
  Restaurant,
  VoteValue,
} from '../../../shared/types'

const GroupVotePage = (): ReactElement => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [memberId, setMemberId] = useState<string | null>(searchParams.get('memberId'))
  const [nameInput, setNameInput] = useState('')
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [candidates, setCandidates] = useState<Restaurant[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [results, setResults] = useState<GroupResultsResponse | null>(null)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) {
      return
    }

    if (!memberId) {
      const stored = getGroupMemberId(groupId)
      if (stored) {
        setMemberId(stored)
        const next = new URLSearchParams(searchParams)
        next.set('memberId', stored)
        setSearchParams(next, { replace: true })
      }
      return
    }

    saveGroupMemberId(groupId, memberId)

    if (searchParams.get('memberId') !== memberId) {
      const next = new URLSearchParams(searchParams)
      next.set('memberId', memberId)
      setSearchParams(next, { replace: true })
    }
  }, [groupId, memberId, searchParams, setSearchParams])

  useEffect(() => {
    if (!groupId || !memberId) {
      return
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setInfoMessage(null)

      try {
        const info = await fetchGroupInfo(groupId, memberId)
        setGroupInfo(info)
        setUserLocation({
          latitude: info.preferences.latitude,
          longitude: info.preferences.longitude,
        })
        const data = await fetchGroupCandidates(groupId, memberId, 0, 50)
        setCandidates(data)
        const storedProgress = getGroupProgress(groupId, memberId)
        if (storedProgress != null && storedProgress < data.length) {
          setCurrentIndex(storedProgress)
        } else {
          setCurrentIndex(0)
        }

        if (info.status === 'finished') {
          const existingResults = await fetchGroupResults(groupId)
          setResults(existingResults)
        }
      } catch (err) {
        console.error(err)
        setError('グループ情報の取得に失敗しました。リンクを再度確認してください。')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [groupId, memberId])

  const currentRestaurant = useMemo(() => {
    if (currentIndex >= candidates.length) {
      return null
    }
    return candidates[currentIndex]
  }, [currentIndex, candidates])


  const isOrganizer = groupInfo?.organizer_id === memberId
  const hasCompletedVoting = currentIndex >= candidates.length && candidates.length > 0

  const handleRegisterMember = () => {
    if (!groupId) {
      setError('グループIDが不正です。')
      return
    }

    const generated = generateMemberId(nameInput || 'member')
    setMemberId(generated)
    saveGroupMemberId(groupId, generated)
    const next = new URLSearchParams(searchParams)
    next.set('memberId', generated)
    setSearchParams(next, { replace: true })
  }

  const handleVote = async (value: VoteValue) => {
    if (!groupId || !memberId || !currentRestaurant) {
      return
    }

    try {
      setError(null)
      setInfoMessage(null)
      await submitGroupVote(groupId, memberId, {
        candidate_id: currentRestaurant.place_id,
        value,
      })
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    } catch (err) {
      console.error(err)
      setError('投票に失敗しました。時間をおいて再度お試しください。')
    }
  }

  const handleFinishVoting = async () => {
    if (!groupId || !memberId) {
      return
    }

    setIsFinishing(true)
    setError(null)
    setInfoMessage(null)
    try {
      const finished = await finishGroupVoting(groupId, memberId)
      setResults(finished)
      setGroupInfo((prev) => (prev ? { ...prev, status: finished.status } : prev))
      setInfoMessage('集計が完了しました。結果をご確認ください。')
    } catch (err) {
      console.error(err)
      setError('集計処理に失敗しました。再度お試しください。')
    } finally {
      setIsFinishing(false)
    }
  }

  const handleFetchResults = async () => {
    if (!groupId) {
      return
    }
    setError(null)
    setInfoMessage(null)

    try {
      const fetched = await fetchGroupResults(groupId)
      setResults(fetched)
    } catch (err) {
      console.error(err)
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setInfoMessage('結果はまだ集計中です。幹事が終了すると閲覧できます。')
      } else {
        setError('結果を取得できませんでした。')
      }
    }
  }

  if (!groupId) {
    return (
      <AppContainer>
        <PhoneContainer>
          <Box
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: 3,
            }}
          >
            <Alert severity="error">グループIDが指定されていません。</Alert>
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
              <Button variant="contained" onClick={handleRegisterMember} disabled={!nameInput.trim()}>
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
        <AppHeader title={groupInfo?.group_name ?? 'MoguFinder 投票'} />

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
                  グループID: {groupInfo?.group_id ?? groupId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  参加メンバー: {groupInfo?.members.length ?? 1} 人
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ステータス: {groupInfo?.status === 'finished' ? '集計済み' : '投票中'}
                </Typography>
              </CardContent>
            </Card>

            {isLoading ? (
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
                <CircularProgress size={28} />
                <Typography>候補を読み込んでいます…</Typography>
              </Stack>
            ) : currentRestaurant ? (
              <>
                <SwipeArea currentIndex={currentIndex} totalCount={candidates.length}>
                  <RestaurantCard
                    restaurant={currentRestaurant}
                    userLocation={userLocation}
                    groupContext={
                      groupId
                        ? {
                            groupId,
                            memberId,
                          }
                        : undefined
                    }
                  />
                </SwipeArea>
                <SwipeButtons
                  onDislike={() => {
                    void handleVote('dislike')
                  }}
                  onLike={() => {
                    void handleVote('like')
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
              {isOrganizer && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    void handleFinishVoting()
                  }}
                  disabled={isFinishing || groupInfo?.status === 'finished'}
                >
                  {isFinishing ? '集計中…' : '投票を締め切って結果を見る'}
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={() => {
                  void handleFetchResults()
                }}
              >
                最新の結果を確認
              </Button>
            </Stack>

            {results && results.results.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    グループのおすすめ
                  </Typography>
                  <Stack spacing={2}>
                    {results.results.map((item, index) => (
                      <Box
                        key={item.restaurant.place_id}
                        sx={{
                          border: '1px solid',
                          borderColor: index === 0 ? '#FF5252' : 'divider',
                          borderRadius: 2,
                          p: 2,
                          bgcolor: index === 0 ? 'rgba(255, 82, 82, 0.08)' : 'background.paper',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          gap={1}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                            {index + 1} 位: {item.restaurant.name}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              navigate(`/restaurant/${item.restaurant.place_id}`, {
                                state: {
                                  from: {
                                    pathname: routerLocation.pathname,
                                    search: routerLocation.search,
                                  },
                                  groupId,
                                  memberId,
                                  organizerLocation: userLocation,
                                },
                              })
                            }
                          >
                            詳細を見る
                          </Button>
                        </Stack>
                        <Typography
                          variant="body2"
                          color={index === 0 ? '#FF5252' : 'text.secondary'}
                          sx={{ fontWeight: index === 0 ? 600 : 400 }}
                        >
                          住所: {item.restaurant.address}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          👍 {item.likes} / 👎 {item.dislikes}
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

export default GroupVotePage
