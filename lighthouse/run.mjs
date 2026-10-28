// Executa o Lighthouse 3x por página e perfil (mobile/desktop) e registra as medianas.
// Uso: npm run lighthouse  (requer `npm run build`; sobe o vite preview automaticamente)
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Sem Chrome instalado no sistema (CI/WSL): usa o Chromium baixado pelo Playwright
if (!process.env.CHROME_PATH) {
  const { chromium } = await import('@playwright/test')
  process.env.CHROME_PATH = chromium.executablePath()
}

const RUNS = 3
/** Orçamento de CLS por página × perfil (mediana): 0,1 é o limite de "bom" do Core Web Vitals. */
const CLS_BUDGET = 0.1
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
        const file = join(outDir, `${slug}-${profile}-run${i}`)
        const args = [
          'lighthouse', baseUrl + page,
          '--quiet', '--chrome-flags=--headless=new --no-sandbox',
          '--only-categories=performance,accessibility,best-practices,seo',
          '--output=json', '--output=html', `--output-path=${file}`,
        ]
        if (profile === 'desktop') args.push('--preset=desktop')
        // Até 3 tentativas: no WSL o Chrome às vezes fecha a conexão CDP no cleanup ("Connection closed")
        let res
        for (let attempt = 1; attempt <= 3; attempt++) {
          res = spawnSync('npx', args, { cwd: root, stdio: 'inherit' })
          if (res.status === 0) break
        }
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
// A análise escrita à mão (a partir de "## Análise") sobrevive à regravação da tabela
const summaryPath = join(outDir, 'SUMMARY.md')
const previous = existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : ''
const analysis = previous.indexOf('\n## Análise')
writeFileSync(summaryPath, md + '\n' + (analysis >= 0 ? previous.slice(analysis) : ''))
console.log('\n' + md)

const overBudget = summary.filter((s) => s.median.cls > CLS_BUDGET)
if (overBudget.length > 0) {
  console.error(`\nCLS acima de ${CLS_BUDGET}: ${overBudget.map((s) => `${s.page} (${s.profile}) = ${s.median.cls}`).join(', ')}`)
  process.exit(1)
}
