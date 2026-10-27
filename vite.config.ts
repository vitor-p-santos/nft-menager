import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Bootstrap em paralelo (T-101). O `main.tsx` importa o MSW, espera o `worker.start()` e só então
 * importa o app (o socket.io captura `WebSocket` ao avaliar). Sem dica, os chunks do app só
 * começam a baixar depois do service worker: uma cascata. Este plugin põe no `index.html` um
 * `<link rel="modulepreload">` para cada chunk estático dessas importações dinâmicas: o navegador
 * baixa e compila tudo junto com a entrada, mas só avalia na ordem do `main.tsx`.
 */
function preloadBootstrapChunks(entries: string[]): Plugin {
  return {
    name: 'kurio:preload-bootstrap-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return
        const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
        const files = new Set<string>()
        const visit = (fileName: string) => {
          if (files.has(fileName)) return
          files.add(fileName)
          const chunk = bundle[fileName]
          if (chunk?.type === 'chunk') chunk.imports.forEach(visit)
        }
        for (const entry of entries) {
          const chunk = chunks.find((c) => c.facadeModuleId?.endsWith(entry))
          if (chunk) visit(chunk.fileName)
        }
        // Os imports estáticos da entrada o Vite já pré-carrega
        const entryChunk = chunks.find((c) => c.isEntry)
        for (const file of [entryChunk?.fileName, ...(entryChunk?.imports ?? [])]) if (file) files.delete(file)
        return [...files].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const mocks = env.VITE_ENABLE_MOCKS !== 'false'
  return {
    plugins: [
      // Must come before react(): generates src/routeTree.gen.ts from src/routes
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      preloadBootstrapChunks(mocks ? ['src/mocks/browser.ts', 'src/app/providers.tsx'] : ['src/app/providers.tsx']),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          // Bibliotecas de base em chunks próprios e estáveis: mudam pouco, então ficam em cache
          // entre deploys. Só o que toda tela usa; o resto (Radix, RHF, MSW) segue a divisão automática.
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
              { name: 'vendor-tanstack', test: /node_modules[\\/]@tanstack[\\/](react-router|router-core|history|react-query|query-core|react-store|store)[\\/]/, priority: 20 },
              { name: 'vendor-zod', test: /node_modules[\\/]zod[\\/]/, priority: 10 },
              // Servidor simulado (MSW + binding do Socket.IO): só carrega com os mocks ligados. Separado do
              // código dos handlers para nenhum dos dois passar de 500 kB.
              { name: 'vendor-mocks', test: /node_modules[\\/](msw|@mswjs|@open-draft|engine\.io-parser|socket\.io-parser|strict-event-emitter|outvariant|headers-polyfill|graphql|path-to-regexp|cookie|tough-cookie)[\\/]/, priority: 5 },
            ],
          },
        },
      },
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  }
})
