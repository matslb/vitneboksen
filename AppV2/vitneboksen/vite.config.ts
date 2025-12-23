import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const keyPath = path.resolve(__dirname, 'localhost+2-key.pem')
const certPath = path.resolve(__dirname, 'localhost+2.pem')
const isLocal = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  server: {
    host: true,
    ...(isLocal && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      }
    })
  }
})
