import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Fade,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { useNavigate } from 'react-router-dom'

import AppHeader from '../../components/AppHeader'
import AppContainer from '../../layout/AppContainer'
import PhoneContainer from '../../layout/PhoneContainer'
import { createGroup } from '../../../shared/lib/api/groups'
import { saveGroupMemberId } from '../../../shared/lib/storage/localStorage'
import { buildQrSource, generateMemberId } from '../../../shared/lib/group/utils'
import type { Coordinates, GroupCreateParams, GroupCreateResponse } from '../../../shared/types'

const priceMarks = [
  { value: 0, label: '¥' },
  { value: 1, label: '¥¥' },
  { value: 2, label: '¥¥¥' },
  { value: 3, label: '¥¥¥¥' },
  { value: 4, label: '¥¥¥¥¥' },
]

const HomePage = (): ReactElement => {
  const navigate = useNavigate()

  const [groupName, setGroupName] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [memberId, setMemberId] = useState<string | null>(null)
  const [radius, setRadius] = useState(1000)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 4])
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [geoLoading, setGeoLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [groupResponse, setGroupResponse] = useState<GroupCreateResponse | null>(null)
  const progressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('このブラウザは位置情報をサポートしていません。')
      setGeoLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGeoLoading(false)
      },
      () => {
        setError('位置情報を取得できませんでした。ブラウザの設定をご確認ください。')
        setGeoLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }, [])

  useEffect(() => {
    if (loading) {
      setProgress((prev) => (prev < 15 ? 15 : prev))
      if (progressTimerRef.current === null) {
        progressTimerRef.current = window.setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              return prev
            }
            const increment = Math.random() * 8 + 2
            return Math.min(prev + increment, 90)
          })
        }, 700)
      }
    } else if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [loading])

  const handleRetryLocation = () => {
    setGeoLoading(true)
    setError(null)
    if (!navigator.geolocation) {
      setError('このブラウザは位置情報をサポートしていません。')
      setGeoLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGeoLoading(false)
      },
      () => {
        setError('位置情報を取得できませんでした。ブラウザの設定をご確認ください。')
        setGeoLoading(false)
      },
    )
  }

  const handleCreateGroup = async () => {
    if (!location) {
      setError('位置情報が取得できていません。')
      return
    }

    const organizerId = generateMemberId(organizerName || 'organizer')
    setMemberId(organizerId)
    setLoading(true)
    setProgress(10)
    setError(null)

    const payload: GroupCreateParams = {
      group_name: groupName.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      min_price: priceRange[0],
      max_price: priceRange[1],
      types: ['restaurant', 'cafe'],
    }

    try {
      setProgress(30)
      const response = await createGroup(payload, organizerId)
      setProgress(80)
      setGroupResponse(response)
      saveGroupMemberId(response.group_id, organizerId)
      setProgress(100)
    } catch (err) {
      console.error(err)
      setError('グループの作成に失敗しました。時間をおいて再度お試しください。')
      setProgress(0)
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 400)
    }
  }

  const participantLink = useMemo(() => groupResponse?.invite_url ?? '', [groupResponse])
  const organizerLink = useMemo(() => groupResponse?.organizer_join_url ?? '', [groupResponse])
  const organizerRoute = useMemo(() => {
    if (!groupResponse || !memberId) {
      return ''
    }
    return `/group/${groupResponse.group_id}?memberId=${encodeURIComponent(memberId)}`
  }, [groupResponse, memberId])

  const progressLabel = useMemo(() => {
    if (progress >= 95) {
      return 'まもなく完了します…'
    }
    if (progress >= 60) {
      return '候補データを整理しています…'
    }
    return '候補データを準備しています…'
  }, [progress])

  const visibleMascots = useMemo(() => {
    if (progress >= 80) {
      return 3
    }
    if (progress >= 45) {
      return 2
    }
    if (progress > 10) {
      return 1
    }
    return 0
  }, [progress])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  return (
    <AppContainer>
      <PhoneContainer>
        <AppHeader title="MoguFinder グループ作成" />

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            py: 3,
            px: { xs: 1.5, sm: 3 },
          }}
        >
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            {geoLoading ? (
              <Stack direction="row" alignItems="center" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
                <CircularProgress size={32} />
                <Typography>位置情報を取得しています…</Typography>
              </Stack>
            ) : (
              <>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">グループ情報</Typography>
                      <TextField
                        label="グループ名（任意）"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        placeholder="例）金曜飲み会"
                        fullWidth
                      />
                      <TextField
                        required
                        label="幹事のニックネーム"
                        value={organizerName}
                        onChange={(event) => setOrganizerName(event.target.value)}
                        placeholder="例）たべこ"
                        helperText="メンバーIDの生成に利用します"
                        fullWidth
                      />

                      <Box>
                        <Typography gutterBottom>検索範囲（{radius} m）</Typography>
                        <Slider
                          min={300}
                          max={3000}
                          step={100}
                          value={radius}
                          onChange={(_event, value) => {
                            if (typeof value === 'number') {
                              setRadius(value)
                            }
                          }}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      <Box>
                        <Typography gutterBottom>価格帯</Typography>
                        <Slider
                          value={priceRange}
                          onChange={(_event, value) => {
                            if (Array.isArray(value) && value.length === 2) {
                              setPriceRange([value[0], value[1]])
                            }
                          }}
                          min={0}
                          max={4}
                          step={1}
                          marks={priceMarks}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleCreateGroup}
                        disabled={loading || !organizerName.trim()}
                      >
                        {loading ? '作成中…' : <Typography component='span' sx={{ color: '#FFFFFF', fontWeight: 600 }}>この条件でグループを作成</Typography>}
                      </Button>
                      {loading && (
                        <Box sx={{ width: '100%' }}>
                          {progress > 0 ? (
                            <LinearProgress variant="determinate" value={Math.min(progress, 100)} />
                          ) : (
                            <LinearProgress variant="indeterminate" />
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                            {progressLabel}
                          </Typography>
                          <Stack
                            direction="row"
                            justifyContent="center"
                            alignItems="flex-end"
                            spacing={1.5}
                            sx={{ mt: 2 }}
                          >
                            <Fade in={visibleMascots >= 1} timeout={{ enter: 500 }} style={{ display: 'flex' }}>
                              <Box
                                component="img"
                                src="/moguwan.png"
                                alt="Moguwan enjoying snacks"
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: '14px',
                                  boxShadow: '0 12px 22px rgba(255, 140, 66, 0.2)',
                                  transform: 'rotate(-6deg)',
                                }}
                              />
                            </Fade>
                            <Fade in={visibleMascots >= 2} timeout={{ enter: 650 }} style={{ display: 'flex' }}>
                              <Box
                                component="img"
                                src="/moguwan_hatena.png"
                                alt="Moguwan wondering"
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: '18px',
                                  boxShadow: '0 12px 22px rgba(255, 140, 66, 0.2)',
                                  transform: 'rotate(-2deg)',
                                }}
                              />
                            </Fade>
                            <Fade in={visibleMascots >= 3} timeout={{ enter: 800 }} style={{ display: 'flex' }}>
                              <Box
                                component="img"
                                src="/moguwan_mogu2.png"
                                alt="Moguwan enjoying snacks"
                                sx={{
                                  width: 58,
                                  height: 58,
                                  borderRadius: '50%',
                                  boxShadow: '0 10px 20px rgba(53, 80, 112, 0.16)',
                                  transform: 'rotate(5deg)',
                                }}
                              />
                            </Fade>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                <Button
                  variant="outlined"
                  startIcon={<MyLocationIcon />}
                  onClick={handleRetryLocation}
                  disabled={geoLoading}
                >
                  位置情報を再取得
                </Button>
              </>
            )}

            {groupResponse && organizerLink && (
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">グループが作成されました！</Typography>
                    <Typography variant="body2" color="text.secondary">
                      メンバーに以下のリンクを共有してください。QRコードを読み取るだけで参加できます。
                    </Typography>

                    <Box
                      component="img"
                      src={buildQrSource(participantLink)}
                      alt="グループ招待用QRコード"
                      sx={{ width: '100%', maxWidth: 240, alignSelf: 'center', borderRadius: 2 }}
                    />

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ flexGrow: 1, wordBreak: 'break-all' }}>{participantLink}</Typography>
                      <IconButton
                        aria-label="招待リンクをコピー"
                        onClick={() => handleCopy(participantLink)}
                        size="small"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                      幹事用リンク
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ flexGrow: 1, wordBreak: 'break-all' }}>{organizerLink}</Typography>
                      <IconButton aria-label="幹事リンクをコピー" onClick={() => handleCopy(organizerLink)} size="small">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    {organizerRoute && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          navigate(organizerRoute)
                        }}
                      >
                        投票画面を開く
                      </Button>
                    )}
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

export default HomePage
