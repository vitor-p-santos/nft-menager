// Executa o Lighthouse 3x por página e perfil (mobile/desktop) e registra as medianas.
// Uso: npm run lighthouse  (requer `npm run build`; sobe o vite preview automaticamente)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

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

const AUDIT_TIMEOUT_MS = 120_000
const FLAGS = { logLevel: 'silent', output: ['json', 'html'], onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }

/**
 * Uma execução do Lighthouse com perfil do Chrome próprio no /tmp, apagado mesmo se falhar.
 * No WSL o chrome-launcher criaria o perfil em `C:\Users\...\lighthouse.*` (um nome relativo na raiz
 * do projeto, no Linux) e o deixaria para trás quando o Chrome cai.
 */
const profileDirs = new Set()
const removeProfile = (dir) => {
  rmSync(dir, { recursive: true, force: true })
  profileDirs.delete(dir)
}
process.on('exit', () => profileDirs.forEach(removeProfile))
// O TargetManager do Lighthouse deixa uma promise solta que rejeita quando o Chrome fecha; no CLI isso
// derrubava só o subprocesso, aqui derrubaria a auditoria inteira. Qualquer outro erro continua fatal.
process.on('unhandledRejection', (err) => {
  if (err?.name === 'TargetCloseError') return
  console.error(err)
  process.exit(1)
})

async function audit(url, profile) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'kurio-lighthouse-'))
  profileDirs.add(userDataDir)
  let chrome
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'], userDataDir })
    const run = lighthouse(url, { ...FLAGS, port: chrome.port }, profile === 'desktop' ? desktopConfig : undefined)
    // Se o Chrome cai no meio, a promise do Lighthouse pode nunca resolver: o tempo limite vira uma falha
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`tempo limite de ${AUDIT_TIMEOUT_MS / 1000} s`)), AUDIT_TIMEOUT_MS)
    })
    const result = await Promise.race([run, timeout]).finally(() => clearTimeout(timer))
    if (!result) throw new Error('Lighthouse não retornou resultado')
    return result
  } finally {
    // No WSL o Chrome às vezes fecha a conexão CDP no cleanup ("Connection closed")
    await chrome?.kill().catch(() => {})
    removeProfile(userDataDir)
  }
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
        // Até 3 tentativas: no WSL o Chrome às vezes cai no meio da execução
        let result
        for (let attempt = 1; attempt <= 3 && !result; attempt++) {
          try {
            result = await audit(baseUrl + page, profile)
          } catch (err) {
            console.error(`Tentativa ${attempt} falhou em ${page} (${profile}) run ${i}: ${err.message}`)
          }
        }
        if (!result) throw new Error(`Lighthouse falhou em ${page} (${profile}) run ${i}`)
        const [json, html] = result.report
        writeFileSync(`${file}.report.json`, json)
        writeFileSync(`${file}.report.html`, html)
        const { lhr } = result
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
