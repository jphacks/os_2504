import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'

import { savePreferences } from '../../../shared/lib/storage/localStorage'
import type { StoredPreferences } from '../../../shared/types'

interface SettingsFormProps {
  onComplete: (preferences: StoredPreferences) => void
}

const SettingsForm = ({ onComplete }: SettingsFormProps) => {
  const [distance, setDistance] = useState<number>(1000)
  const [priceRange, setPriceRange] = useState<[number, number]>([1, 3])
  const [cuisine, setCuisine] = useState<string>('all')

  const handleSave = () => {
    const preferences: StoredPreferences = {
      radius: distance,
      min_price: priceRange[0],
      max_price: priceRange[1],
      cuisine,
    }
    savePreferences(preferences)
    onComplete(preferences)
  }

  const handlePriceRangeChange = (_event: Event, value: number | number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      setPriceRange([value[0], value[1]])
    }
  }

  const handleCuisineChange = (event: SelectChangeEvent<string>) => {
    setCuisine(event.target.value)
  }

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        食べ物の好みを設定
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography gutterBottom>検索範囲: {distance}m</Typography>
          <Slider
            value={distance}
            onChange={(_event, value) => {
              if (typeof value === 'number') {
                setDistance(value)
              }
            }}
            min={500}
            max={10000}
            step={500}
            marks
            valueLabelDisplay="auto"
          />

          <Typography gutterBottom sx={{ mt: 3 }}>
            価格帯
          </Typography>
          <Slider
            value={priceRange}
            onChange={handlePriceRangeChange}
            min={0}
            max={4}
            step={1}
            marks={[
              { value: 0, label: '¥' },
              { value: 1, label: '¥¥' },
              { value: 2, label: '¥¥¥' },
              { value: 3, label: '¥¥¥¥' },
              { value: 4, label: '¥¥¥¥¥' },
            ]}
            valueLabelDisplay="auto"
          />

          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel>料理ジャンル</InputLabel>
            <Select value={cuisine} onChange={handleCuisineChange} label="料理ジャンル">
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="japanese">和食</MenuItem>
              <MenuItem value="chinese">中華</MenuItem>
              <MenuItem value="italian">イタリアン</MenuItem>
              <MenuItem value="french">フレンチ</MenuItem>
              <MenuItem value="cafe">カフェ</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={handleSave}>
            探し始める
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default SettingsForm
