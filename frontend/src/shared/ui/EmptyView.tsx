import type { ReactElement } from 'react'
import { Box, Button, Typography } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'

type EmptyViewType = 'empty' | 'complete'

interface EmptyViewProps {
  type?: EmptyViewType
  onRefresh?: () => void
}

function EmptyView({ type = 'empty', onRefresh }: EmptyViewProps): ReactElement {
  if (type === 'complete') {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="text.primary" sx={{ mb: 2, fontWeight: 600 }}>
          ✅ すべてチェックしました！
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          更新ボタンをクリックして新しいレストランを探してください
        </Typography>
        {onRefresh && (
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRefresh} size="large">
            新しいレストランを探す
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h5" color="text.primary" sx={{ mb: 2, fontWeight: 600 }}>
        🍽️ レストランが見つかりませんでした
      </Typography>
      <Typography variant="body1" color="text.secondary">
        設定を変更するか、後でもう一度お試しください。
      </Typography>
    </Box>
  )
}

export default EmptyView
