// Executa o Lighthouse 3x por página e perfil (mobile/desktop) e registra as medianas.
// Uso: npm run lighthouse  (requer `npm run build`; sobe o vite preview automaticamente)
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RUNS = 3
const PROFILES = ['mobile', 'desktop']
const root = new URL('..', import.meta.url).pathname
const { baseUrl, pages } = JSON.parse(readFileSync(join(root, 'lighthouse/pages.json'), 'utf8'))
const outDir = join(root, 'reports/lighthouse')
mkdirSync(outDir, { recursive: true })

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 3000))

const summary = []
try {
  for (const profile of PROFILES) {
    for (const page of pages) {
      const runs = []
      for (let i = 1; i <= RUNS; i++) {
        const slug = page === '/' ? 'home' : page.replace(/\W+/g, '-').replace(/^-|-$/g, '')
        const file = join(outDir, `${slug}.${profile}.run${i}`)
        const args = [
          'lighthouse', baseUrl + page,
          '--quiet', '--chrome-flags=--headless=new --no-sandbox',
          '--only-categories=performance,accessibility,best-practices,seo',
          '--output=json', '--output=html', `--output-path=${file}`,
        ]
        if (profile === 'desktop') args.push('--preset=desktop')
        const res = spawnSync('npx', args, { cwd: root, stdio: 'inherit' })
        if (res.status !== 0) throw new Error(`Lighthouse falhou em ${page} (${profile}) run ${i}`)
        const lhr = JSON.parse(readFileSync(`${file}.report.json`, 'utf8'))
        runs.push({
          performance: lhr.categories.performance.score * 100,
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
      }
      summary.push({
        page, profile, runs: RUNS,
        median: {
          performance: median(runs.map((r) => r.performance)),
          lcpMs: Math.round(median(runs.map((r) => r.lcp))),
          cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
          tbtMs: Math.round(median(runs.map((r) => r.tbt))),
        },
        raw: runs,
      })
    }
  }
} finally {
  preview.kill()
}

writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2))
const md = [
  '# Lighthouse — medianas (3 execuções)',
  '',
  '| Página | Perfil | Performance | LCP (ms) | CLS | TBT (ms) |',
  '|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.page} | ${s.profile} | ${s.median.performance} | ${s.median.lcpMs} | ${s.median.cls} | ${s.median.tbtMs} |`),
].join('\n')
writeFileSync(join(outDir, 'SUMMARY.md'), md + '\n')
console.log('\n' + md)
