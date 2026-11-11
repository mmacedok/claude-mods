import { test, expect, mock } from 'claude-code/testing'

declare const setTimeout: (f: (...a: any[]) => void, ms: number) => unknown

const SURFACES = ['terminal', 'desktop'] as const
const PROPS = { hasSurvey: false, isWorking: false, maxRows: 40, bodyColumns: 120 } as any

async function estado($: any, o: { turnos?: number; cresce?: number; percent?: number } = {}) {
  const n = o.turnos ?? 3
  for (let i = 0; i < n; i++) {
    await $.turn.complete({
      turnId: 't' + i, reason: 'answer', answer: 'ok', durationMs: 10, isAborted: false,
      usage: {
        model: 'claude-opus-5-5', input_tokens: 2000, output_tokens: 1500,
        cache_read_input_tokens: 50000 + i * (o.cresce ?? 1000), cache_creation_input_tokens: 8000,
      },
    })
  }
  await $.session.measure({
    context: { tokens: 61500, window: 200000, percent: o.percent ?? 31 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 40 }], cost: { usd: 1.23 }, changed: [],
  })
}

async function desenha($: any, surface: (typeof SURFACES)[number], props = PROPS) {
  const ui = await $.ui.mount({ plugin: 'funmeter', surface, component: 'AbovePrompt', props })
  const botao = await ui.find({ key: 'handoff' })
  const aviso = await ui.find({ key: 'aviso-handoff' })
  await ui.unmount()
  return { botao, aviso }
}

test('the bar draws in the normal state', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  for (const s of SURFACES) expect((await desenha($, s)).botao).toBeDefined()
})

test('the bar draws with the handoff warning on', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($, { turnos: 12, cresce: 20000, percent: 90 })
  for (const s of SURFACES) {
    const r = await desenha($, s)
    expect(r.aviso).toBeDefined()
    expect(r.botao).toBeDefined()
  }
})

test('the bar draws while working', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  for (const s of SURFACES) expect((await desenha($, s, { ...PROPS, isWorking: true })).botao).toBeDefined()
})

test('the bar draws in a narrow band', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  for (const s of SURFACES) expect((await desenha($, s, { ...PROPS, bodyColumns: 40, maxRows: 4 })).botao).toBeDefined()
})

test('the whole meter and mascot show before the first response', async ($, on) => {
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ key: 'mascote' })).toBeDefined()
  expect(await ui.find({ key: 'handoff' })).toBeDefined()
  await ui.unmount()
})

test('the mascot shows on desktop in every mood, idle included', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  for (const isWorking of [false, true]) {
    const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: { ...PROPS, isWorking } })
    expect(await ui.find({ key: 'mascote' })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }
})

test('stats button and limit tubes draw', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ key: 'stats' })).toBeDefined()
  expect(await ui.find({ key: 'tubos-limite' })).toBeDefined()
  await ui.unmount()
})

test('sessions share one quota read and agy runs without its updater', async ($, on) => {
  let arquivo: string | undefined
  const rodou: any[] = []
  mock.clock(on)
  on('session.start', async () => ({ cwd: 'C:/x' }) as any)
  on('ui.status', async () => ({ value: undefined }) as any)
  on('command.register', async () => ({ value: undefined }) as any)
  on('env.get', async () => ({ value: 'C:\\Users\\teste' }) as any)
  on('fs.read', async () => ({ value: arquivo }) as any)
  on('fs.write', async (_, e) => {
    arquivo = e.text
    return { value: undefined } as any
  })
  on('process.run', async (_, e) => {
    rodou.push(e)
    return { value: { exitCode: 0, stdout: '{"command":{"data":{"groups":[{"name":"Gemini Models","buckets":[{"window":"5h","remaining_fraction":0.5}]}]}}}', stderr: '' } } as any
  })
  const inicio = { cwd: 'C:/x', source: 'startup' } as any
  await $.session.start(inicio)
  await new Promise(r => setTimeout(r, 30))
  expect(rodou.length).toBe(1)
  expect(rodou[0].init.env.AGY_CLI_DISABLE_AUTO_UPDATE).toBe('true')
  expect(JSON.parse(arquivo as string).lista.length).toBe(1)
  await $.session.start(inicio)
  await new Promise(r => setTimeout(r, 30))
  expect(rodou.length).toBe(1)
})

test('agent boxes show only what this run of Gemini spent, and the ✕ closes them', async ($, on) => {
  let resta = 0.8 // o Gemini já tinha 20% da semana gasto antes
  let arquivo: string | undefined
  mock.clock(on)
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  on('env.get', async () => ({ value: 'C:/Users/teste' }) as any)
  on('fs.read', async () => ({ value: arquivo }) as any)
  on('fs.write', async (_: any, e: any) => {
    arquivo = e.text
    return { value: undefined } as any
  })
  on('fs.list', async () => ({ value: [] }) as any)
  on('process.run', async () => ({ value: { exitCode: 0, stdout: `{"command":{"data":{"groups":[{"name":"Gemini Models","buckets":[{"window":"weekly","remaining_fraction":${resta}}]}]}}}`, stderr: '' } }) as any)
  on('tool.call', async (_: any, e: any) => {
    if (e.tool === 'mcp__gemini__gemini_run') resta = 0.65 // a rodada gastou 15%
    return { result: 'ok', text: 'ok' } as any
  })
  await estado($)
  const caixa = async () => {
    const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
    return { ui, gemini: await ui.find({ key: 'agente-Gemini' }), textos: ((await ui.findAll({ type: 'Text' })) as any[]).map(x => x.text) }
  }
  let v = await caixa()
  expect(v.gemini).toBeUndefined() // sem agente usado, nada de caixinha
  await v.ui.unmount()
  await $.tool.call({ tool: 'Read', file_path: 'C:/x.txt' } as any)
  v = await caixa()
  expect(v.gemini).toBeUndefined() // ferramenta comum não abre rodada
  await v.ui.unmount()
  await $.tool.call({ tool: 'mcp__gemini__gemini_run', prompt: 'oi' } as any)
  await new Promise(r => setTimeout(r, 30))
  v = await caixa()
  expect(v.gemini).toBeDefined()
  expect(v.textos).toContain('15%')
  expect(v.textos).not.toContain('35%')
  await v.ui.press({ key: 'fechar-Gemini' })
  await v.ui.unmount()
  v = await caixa()
  expect(v.gemini).toBeUndefined()
  await v.ui.unmount()
})

test('an hour after the last reply the warning shows, and a new reply clears it', async ($, on) => {
  on('turn.complete', (_$, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  on('session.start', async () => ({ cwd: 'C:/x' }) as any)
  on('ui.status', async () => ({ value: undefined }) as any)
  on('command.register', async () => ({ value: undefined }) as any)
  on('env.get', async () => ({ value: 'C:/Users/teste' }) as any)
  on('fs.read', async () => ({ value: undefined }) as any)
  on('fs.write', async () => ({ value: undefined }) as any)
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '{}', stderr: '' } }) as any)
  on('ui.panes', async () => ({ value: [] }) as any)
  on('session.id', async () => ({ value: 'sessao-1' }) as any)
  const guardado: Record<string, unknown> = {}
  on('store.get', async (_: any, e: any) => ({ value: guardado[e.key] }) as any)
  on('store.set', async (_: any, e: any) => {
    guardado[e.key] = e.value
    return { value: undefined } as any
  })
  const relogio = mock.clock(on, { now: 1000 })
  await $.session.start({ cwd: 'C:/x', source: 'startup' } as any)
  await estado($, { turnos: 1 })
  expect((await desenha($, 'desktop')).aviso).toBeUndefined()
  await relogio.advance(59 * 60 * 1000)
  expect((await desenha($, 'desktop')).aviso).toBeUndefined()
  await relogio.advance(2 * 60 * 1000)
  expect((await desenha($, 'desktop')).aviso).toBeDefined()
  expect(Object.values(guardado.respostas as Record<string, number>)).toEqual([1000])
  await estado($, { turnos: 1 })
  expect((await desenha($, 'desktop')).aviso).toBeUndefined()
})

// ---- regressões da auditoria 0.5.9

// Invariantes dos SVGs animados (portadas do checador de loops): keyTimes em [0,1], sem decrescer, do tamanho de values;
// quadros de `d` com a mesma estrutura; nada de NaN; em calcMode discrete nenhum segmento de duração zero.
function problemasDoSvg(svg: string): string[] {
  const erros: string[] = []
  if (/NaN|Infinity|undefined/.test(svg)) erros.push('NaN/Infinity/undefined no SVG')
  for (const m of svg.matchAll(/<(animate|animateTransform)\b([^>]*?)\/?>/g)) {
    const at: Record<string, string> = {}
    for (const x of (m[2] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) at[x[1] as string] = x[2] as string
    const values = (at.values ?? '').split(';')
    if (at.keyTimes) {
      const kt = at.keyTimes.split(';').map(Number)
      if (kt.length !== values.length) erros.push(`keyTimes(${kt.length}) != values(${values.length})`)
      if (kt[0] !== 0) erros.push(`keyTimes começa em ${kt[0]}`)
      if (kt.some(k => !(k >= 0 && k <= 1))) erros.push(`keyTimes fora de [0,1]: ${at.keyTimes.slice(-30)}`)
      for (let i = 1; i < kt.length; i++) {
        if ((kt[i] as number) < (kt[i - 1] as number)) erros.push('keyTimes decresce')
        if (at.calcMode === 'discrete' && kt[i] === kt[i - 1]) erros.push(`segmento perdido em ${kt[i]}`)
      }
      if ((at.calcMode ?? 'linear') !== 'discrete' && kt[kt.length - 1] !== 1) erros.push('keyTimes não termina em 1')
    }
    if (at.attributeName === 'd') {
      const forma = (v: string) => v.replace(/-?\d+(\.\d+)?/g, '#')
      if (values.some(v => forma(v) !== forma(values[0] as string))) erros.push('quadros de d com estruturas diferentes')
      if (values[0] !== values[values.length - 1]) erros.push('d: primeiro quadro != último')
    }
  }
  return erros
}

const fontesDe = async (ui: any) => ((await ui.findAll({ type: 'Svg' })) as any[]).map(x => x.props.source as string)

async function medidor($: any, on: any, window: number, tokens = 61500) {
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  await estado($)
  await $.session.measure({ context: { tokens, window, percent: 31 }, rateLimits: [{ kind: 'five_hour', percentUsed: 40 }], cost: { usd: 1.23 }, changed: [] })
}

test('a window of 0 or NaN never puts NaN in the tube', async ($, on) => {
  await medidor($, on, 0)
  for (const janela of [0, Number.NaN, -5]) {
    await $.session.measure({ context: { tokens: 1000, window: janela, percent: 1 }, rateLimits: [], changed: [] })
    const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
    const fontes = await fontesDe(ui)
    expect(fontes.length).toBeGreaterThan(0)
    for (const svg of fontes) expect(problemasDoSvg(svg)).toEqual([])
    await ui.unmount()
  }
})

test('every drawn SVG keeps the animation invariants in each mood', async ($, on) => {
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  // idle: antes da 1ª resposta
  let ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  const idle = await fontesDe(ui)
  await ui.unmount()
  await estado($)
  // happy (acabou de responder) e working
  const outros: string[] = []
  for (const isWorking of [false, true]) {
    ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: { ...PROPS, isWorking } })
    outros.push(...(await fontesDe(ui)))
    await ui.unmount()
  }
  expect(idle.length + outros.length).toBeGreaterThan(5)
  for (const svg of [...idle, ...outros]) expect(problemasDoSvg(svg)).toEqual([])
  // o idle tem de caber no que o engine aceita num Svg
  expect(Math.max(...idle.map(s => s.length))).toBeLessThan(131072)
})

test('prices: the longest model id wins and new models are priced', async ($, on) => {
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  mock.clock(on)
  const custo = async (model: string) => {
    await $.turn.complete({ turnId: model, reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false, usage: { model, input_tokens: 1000000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })
    const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
    const t = await ui.find({ text: /≈ \$/ })
    await ui.unmount()
    return Number(t?.text.match(/≈ \$([\d.]+)/)?.[1])
  }
  const antes = await custo('claude-opus-5')
  expect(antes).toBeGreaterThan(0)
  // estimativa acumulada: cada chamada soma ao total da sessão
  const a = await custo('claude-haiku-5-5')
  expect(+(a - antes).toFixed(2)).toBe(0.1) // Haiku 5.5: US$0,10 por milhão de entrada, não o do Opus
  const b = await custo('claude-opus-5-5')
  expect(+(b - a).toFixed(2)).toBe(4) // Opus 5.5 (4/20), não o Opus 5 (5/25)
})

test('numbers roll over to the next unit instead of showing 1000k', async ($, on) => {
  await medidor($, on, 1000000, 999950)
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ text: '1.00M/1.00M' })).toBeDefined()
  await ui.unmount()
})

// sessão retomada: o aviso de cache expirado e o de handoff valem antes da 1ª mensagem
async function retomada($: any, on: any, agora: number, quando: number, turnos?: number) {
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  on('session.start', async () => ({ cwd: 'C:/x' }) as any)
  on('ui.status', async () => ({ value: undefined }) as any)
  on('command.register', async () => ({ value: undefined }) as any)
  on('env.get', async () => ({ value: 'C:/Users/teste' }) as any)
  on('fs.read', async () => ({ value: undefined }) as any)
  on('fs.write', async () => ({ value: undefined }) as any)
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '{}', stderr: '' } }) as any)
  on('ui.panes', async () => ({ value: [] }) as any)
  on('session.id', async () => ({ value: 'sessao-1' }) as any)
  if (turnos !== undefined) on('session.turns', async () => ({ value: turnos }) as any)
  const guardado: Record<string, unknown> = { respostas: { 'sessao-1': quando } }
  on('store.get', async (_: any, e: any) => ({ value: guardado[e.key] }) as any)
  on('store.set', async (_: any, e: any) => {
    guardado[e.key] = e.value
    return { value: undefined } as any
  })
  mock.clock(on, { now: agora })
  await $.session.start({ cwd: 'C:/x', source: 'resume' } as any)
}

test('a resumed session warns about the expired cache before the first message', async ($, on) => {
  await retomada($, on, 1000 + 61 * 60 * 1000, 1000)
  await $.session.measure({ context: { tokens: 61500, window: 200000, percent: 31 }, rateLimits: [], changed: [] })
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  const aviso = await ui.find({ key: 'aviso-handoff' })
  expect(aviso).toBeDefined()
  expect(aviso?.text).toMatch(/cache has expired.*61\.5k tokens/)
  await ui.unmount()
})

test('a resumed session sizes the handoff warning from the turn count and a typical floor', async ($, on) => {
  await retomada($, on, 5000, 4000, 20)
  await $.session.measure({ context: { tokens: 100000, window: 200000, percent: 50 }, rateLimits: [], changed: [] })
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  const aviso = await ui.find({ key: 'aviso-handoff' })
  expect(aviso?.text).toMatch(/Good time for a handoff: 80\.0k tokens of history/)
  await ui.unmount()
})

test('after a resume in the same process the old conversation state is gone and the new time is read', async ($, on) => {
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  on('session.start', async () => ({ cwd: 'C:/x' }) as any)
  on('ui.status', async () => ({ value: undefined }) as any)
  on('command.register', async () => ({ value: undefined }) as any)
  on('env.get', async () => ({ value: 'C:/Users/teste' }) as any)
  on('fs.read', async () => ({ value: undefined }) as any)
  on('fs.write', async () => ({ value: undefined }) as any)
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '{}', stderr: '' } }) as any)
  on('ui.panes', async () => ({ value: [] }) as any)
  on('session.end', (_$: any, e: any) => ({ sessionId: e.sessionId }))
  let id = 'sessao-1'
  on('session.id', async () => ({ value: id }) as any)
  const guardado: Record<string, unknown> = { respostas: { 'sessao-2': 1000 } }
  on('store.get', async (_: any, e: any) => ({ value: guardado[e.key] }) as any)
  on('store.set', async (_: any, e: any) => {
    guardado[e.key] = e.value
    return { value: undefined } as any
  })
  mock.clock(on, { now: 1000 + 61 * 60 * 1000 })
  await $.session.start({ cwd: 'C:/x', source: 'startup' } as any)
  await estado($, { turnos: 12, cresce: 20000, percent: 90 })
  expect((await desenha($, 'desktop')).aviso).toBeDefined() // o handoff da conversa 1
  id = 'sessao-2'
  await $.session.end({ reason: 'resume', sessionId: 'sessao-1' } as any)
  expect((await desenha($, 'desktop')).aviso).toBeUndefined() // nada da conversa 1 sobrou
  await $.session.measure({ context: { tokens: 61500, window: 200000, percent: 31 }, rateLimits: [], changed: [] })
  const r = await desenha($, 'desktop')
  expect(r.aviso).toBeDefined() // a hora da conversa 2 (há mais de 1h) foi lida de novo
})

// Handoff: a troca termina apagando a sessão antiga, e só quando é seguro
async function fazHandoff($: any, on: any, o: { troca?: boolean; salva?: boolean; ficou?: boolean } = {}) {
  const r = { apagou: [] as string[][], avisos: [] as string[], enviados: [] as string[] }
  let id = 'sessao-1'
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  on('session.start', async () => ({ cwd: 'C:/x' }) as any)
  on('session.end', (_$: any, e: any) => ({ sessionId: e.sessionId }))
  on('ui.status', async () => ({ value: undefined }) as any)
  on('ui.panes', async () => ({ value: [] }) as any)
  on('command.register', async () => ({ value: undefined }) as any)
  on('env.get', async () => ({ value: 'C:/Users/teste' }) as any)
  on('fs.read', async () => ({ value: undefined }) as any)
  on('fs.write', async () => {
    if (o.salva === false) throw new Error('disco cheio')
    return { value: undefined } as any
  })
  on('fs.exists', async () => ({ value: o.ficou === true }) as any)
  on('process.run', async (_: any, e: any) => {
    if (e.argv[0] === 'cmd') r.apagou.push([...e.argv])
    return { value: { exitCode: 0, stdout: '{}', stderr: '' } } as any
  })
  on('session.id', async () => ({ value: id }) as any)
  on('session.cwd', async () => ({ value: 'C:/x' }) as any)
  on('session.model', async () => ({ value: 'claude-opus-5-5' }) as any)
  on('model.fork', async () => ({
    value: { isAnswered: true, text: 'resumo', usage: { model: 'claude-opus-5-5', input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  }) as any)
  on('command.run', async () => {
    if (o.troca !== false) id = 'sessao-2'
    return { text: undefined } as any
  })
  on('prompt.submit', async (_: any, e: any) => {
    r.enviados.push(e.text)
    return { text: e.text } as any
  })
  on('ui.toast', async (_: any, e: any) => {
    r.avisos.push(e.text)
    return { value: undefined } as any
  })
  on('store.get', async () => ({ value: undefined }) as any)
  on('store.set', async () => ({ value: undefined }) as any)
  mock.clock(on)
  await $.session.start({ cwd: 'C:/x', source: 'startup' } as any)
  await estado($)
  const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  await ui.press({ key: 'handoff' })
  await new Promise(p => setTimeout(p, 50))
  await ui.unmount()
  return r
}

test('handoff deletes only the old session, after moving to the new one', async ($, on) => {
  const r = await fazHandoff($, on)
  expect(r.enviados.length).toBe(1)
  expect(r.apagou.length).toBe(1)
  expect(r.apagou[0]?.slice(0, 4)).toEqual(['cmd', '/c', 'del', '/q'])
  expect(r.apagou[0]?.[4]).toBe('C:\\Users\\teste\\.claude\\projects\\C--x\\sessao-1.jsonl')
  expect(r.avisos).toContain('Handoff sent; old session deleted')
})

test('handoff deletes nothing when the session did not switch', async ($, on) => {
  const r = await fazHandoff($, on, { troca: false })
  expect(r.apagou.length).toBe(0)
  expect(r.enviados.length).toBe(0)
})

test('handoff keeps the old session when the summary could not be saved', async ($, on) => {
  const r = await fazHandoff($, on, { salva: false })
  expect(r.enviados.length).toBe(1)
  expect(r.apagou.length).toBe(0)
  expect(r.avisos.some(a => a.includes('old session was kept'))).toBe(true)
})

test('handoff says so when the old session is still there after deleting', async ($, on) => {
  const r = await fazHandoff($, on, { ficou: true })
  expect(r.apagou.length).toBe(1)
  expect(r.avisos.some(a => a.includes('could not delete the old session'))).toBe(true)
  expect(r.avisos).not.toContain('Handoff sent; old session deleted')
})

// ---- bateria do dia: 1/7 da semana, vira à meia-noite local e leva o saldo para o dia seguinte
// Os horários são locais (new Date(ano, mês, ...)) para a meia-noite cair no lugar certo em qualquer fuso.
const local = (dia: number, hora: number, min = 0) => new Date(2026, 10, dia, hora, min).getTime()
const AGORA = local(7, 12)

async function comCotaDia($: any, on: any) {
  on('turn.complete', (_$: any, e: any) => ({ text: 'ok', usage: e.usage }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.render', ($$: any, e: any) => { const { Box } = $$.ui.resolve(e); return <Box key="engine" /> })
  const relogio = mock.clock(on, { now: AGORA })
  await estado($)
  const semana = (percentUsed: number, resetsAt: number) =>
    $.session.measure({ context: { tokens: 1000, window: 200000, percent: 1 }, rateLimits: [{ kind: 'seven_day', percentUsed, resetsAt: new Date(resetsAt).toISOString() }], changed: [] })
  const ve = async (texto: string | null): Promise<string | undefined> => {
    const ui = await $.ui.mount({ plugin: 'funmeter', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
    const fontes: string[] = await fontesDe(ui)
    const svg = fontes.find(f => f.includes('>Energy '))
    const rotulo = svg?.match(/>(Energy -?[0-9]+%)</)?.[1] ?? null
    expect(rotulo).toBe(texto)
    await ui.unmount()
    return svg
  }
  return { relogio, semana, ve }
}

test('what is left today is added to tomorrow, and the battery turns gold above 100%', async ($, on) => {
  const { relogio, semana, ve } = await comCotaDia($, on)
  const reinicio = local(14, 10) // semana começou hoje às 10h
  await semana(0, reinicio)
  expect(await ve('Energy 100%')).not.toContain('#FFD86B')
  await semana(10, reinicio)
  await ve('Energy 30%') // 10% de 14,3%
  await relogio.advance(local(8, 0, 1) - AGORA) // passou da meia-noite
  await semana(10, reinicio)
  const dourada = (await ve('Energy 130%')) ?? ''
  expect(dourada).toContain('#FFD86B') // sobraram 30%: dourada
  // nenhuma tag com o mesmo atributo duas vezes (comFase põe begin em cada <animate>; um segundo deixa o SVG inválido)
  for (const tag of dourada.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const nomes = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map(m => m[1])
    expect(new Set(nomes).size).toBe(nomes.length)
  }
  await semana(15, reinicio)
  expect(await ve('Energy 95%')).not.toContain('#FFD86B') // gastou o extra: volta ao normal
})

test('going past the day borrows from tomorrow', async ($, on) => {
  const { relogio, semana, ve } = await comCotaDia($, on)
  const reinicio = local(14, 10)
  await semana(20, reinicio)
  await ve('Energy -40%') // passou da cota: negativo
  await relogio.advance(local(8, 0, 1) - AGORA)
  await semana(20, reinicio)
  await ve('Energy 60%') // os 40% que faltaram saem do dia seguinte
})

test('a day in the middle of the week counts every day before it', async ($, on) => {
  const { semana, ve } = await comCotaDia($, on)
  await semana(60, local(10, 15)) // começou dia 3 às 15h: hoje é o 5º dia, liberados 5/7 = 71,4%
  await ve('Energy 80%')
})

test('the last partial day only has what is left of the week', async ($, on) => {
  const { semana, ve } = await comCotaDia($, on)
  await semana(90, local(7, 18)) // começou dia 31/10 às 18h: hoje é o 8º dia do calendário
  await ve('Energy 70%')
  await semana(100, local(7, 18))
  await ve('Energy 0%')
})

test('the daily battery stays hidden without a weekly reset time', async ($, on) => {
  const { ve } = await comCotaDia($, on)
  await $.session.measure({ context: { tokens: 1000, window: 200000, percent: 1 }, rateLimits: [{ kind: 'seven_day', percentUsed: 39 }], changed: [] })
  await ve(null)
})
