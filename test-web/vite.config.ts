import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
    root: __dirname,
    server: { fs: { allow: [resolve(__dirname, '..')] } },
    build: { target: 'esnext' },
    esbuild: { target: 'esnext' },
    optimizeDeps: {
        esbuildOptions: { target: 'esnext' },
        exclude: ['luau-web'],
    },
})
