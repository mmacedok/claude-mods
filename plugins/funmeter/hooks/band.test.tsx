import { test, expect, mock } from 'claude-code/testing'

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
