import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],

server: {
    port: 5173,        // ポート番号を固定
    strictPort: true,  // 5173が使用中の場合はエラーにする（他のポートにフォールバックしない）
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },

})
