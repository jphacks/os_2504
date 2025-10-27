import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ルート(.env)の環境変数も読み込めるように親ディレクトリを参照
  envDir: '..',
  server: {
    host: true,
    port: 5173,
  },
})
