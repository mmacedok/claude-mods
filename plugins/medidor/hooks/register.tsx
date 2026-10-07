import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { Fatias, Limite, Medida } from '../types'

const ZERO: Fatias = { lido: 0, escrito: 0, input: 0, output: 0 }

const fatias = atom({ plugin: 'medidor', key: 'fatias' } as const, null)
const medida = atom({ plugin: 'medidor', key: 'medida' } as const, null)
const skills = atom({ plugin: 'medidor', key: 'skills' } as const, [])
const totais = atom({ plugin: 'medidor', key: 'totais' } as const, ZERO)
const custo = atom({ plugin: 'medidor', key: 'custo' } as const, null)
const estimado = atom({ plugin: 'medidor', key: 'estimado' } as const, 0)
const limites = atom({ plugin: 'medidor', key: 'limites' } as const, [])
const ocupado = atom({ plugin: 'medidor', key: 'ocupado' } as const, false)
const feliz = atom({ plugin: 'medidor', key: 'feliz' } as const, false)
const piso = atom({ plugin: 'medidor', key: 'piso' } as const, null)
const mensagens = atom({ plugin: 'medidor', key: 'mensagens' } as const, 0)
const fechado = atom({ plugin: 'medidor', key: 'fechado' } as const, null)

const LARANJA = '#D77757'
const CLARO = '#EE9C78'
const SOMBRA = '#B35E40'
const PERNA = '#A24F35'
const PERNA_SOMBRA = '#7F3C27'
const ESCURO = '#1a1a1a'
const BRILHO = '#F2C14E'
const CABO = '#8E8E89'
const CABO_CLARO = '#B9B9B3'
const VERMELHO = '#E24B4A'
const CEL = 5
const COLUNAS = 15
const LINHAS = 12

type Modo = 'idle' | 'working' | 'happy'

function ret(x: number, y: number, w: number, h: number, cor: string) {
  return `<rect x="${x * CEL}" y="${y * CEL}" width="${w * CEL}" height="${h * CEL}" fill="${cor}"/>`
}

// Retângulo em pixels (luz e sombra de 1 a 4 px).
function px(x: number, y: number, w: number, h: number, cor: string, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cor}"${extra}/>`
}

const arred = (v: number) => String(Math.round(v * 100) / 100)

// Uma "trilha" é uma animação SMIL em passos que se repete a cada `total` segundos.
// Cada evento começa em `em` e roda uma lista de passos [valores..., duração]; depois volta ao valor base.
type Evento = { em: number; passos: number[][] }

function trilha(tipo: 'translate' | 'scale' | 'opacity', total: number, base: number[], eventos: Evento[]) {
  const pts: { t: number; v: number[] }[] = [{ t: 0, v: base }]
  for (const ev of [...eventos].sort((a, b) => a.em - b.em)) {
    let t = ev.em
    for (const p of ev.passos) {
      pts.push({ t, v: p.slice(0, -1) })
      t += p[p.length - 1]
    }
    pts.push({ t, v: base })
  }
  const seq: { t: number; v: number[] }[] = []
  for (const p of pts) {
    const ult = seq[seq.length - 1]
    if (ult && Math.abs(ult.t - p.t) < 1e-6) {
      seq[seq.length - 1] = p
    } else {
      seq.push(p)
    }
  }
  const fmt = (v: number[]) => (tipo === 'translate' ? `${arred(v[0] * CEL)} ${arred(v[1] * CEL)}` : v.map(arred).join(' '))
  const values = seq.map(p => fmt(p.v)).join(';')
  const keyTimes = seq.map(p => arred(p.t / total)).join(';')
  const comum = `calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${total}s" repeatCount="indefinite"`
  return tipo === 'opacity'
    ? `<animate attributeName="opacity" ${comum}/>`
    : `<animateTransform attributeName="transform" type="${tipo}" ${comum}/>`
}

const repetir = (passos: number[][], vezes: number) => Array.from({ length: vezes }, () => passos).flat()

// Mascote do Claude em SVG animado (SMIL), sem fundo, com luz e sombra.
// idle: ciclo de 48 s. Primeira metade: olhar em volta, acenar, cabo, pulo, dancinha.
// Segunda metade: laptop com código atrás, bola de disco com dança, e buraco no chão. Respiração e piscadas o tempo todo.
function mascote(modo: Modo): string {
  const x0 = 3
  const y0 = 4
  const cx = (x0 + 4.5) * CEL
  const pes = (y0 + 7) * CEL
  const T = 48
  const idle = modo === 'idle'
  const trab = modo === 'working'
  const feliz = modo === 'happy'

  // Momentos do ciclo (idle), em segundos
  const T_OLHAR = 2
  const T_ACENAR = 6
  const T_CABO = 10
  const T_PULO = 15
  const T_DANCA = 19
  const T_LAPTOP = 26 // 26 → 32,3
  const T_DISCO = 34 // 34 → 40,8 (dança de 35,4 a 40,2)
  const T_DANCA2 = T_DISCO + 1.4
  const T_BURACO = 42 // 42 → 47,6
  const T_QUEDA = T_BURACO + 1.7
  const D_QUEDA = 0.59 + 1.9 + 0.63 // cai, fica embaixo, sai

  // ---- Peças com luz e sombra
  const corpo =
    ret(x0, y0, 9, 5, LARANJA) +
    px(x0 * CEL, y0 * CEL, 9 * CEL, 3, CLARO) +
    px(x0 * CEL, y0 * CEL, 3, 5 * CEL, CLARO) +
    px((x0 + 9) * CEL - 3, y0 * CEL, 3, 5 * CEL, SOMBRA) +
    px(x0 * CEL, (y0 + 5) * CEL - 4, 9 * CEL, 4, SOMBRA)
  const braco = (x: number, anim: string) =>
    `<g>${ret(x, y0 + 2, 2, 2, LARANJA)}${px(x * CEL, (y0 + 2) * CEL, 2 * CEL, 3, CLARO)}${px(x * CEL, (y0 + 4) * CEL - 3, 2 * CEL, 3, SOMBRA)}${anim}</g>`
  const perna = (x: number) => ret(x, y0 + 5, 1, 2, PERNA) + px((x + 1) * CEL - 2, (y0 + 5) * CEL, 2, 2 * CEL, PERNA_SOMBRA)
  const pernasA = [x0 + 1, x0 + 3, x0 + 5, x0 + 7].map(perna).join('')
  const pernasB = [x0, x0 + 2, x0 + 6, x0 + 8].map(perna).join('')

  // ---- Olhos: aberto, fechado (piscada) e feliz (^ ^) se alternam por opacidade; o conjunto olha em volta
  const olhoAberto = (ex: number) =>
    px(ex * CEL, (y0 + 1) * CEL, CEL, 2 * CEL, ESCURO) + px(ex * CEL + 1, (y0 + 1) * CEL + 1, 2, 2, '#ffffff', ' opacity="0.75"')
  const olhoFechado = (ex: number) => px(ex * CEL, (y0 + 2) * CEL - 1, CEL, 2, ESCURO)
  const olhoFeliz = (ex: number) =>
    ret(ex, y0 + 1, 1, 1, ESCURO) + ret(ex - 1, y0 + 2, 1, 1, ESCURO) + ret(ex + 1, y0 + 2, 1, 1, ESCURO)
  const ex2 = [x0 + 2, x0 + 6]

  let olhos: string
  if (feliz) {
    olhos = `<g>${ex2.map(olhoFeliz).join('')}</g>`
  } else {
    const totalOlhos = trab ? 4.8 : T
    const piscadas = trab ? [1.5, 3.9] : [4.4, 8.6, 12.9, 13.25, 17.6, 21.9, 24.6, 28.9, 33.8, 41.5]
    const pisca: Evento[] = piscadas.map(em => ({ em, passos: [[1, 0.12]] }))
    const alegria: Evento[] = idle
      ? [
          { em: T_ACENAR, passos: [[1, 1.4]] },
          { em: T_PULO + 0.2, passos: [[1, 0.65]] },
          { em: T_DANCA, passos: [[1, 2.4]] },
          { em: T_LAPTOP + 5.6, passos: [[1, 1.2]] },
          { em: T_DANCA2, passos: [[1, 4.8]] },
          { em: T_QUEDA + 2.8, passos: [[1, 1.1]] },
        ]
      : []
    const somem: Evento[] = [...pisca, ...alegria].map(e => ({ em: e.em, passos: [[0, e.passos[0][1]]] }))
    const olhar = trab
      ? trilha('translate', 1.6, [0, 0], [{ em: 0.01, passos: [[-1, 0, 0.4], [0, 0, 0.4], [1, 0, 0.4], [0, 0, 0.39]] }])
      : trilha('translate', T, [0, 0], [
          { em: T_OLHAR, passos: [[-1, 0, 0.7], [0, 0, 0.25], [1, 0, 0.7], [0, 0, 0.25]] },
          { em: T_DISCO + 0.2, passos: [[0, -1, 1.2]] }, // olha a bola descer
          { em: T_BURACO + 0.5, passos: [[0, 1, 1.2]] }, // olha dentro do buraco
        ])
    olhos =
      `<g>` +
      `<g>${ex2.map(olhoAberto).join('')}${trilha('opacity', totalOlhos, [1], somem)}</g>` +
      `<g opacity="0">${ex2.map(olhoFechado).join('')}${trilha('opacity', totalOlhos, [0], pisca)}</g>` +
      (idle ? `<g opacity="0">${ex2.map(olhoFeliz).join('')}${trilha('opacity', totalOlhos, [0], alegria)}</g>` : '') +
      `${olhar}</g>`
  }

  // ---- Braços
  let bracoE: string
  let bracoD: string
  if (trab) {
    bracoE = braco(x0 - 2, trilha('translate', 0.6, [0, 0], [{ em: 0.3, passos: [[0, -1, 0.3]] }]))
    bracoD = braco(x0 + 9, trilha('translate', 0.6, [0, 0], [{ em: 0, passos: [[0, -1, 0.3]] }]))
  } else if (feliz) {
    bracoE = braco(x0 - 2, trilha('translate', 0.3, [0, -3], [{ em: 0, passos: [[0, -2, 0.15]] }]))
    bracoD = braco(x0 + 9, trilha('translate', 0.3, [0, -2], [{ em: 0, passos: [[0, -3, 0.15]] }]))
  } else {
    const aceno = [[0, -2, 0.2], [0, -1, 0.2], [0, -2, 0.2], [0, -1, 0.2], [0, -2, 0.2], [0, -1, 0.2], [0, -2, 0.2]]
    const dancaE = repetir([[0, -1, 0.3], [0, 0, 0.3]], 4)
    const dancaD = repetir([[0, 0, 0.3], [0, -1, 0.3]], 4)
    const disco = (e: boolean) => repetir(e ? [[0, -1, 0.3], [0, 0, 0.3]] : [[0, 0, 0.3], [0, -1, 0.3]], 8)
    const queda = [[0, -2, D_QUEDA]] // braços pra cima ao cair e ao sair do buraco
    const digita = [[0, 1, 5.2]] // braços baixos, no teclado
    bracoE = braco(
      x0 - 2,
      trilha('translate', T, [0, 0], [
        { em: T_DANCA, passos: dancaE },
        { em: T_LAPTOP + 1, passos: digita },
        { em: T_DANCA2, passos: disco(true) },
        { em: T_QUEDA, passos: queda },
      ]),
    )
    bracoD = braco(
      x0 + 9,
      trilha('translate', T, [0, 0], [
        { em: T_ACENAR, passos: aceno },
        { em: T_DANCA, passos: dancaD },
        { em: T_LAPTOP + 1, passos: digita },
        { em: T_DANCA2, passos: disco(false) },
        { em: T_QUEDA, passos: queda },
      ]),
    )
  }

  // ---- Pernas (duas posições que se alternam ao andar e dançar)
  let pernas: string
  if (trab) {
    pernas =
      `<g>${pernasA}${trilha('opacity', 0.5, [1], [{ em: 0.25, passos: [[0, 0.25]] }])}</g>` +
      `<g opacity="0">${pernasB}${trilha('opacity', 0.5, [0], [{ em: 0.25, passos: [[1, 0.25]] }])}</g>`
  } else if (idle) {
    const passoA = repetir([[0, 0.3], [1, 0.3]], 4)
    const passoB = repetir([[1, 0.3], [0, 0.3]], 4)
    const passoA2 = repetir([[0, 0.3], [1, 0.3]], 8)
    const passoB2 = repetir([[1, 0.3], [0, 0.3]], 8)
    pernas =
      `<g>${pernasA}${trilha('opacity', T, [1], [{ em: T_DANCA, passos: passoA }, { em: T_DANCA2, passos: passoA2 }])}</g>` +
      `<g opacity="0">${pernasB}${trilha('opacity', T, [0], [{ em: T_DANCA, passos: passoB }, { em: T_DANCA2, passos: passoB2 }])}</g>`
  } else {
    pernas = pernasA
  }

  // ---- Cabo: estica de trás da cabeça, balança e recolhe (idle); no trabalho fica ligado e pulsando
  const col = x0 + 6
  const celulaCabo = (y: number) => ret(col, y, 1, 1, CABO) + px(col * CEL, y * CEL, 2, CEL, CABO_CLARO)
  const plugue = ret(col, y0 - 4, 1, 1, VERMELHO) + px(col * CEL, (y0 - 4) * CEL, CEL, 2, '#F2827F')
  const aparece = (ini: number, fim: number) => trilha('opacity', T, [0], [{ em: ini, passos: [[1, fim - ini]] }])
  const onda = (em: number) =>
    trilha('translate', T, [0, 0], [{ em, passos: repetir([[1, 0, 0.2], [0, 0, 0.2], [-1, 0, 0.2], [0, 0, 0.2]], 2) }])
  let cabo = ''
  if (trab) {
    cabo =
      celulaCabo(y0 - 1) +
      celulaCabo(y0 - 2) +
      celulaCabo(y0 - 3) +
      `<g>${plugue}${trilha('opacity', 0.6, [1], [{ em: 0.3, passos: [[0.35, 0.3]] }])}</g>`
  } else if (idle) {
    const t0 = T_CABO
    cabo =
      `<g opacity="0">${celulaCabo(y0 - 1)}${aparece(t0, t0 + 3)}</g>` +
      `<g>${onda(t0 + 0.9)}` +
      `<g opacity="0">${celulaCabo(y0 - 2)}${aparece(t0 + 0.15, t0 + 2.85)}</g>` +
      `<g>${onda(t0 + 1)}` +
      `<g opacity="0">${celulaCabo(y0 - 3)}${aparece(t0 + 0.3, t0 + 2.7)}</g>` +
      `<g opacity="0">${plugue}${aparece(t0 + 0.45, t0 + 2.55)}</g>` +
      `</g></g>`
  }

  // ---- Cenas novas (idle): laptop, bola de disco e buraco
  let laptop = ''
  let fundo = ''
  let luzes = ''
  let terra = ''
  if (idle) {
    // Laptop: desliza da direita, ele digita, o código aparece atrás dele (linha por linha) e o laptop sai
    const fimLap = T_LAPTOP + 6.7
    const painel =
      `<g opacity="0">${trilha('opacity', T, [0], [{ em: T_LAPTOP + 0.7, passos: [[0.4, 0.2], [1, 5.9]] }])}` +
      px(4, 0, 67, 38, '#0d1117') +
      px(4, 0, 67, 4, '#1f2630') +
      px(7, 1, 2, 2, VERMELHO) +
      px(11, 1, 2, 2, '#D4B83A') +
      px(15, 1, 2, 2, '#639922') +
      `</g>`
    const AZUL = '#8fb4ff'
    const linhas: [number, number, number, string][] = [
      [8, 7, 22, LARANJA],
      [12, 11, 30, '#639922'],
      [12, 15, 18, '#D4B83A'],
      [40, 7, 26, AZUL],
      [46, 11, 20, '#639922'],
      [46, 15, 14, LARANJA],
      [8, 19, 6, AZUL],
      [62, 21, 6, '#D4B83A'],
      [8, 27, 8, '#639922'],
      [64, 29, 5, LARANJA],
    ]
    const codigo = linhas
      .map(([lx, ly, lw, c], i) => {
        const ini = T_LAPTOP + 1.2 + i * 0.45
        return `<g opacity="0">${px(lx, ly, lw, 2, c)}${trilha('opacity', T, [0], [{ em: ini, passos: [[1, fimLap - 0.2 - ini]] }])}</g>`
      })
      .join('')
    const digitar = repetir([[0, 0.2, 0.15], [0, 0, 0.15]], 16)
    const maos =
      `<g>${px(12, 41, 12, 5, LARANJA)}${px(12, 41, 12, 1, CLARO)}${trilha('translate', T, [0, 0], [{ em: T_LAPTOP + 1.1, passos: digitar }])}</g>` +
      `<g>${px(51, 42, 12, 5, LARANJA)}${px(51, 42, 12, 1, CLARO)}${trilha('translate', T, [0, 0], [{ em: T_LAPTOP + 1.25, passos: digitar }])}</g>`
    const tampa = px(22, 37, 31, 8, '#6f6f6a') + px(22, 37, 31, 2, '#8E8E89') + px(35, 40, 4, 3, CLARO)
    const baseLap = px(18, 45, 39, 3, '#8E8E89') + px(18, 45, 39, 1, '#B9B9B3') + px(18, 47, 39, 1, '#5d5d58')
    laptop =
      `<g opacity="0">${trilha('opacity', T, [0], [{ em: T_LAPTOP, passos: [[1, 6.3]] }])}` +
      `<g>${trilha('translate', T, [8, 0], [{ em: T_LAPTOP, passos: [[6, 0, 0.1], [4, 0, 0.1], [2, 0, 0.1], [0.6, 0, 0.1], [0, 0, 5.5], [2, 0, 0.1], [4, 0, 0.1], [6, 0, 0.1], [8, 0, 0.1]] }])}` +
      `${tampa}${baseLap}${maos}</g></g>`

    // Bola de disco: desce no fio (com quique), brilha, e sobe de novo; luzes coloridas piscam
    const facetas = 'M32 8h11M31 11h13M32 14h11M35 5v12M38 5v12M41 5v12'
    const brilho1 = px(34, 7, 2, 2, '#ffffff') + px(40, 13, 2, 2, '#ffffff')
    const brilho2 = px(38, 7, 2, 2, '#ffffff') + px(33, 12, 2, 2, '#ffffff')
    const pisca2 = (inicial: number) =>
      trilha('opacity', T, [0], [{ em: T_DANCA2 - 0.6, passos: repetir(inicial ? [[1, 0.25], [0, 0.25]] : [[0, 0.25], [1, 0.25]], 11) }])
    const bola =
      `<g>${trilha('translate', T, [0, -5], [{ em: T_DISCO, passos: [[0, -3.5, 0.12], [0, -2, 0.12], [0, -0.8, 0.12], [0, 0.5, 0.1], [0, 0, 5.9], [0, -1, 0.12], [0, -2.5, 0.12], [0, -4, 0.12], [0, -5, 0.1]] }])}` +
      px(37, -30, 1, 36, '#aaaaaa') +
      `<circle cx="37.5" cy="11" r="6" fill="#cfcfcf"/>` +
      `<path d="M40 6a6 6 0 0 1 0 10a4 5 0 0 0 0-10z" fill="#9a9a9a" opacity=".55"/>` +
      `<path d="${facetas}" stroke="#7a7a7a" stroke-width="0.6" fill="none"/>` +
      `<g opacity="0">${brilho1}${pisca2(1)}</g><g opacity="0">${brilho2}${pisca2(0)}</g></g>`
    const spots1: [number, number, number, string][] = [
      [6, 8, 4, '#E24B4A'],
      [62, 6, 4, '#D4B83A'],
      [10, 28, 3, '#639922'],
      [64, 24, 3, '#8fb4ff'],
      [25, 6, 3, '#D4B83A'],
      [48, 4, 3, '#E24B4A'],
    ]
    const spots2: [number, number, number, string][] = [
      [12, 4, 4, '#8fb4ff'],
      [58, 10, 4, '#E24B4A'],
      [6, 22, 3, '#D4B83A'],
      [66, 30, 3, '#639922'],
      [30, 3, 3, '#639922'],
      [52, 3, 3, '#8fb4ff'],
    ]
    const luz = (l: [number, number, number, string][], inicial: number) =>
      `<g opacity="0">${l.map(([sx, sy, ss, c]) => px(sx, sy, ss, ss, c, ' opacity="0.8"')).join('')}${trilha('opacity', T, [0], [{ em: T_DANCA2, passos: repetir(inicial ? [[1, 0.3], [0, 0.3]] : [[0, 0.3], [1, 0.3]], 8) }])}</g>`
    luzes = luz(spots1, 1) + luz(spots2, 0)

    // Buraco: abre no chão, ele olha, cai (esticando) e sai de dentro (esticando e amassando); terra voa
    const buraco =
      `<g transform="translate(${cx} ${pes + 2})" opacity="0">${trilha('opacity', T, [0], [{ em: T_BURACO, passos: [[1, 5.6]] }])}` +
      `<g>${trilha('scale', T, [1, 1], [{ em: T_BURACO, passos: [[0.2, 0.2, 0.1], [0.6, 0.6, 0.1], [1.1, 1.1, 0.1], [1, 1, 5.1], [0.6, 0.6, 0.1], [0.2, 0.2, 0.1]] }])}` +
      `<ellipse cx="0" cy="0" rx="26" ry="4" fill="#000000" fill-opacity="0.85" stroke="#3a3a3a" stroke-width="1"/>` +
      `<ellipse cx="0" cy="-1" rx="22" ry="2" fill="#1a1a1a" fill-opacity="0.7"/></g></g>`
    fundo = painel + codigo + bola + buraco
    const bit = (bx: number, by: number, dx: number, dy: number) =>
      `<g opacity="0">${px(bx, by, 2, 2, PERNA)}${trilha('opacity', T, [0], [{ em: T_QUEDA + 2.5, passos: [[1, 0.55]] }])}` +
      `${trilha('translate', T, [0, 0], [{ em: T_QUEDA + 2.5, passos: [[dx * 0.4, dy * 0.7, 0.11], [dx * 0.8, dy, 0.11], [dx * 1.2, dy * 0.8, 0.11], [dx * 1.6, dy * 0.3, 0.11], [dx * 2, dy * -0.3, 0.11]] }])}</g>`
    terra = bit(34, 50, -1, -2.5) + bit(40, 50, 1, -2.5) + bit(30, 52, -2, -1.5) + bit(45, 52, 2, -1.5)
  }

  // ---- Extras: pontinhos de "pensando" (trabalho), brilhos (alegria) e, no idle, luzes da pista e terra do buraco
  let extras = ''
  if (trab) {
    extras = [0, 1, 2]
      .map(
        i =>
          `<g opacity="0">${ret(x0 + 9 + i * 2, 1, 1, 1, LARANJA)}${trilha('opacity', 1.2, [0], [{ em: i * 0.25, passos: [[1, 1.0 - i * 0.25]] }])}</g>`,
      )
      .join('')
  } else if (feliz) {
    const brilho = (bx: number, by: number, atraso: number) =>
      `<g>${ret(bx, by, 1, 1, BRILHO)}${ret(bx - 1, by, 1, 1, BRILHO)}${ret(bx + 1, by, 1, 1, BRILHO)}${ret(bx, by - 1, 1, 1, BRILHO)}${ret(bx, by + 1, 1, 1, BRILHO)}${trilha('opacity', 0.5, [1], [{ em: atraso, passos: [[0.3, 0.25]] }])}</g>`
    extras = brilho(1, 2, 0.01) + brilho(13, 1, 0.26)
  } else {
    extras = luzes + terra
  }

  // ---- Movimento do corpo todo
  // respiração (contínua)
  const respira = trab
    ? trilha('translate', 0.5, [0, 0], [{ em: 0.25, passos: [[0, 0.5, 0.25]] }])
    : trilha('translate', 3, [0, 0], [{ em: 1.5, passos: [[0, 0.5, 1.5]] }])
  // pulo, com agachar antes, esticar no ar e amassar ao pousar
  const pulo = feliz
    ? trilha('translate', 0.7, [0, 0], [{ em: 0.01, passos: [[0, 0, 0.08], [0, -1.5, 0.08], [0, -2.5, 0.1], [0, -3, 0.1], [0, -2.5, 0.1], [0, -1.5, 0.08], [0, 0, 0.15]] }])
    : idle
      ? trilha('translate', T, [0, 0], [{ em: T_PULO, passos: [[0, 0, 0.2], [0, -1, 0.07], [0, -2, 0.09], [0, -2.5, 0.1], [0, -2, 0.09], [0, -1, 0.07], [0, 0, 0.15]] }])
      : ''
  // queda no buraco: desce rápido, fica escondido sob o chão e sobe com um pulinho de overshoot
  const caida = idle
    ? trilha('translate', T, [0, 0], [
        {
          em: T_QUEDA,
          passos: [
            [0, -0.6, 0.15], [0, 0.5, 0.08], [0, 2, 0.07], [0, 4, 0.07], [0, 7, 0.07], [0, 10, 0.07], [0, 13, 0.08],
            [0, 13, 1.9],
            [0, 8, 0.1], [0, 3, 0.09], [0, -1, 0.08], [0, -3, 0.1], [0, -1, 0.08], [0, 0.5, 0.08], [0, 0, 0.1],
          ],
        },
      ])
    : ''
  const amassa = feliz
    ? trilha('scale', 0.7, [1, 1], [{ em: 0.01, passos: [[1.1, 0.85, 0.08], [0.94, 1.1, 0.54], [1.1, 0.85, 0.07]] }])
    : idle
      ? trilha('scale', T, [1, 1], [
          { em: T_PULO, passos: [[1.1, 0.85, 0.2], [0.92, 1.12, 0.42], [1.12, 0.8, 0.15]] },
          { em: T_DANCA2, passos: repetir([[1.06, 0.94, 0.3], [0.96, 1.05, 0.3]], 8) }, // balanço da dança
          { em: T_QUEDA, passos: [[0.95, 1.12, 0.15], [0.92, 1.18, 0.44]] }, // estica ao cair
          { em: T_QUEDA + 2.5, passos: [[0.92, 1.18, 0.27], [1.12, 0.82, 0.1], [1, 1, 0.1]] }, // estica ao sair e amassa ao pousar
        ])
      : ''
  // dancinha: o corpo balança de lado a lado
  const balanca = idle
    ? trilha('translate', T, [0, 0], [
        { em: T_DANCA, passos: repetir([[-1, 0, 0.3], [0, 0, 0.3], [1, 0, 0.3], [0, 0, 0.3]], 2) },
        { em: T_DANCA2, passos: repetir([[-1, 0, 0.3], [0, 0, 0.3], [1, 0, 0.3], [0, 0, 0.3]], 4) },
      ])
    : ''

  // sombra no chão (clareia no ar, some enquanto ele está no buraco)
  const noAr = feliz
    ? trilha('opacity', 0.7, [0.22], [{ em: 0.09, passos: [[0.08, 0.54]] }])
    : idle
      ? trilha('opacity', T, [0.22], [
          { em: T_PULO + 0.2, passos: [[0.08, 0.42]] },
          { em: T_QUEDA - 0.1, passos: [[0, D_QUEDA + 0.1]] },
        ])
      : ''
  const sombra = `<g opacity="0.22">${px((x0 + 0.5) * CEL, (y0 + 7) * CEL, 8 * CEL, CEL, '#000000')}${noAr}</g>`

  const conteudo = cabo + corpo + bracoE + bracoD + pernas + olhos + laptop
  const w = COLUNAS * CEL
  const h = LINHAS * CEL
  // O corte ao nível do chão faz o corpo sumir dentro do buraco.
  const corte = `<defs><clipPath id="chao"><rect x="-30" y="-60" width="${w + 60}" height="${60 + pes + 3}"/></clipPath></defs>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">` +
    corte +
    sombra +
    fundo +
    `<g clip-path="url(#chao)"><g>${respira}<g>${pulo}<g>${caida}<g transform="translate(${cx} ${pes})"><g>${amassa}<g transform="translate(${-cx} ${-pes})"><g>${balanca}${conteudo}</g></g></g></g></g></g></g></g>` +
    extras +
    `</svg>`
  )
}

const CASA = ((globalThis as any).process?.env?.USERPROFILE ?? (globalThis as any).process?.env?.HOME ?? '').split('\').join('/')
const PASTA_HANDOFFS = `${CASA}/.claude/medidor-handoffs`

const PEDIDO_HANDOFF = `Write a HANDOFF of this conversation so that a fresh session, with no history, can continue the current work without losing anything important. Write it in the language the user writes in, direct, no introduction, at most ~400 words, in these sections:

## Current goal
What we are doing right now and what "done" means.
## State
What is already done and verified; what is half done.
## Files and paths
The exact paths that matter, with the role of each.
## Decisions and preferences
Choices already made with the user and rules that apply to this task.
## Next steps
A short, ordered list of what is left.

Leave out topics already closed that do not affect the current work.`

// USD per million tokens. Cache writes at 2x input (1-hour TTL, the one Claude Code uses).
const PRECOS: Record<string, { input: number; output: number; lido: number }> = {
  'claude-fable-5-1': { input: 10, output: 50, lido: 0.25 },
  'claude-opus-5-5': { input: 4, output: 20, lido: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, lido: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, lido: 0.1 },
}

const preco = (modelo: string) =>
  PRECOS[Object.keys(PRECOS).find(id => modelo.includes(id)) ?? 'claude-opus-5-5']

const valor = (f: Fatias, modelo: string) => {
  const p = preco(modelo)
  if (!p) return 0
  return (f.input * p.input + f.escrito * p.input * 2 + f.lido * p.lido + f.output * p.output) / 1e6
}

// Cheapest to most expensive per token: cache read (0.1x input), input, cache write (2x), output (5x).
const TIPOS = [
  { campo: 'lido', nome: 'cache read', cor: '#639922' },
  { campo: 'input', nome: 'input', cor: '#D4B83A' },
  { campo: 'escrito', nome: 'cache write', cor: '#EF9F27' },
  { campo: 'output', nome: 'output', cor: '#E24B4A' },
] as const

const LIVRE = '#5F5E5A'
const MAX_SKILLS = 3

const escala = (n: number, total: number) => (n > 0 ? Math.max(1, Math.round((n / total) * 1000)) : 0)

// 950 · 12.3k · 184k · 1.25M · 12.5M
const num = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}k`
  return String(Math.round(n))
}

const usd = (v: number) => `$${v.toFixed(2)}`

const soma = (f: Fatias) => f.lido + f.escrito + f.input + f.output

// Cache hit: da parte que o modelo leu de entrada (cache read + cache write + input), quanto veio do cache. Output não conta.
const acerto = (f: Fatias): number | null => {
  const entrada = f.lido + f.escrito + f.input
  return entrada > 0 ? Math.round((f.lido / entrada) * 100) : null
}
const corAcerto = (p: number | null) => (p === null ? undefined : p >= 90 ? '#639922' : p >= 70 ? '#D4B83A' : '#E24B4A')

const deUso = (u: ModelUsage): Fatias => ({
  lido: u.cache_read_input_tokens,
  escrito: u.cache_creation_input_tokens,
  input: u.input_tokens,
  output: u.output_tokens,
})

const falta = (resetsAt: string | undefined, agora: number) => {
  if (!resetsAt) return ''
  const min = Math.max(0, Math.round((Date.parse(resetsAt) - agora) / 60000))
  return ` · resets in ${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

// Barra de contexto no estilo do plan-progress: trilho cinza arredondado e, até o fim do preenchimento, pontinhos de 2 px
// numa grade de 3 px (7 linhas), mais densos e mais coloridos perto da ponta, na cor do tipo de token, piscando em 4 ritmos.
const BARRA_W = 505
const BARRA_H = 22
// a barra inteira vale metade da janela: o contexto quase nunca passa de 50%, então cada pedaço fica com o dobro do espaço
const ZOOM = 0.5
const CINZA = [132, 130, 138]
const rgbDe = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const misturar = (a: number[], b: number[], m: number) => a.map((v, i) => Math.round(v + ((b[i] ?? 0) - v) * m))
const sorteio = (a: number, b: number, k: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453
  return x - Math.floor(x)
}
const PISCA =
  '<style>.t0,.t1,.t2,.t3{animation:tw 2.2s ease-in-out infinite}.t1{animation-duration:2.8s;animation-delay:-.7s}' +
  '.t2{animation-duration:1.9s;animation-delay:-1.3s}.t3{animation-duration:3.3s;animation-delay:-.4s}' +
  '@keyframes tw{0%,100%{opacity:1}50%{opacity:.45}}@media (prefers-reduced-motion:reduce){.t0,.t1,.t2,.t3{animation:none}}</style>'

// cada tipo presente ganha um mínimo de largura, para dar para distinguir mesmo quando o cache read domina; os pedaços
// ficam colados e o degradê (ralo no começo, denso na ponta) corre pela barra inteira, cada pontinho na cor do seu tipo
const MIN_PEDACO = 36

function barraBlocos(f: Fatias, janela: number): string {
  let acum = 0
  const pedacos = TIPOS.filter(x => f[x.campo] > 0).map(x => {
    const w = Math.max(MIN_PEDACO, (f[x.campo] / (janela * ZOOM)) * BARRA_W)
    const p = { cor: x.cor, a: acum, b: acum + w }
    acum += w
    return p
  })
  const fim = Math.max(3, Math.min(BARRA_W, acum))

  // os pontinhos de um mesmo visual (tipo, tom, ritmo) vão num só path
  const pontos = new Map<string, { d: string; x: number; y: number }>()
  for (let col = 0; col * 3 < fim; col++) {
    const x = col * 3
    const tipo = Math.max(0, pedacos.findIndex(p => x + 1 < p.b))
    const u = Math.min(1, (x + 1.5) / fim)
    const denso = 0.4 + 0.6 * Math.pow(u, 1.3)
    const tom = Math.min(4, Math.floor(u * 4.99))
    for (let r = 0; r < 7; r++) {
      if (sorteio(col, r, 1) > denso + 0.1) continue
      const chave = `${tipo}-${tom}-${Math.floor(sorteio(col, r, 2) * 4)}`
      const y = 1 + r * 3
      const ant = pontos.get(chave)
      pontos.set(chave, { d: ant ? `${ant.d}m${x - ant.x} ${y - ant.y}h2v2h-2z` : `M${x} ${y}h2v2h-2z`, x, y })
    }
  }
  const px = [...pontos]
    .map(([chave, v]) => {
      const [tipo, tom, ritmo] = chave.split('-').map(Number)
      const m = tom / 4
      const base = rgbDe(pedacos[tipo]?.cor ?? '#888888')
      const cor = misturar(misturar(CINZA, base, 0.6 + 0.4 * m), [255, 255, 255], 0.2 * m)
      const op = 0.55 + 0.45 * m
      return `<path class="t${ritmo}" fill="rgb(${cor.join(',')})" fill-opacity="${op.toFixed(2)}" d="${v.d}"/>`
    })
    .join('')
  const gradientes = pedacos
    .map(
      (p, i) =>
        `<linearGradient id="g${i}" x1="0" x2="${fim.toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.cor}" stop-opacity=".08"/><stop offset="1" stop-color="${p.cor}" stop-opacity=".35"/></linearGradient>`,
    )
    .join('')
  const bases = pedacos
    .map((p, i) => `<rect x="${p.a.toFixed(1)}" width="${Math.max(0, Math.min(p.b, fim) - p.a).toFixed(1)}" height="${BARRA_H}" fill="url(#g${i})"/>`)
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BARRA_W}" height="${BARRA_H}" viewBox="0 0 ${BARRA_W} ${BARRA_H}">${PISCA}` +
    `<defs><clipPath id="pl"><rect width="${BARRA_W}" height="${BARRA_H}" rx="${BARRA_H / 2}"/></clipPath>` +
    `<clipPath id="fl"><rect width="${fim.toFixed(1)}" height="${BARRA_H}"/></clipPath>${gradientes}</defs>` +
    `<g clip-path="url(#pl)"><rect width="${BARRA_W}" height="${BARRA_H}" fill="#808080" fill-opacity=".16"/>` +
    `<g clip-path="url(#fl)">${bases}${px}</g></g></svg>`
  )
}

async function somar($: EngineInterface, f: Fatias, modelo: string) {
  const v = valor(f, modelo)
  await update($, estimado, x => x + v)
  await update($, totais, t => ({
    lido: t.lido + f.lido,
    escrito: t.escrito + f.escrito,
    input: t.input + f.input,
    output: t.output + f.output,
  }))
}

async function zerar($: EngineInterface) {
  await update($, fatias, () => null)
  await update($, medida, () => null)
  await update($, skills, () => [])
  await update($, totais, () => ZERO)
  await update($, custo, () => null)
  await update($, estimado, () => 0)
  await update($, piso, () => null)
  await update($, mensagens, () => 0)
  await update($, fechado, () => null)
}

async function limpar($: EngineInterface) {
  if (await read($, ocupado)) return
  await $.command.run({ command: 'clear' })
  await zerar($)
}

const PASTA_SESSOES = `${CASA}/.claude/projects`

async function arquivoDa($: EngineInterface, id: string): Promise<string> {
  const slug = (await $.session.cwd()).replace(/[^A-Za-z0-9]/g, '-')
  return `${PASTA_SESSOES}/${slug}/${id}.jsonl`
}

async function tituloDa($: EngineInterface, id: string): Promise<string | null> {
  try {
    const txt = String(await $.fs.read(await arquivoDa($, id)))
    const m = [...txt.matchAll(/"type":"custom-title","customTitle":"((?:[^"\\]|\\.)*)"/g)]
    return m.length ? (JSON.parse(`"${m[m.length - 1][1]}"`) as string) : null
  } catch {
    return null
  }
}

async function handoff($: EngineInterface) {
  if (await read($, ocupado)) return
  await update($, ocupado, () => true)
  try {
    const r = await $.model.fork({ prompt: PEDIDO_HANDOFF })
    if (!r.isAnswered) {
      $.ui.toast(`Handoff not generated: ${r.reason}`)
      return
    }
    await somar($, deUso(r.usage), await $.session.model())

    const id = await $.session.id()
    const caminho = `${PASTA_HANDOFFS}/handoff-${id}-${await $.clock.now()}.md`
    let salvo = true
    try {
      await $.fs.write(caminho, r.text)
    } catch {
      salvo = false
    }

    const texto = `Handoff from the previous session${salvo ? ` (saved at ${caminho})` : ''}:

${r.text}

Continue the work from the next steps above.`
    const titulo = await tituloDa($, id)
    const arquivo = await arquivoDa($, id)

    // Move to a new session: /branch where this build has it, otherwise /clear (fresh context, the handoff carries the work).
    try {
      await $.command.run({ command: 'branch' })
    } catch (erro) {
      if (!String(erro).includes('no command named')) {
        $.ui.toast(`Handoff: fork failed (${String(erro)})`)
        return
      }
      try {
        await $.command.run({ command: 'clear' })
      } catch (erro2) {
        $.ui.toast(`Handoff: could not start a new session (${String(erro2)})`)
        return
      }
    }
    const novoId = await $.session.id()
    if (novoId === id) {
      $.ui.toast('Handoff: fork did not switch the session, nothing was deleted')
      return
    }
    await zerar($)
    if (titulo) await $.command.run({ command: 'rename', args: titulo }).catch(() => undefined)
    void $.prompt.submit({ text: texto, asUser: true })
    $.ui.toast('Handoff sent in the fork; removing the old session')
    try {
      await $.process.run({ argv: ['cmd', '/c', 'del', '/q', arquivo.split('/').join('\\')] })
    } catch {
      $.ui.toast(`Handoff: could not delete the old session (${arquivo})`)
    }
  } finally {
    await update($, ocupado, () => false)
  }
}

// Quando o handoff vale a pena (botão laranja).
// Cada mensagem reenvia o contexto; lido do cache custa ~1/10 do preço de entrada.
// O handoff troca o contexto atual pelo piso (o tamanho da 1ª mensagem da sessão)
// e custa uma vez ~HANDOFF_CUSTO (escrever o resumo, cache novo, reler arquivos).
const HANDOFF_CUSTO = 30000
const HANDOFF_PAGA = 5 // laranja se o handoff se paga em até 5 mensagens…
const HANDOFF_MIN_MSGS = 8 // …e a conversa já tem 8 mensagens (sinal de que vai continuar)
const HANDOFF_PCT = 60 // ou, de qualquer jeito, a partir de 60% da janela
const REAPARECE_MSGS = 5 // fechado no ✕, o aviso volta depois de 5 mensagens
const FORCAR_LARANJA = false // true mostra o aviso sempre (para testar o visual)

function valeHandoff(ctx: number, base: number | null, msgs: number, percent: number) {
  if (percent >= HANDOFF_PCT) return true
  const extra = ctx - (base ?? ctx)
  if (extra <= 0 || msgs < HANDOFF_MIN_MSGS) return false
  return HANDOFF_CUSTO / (extra * 0.1) <= HANDOFF_PAGA
}

async function fecharAviso($: EngineInterface) {
  const n = await read($, mensagens)
  await update($, fechado, () => n)
}

export const register: Register = on => {
  const turnosContados = new Set<string>()

  on('session.start', ($, e, next) => {
    $.ui.status(undefined)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await zerar($)
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    if (r.usage) {
      const f = deUso(r.usage)
      turnosContados.add(e.turnId)
      await somar($, f, e.model)
      if (!e.agentId) {
        await update($, fatias, () => f)
        await update($, piso, p => p ?? soma(f))
      }
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.usage && !turnosContados.has(e.turnId)) {
      const f = deUso(e.usage)
      await somar($, f, e.usage.model)
      if (!e.agentId) {
        await update($, fatias, () => f)
        await update($, piso, p => p ?? soma(f))
      }
    }
    turnosContados.delete(e.turnId)
    if (!e.agentId) {
      await update($, mensagens, n => n + 1)
      await update($, feliz, () => true)
      $.clock.after(4000, () => update($, feliz, () => false))
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    const c = e.context
    if (c.tokens !== undefined) {
      const m: Medida = { tokens: c.tokens, janela: c.window, percent: c.percent ?? 0 }
      await update($, medida, () => m)
    }
    if (e.cost) {
      const v = e.cost.usd
      await update($, custo, () => v)
    }
    const l: Limite[] = e.rateLimits.map(x => ({ kind: x.kind, percentUsed: x.percentUsed, resetsAt: x.resetsAt }))
    await update($, limites, () => l)
    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    await update($, skills, s => (s.includes(e.skill) ? s : [...s, e.skill]))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const acima = await next(e)
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const Svg = 'Svg' in ui ? ui.Svg : undefined
    const f = await read($, fatias)
    if (f === null) {
      return (
        <Box flexDirection="column">
          {acima}
          <Text dimColor>Context meter: waiting for the first response…</Text>
        </Box>
      )
    }

    const m = await read($, medida)
    const t = await read($, totais)
    const gasto = await read($, custo)
    const estimativa = await read($, estimado)
    const usadas = await read($, skills)
    const cincoHoras = (await read($, limites)).find(x => x.kind === 'five_hour')
    const gerando = await read($, ocupado)
    const contente = await read($, feliz)
    const modo: Modo = e.props.isWorking ? 'working' : contente ? 'happy' : 'idle'
    const agora = await $.clock.now()
    const janela = m?.janela ?? 200000
    const ocupadoCtx = soma(f)
    const livre = Math.max(janela - ocupadoCtx, 0)
    const percent = m?.percent ?? Math.round((ocupadoCtx / janela) * 100)
    const corPct = percent >= 85 ? '#E24B4A' : undefined
    const corLimite = cincoHoras && cincoHoras.percentUsed >= 80 ? '#E24B4A' : undefined
    const base = await read($, piso)
    const msgs = await read($, mensagens)
    const fechouEm = await read($, fechado)
    const extra = ocupadoCtx - (base ?? ocupadoCtx)
    const vale = FORCAR_LARANJA || valeHandoff(ocupadoCtx, base, msgs, percent)
    const aviso = vale && (fechouEm === null || msgs - fechouEm >= REAPARECE_MSGS)
    const textoAviso =
      extra > 0
        ? `Good time for a handoff: ${num(extra)} tokens of history, it pays for itself in ~${Math.max(1, Math.ceil(HANDOFF_CUSTO / (extra * 0.1)))} messages`
        : `Good time for a handoff: context at ${percent}%`
    const listaSkills =
      usadas.length === 0
        ? 'none'
        : usadas.slice(-MAX_SKILLS).join(' · ') +
          (usadas.length > MAX_SKILLS ? ` +${usadas.length - MAX_SKILLS}` : '')

    return (
      <Box flexDirection="column">
      {acima}
      {aviso && (
        <Box
          key="aviso-handoff"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={LARANJA}
          borderStyle="round"
          borderColor={LARANJA}
          marginBottom={1}
        >
          <Text color="#ffffff" bold>
            {textoAviso}
          </Text>
          <Button key="fechar-aviso" plain label="✕" onPress={() => fecharAviso($)} />
        </Box>
      )}
      <Box flexDirection="row" gap={1} alignItems="center">
        {Svg && (
          <Box flexShrink={0}>
            <Svg source={mascote(modo)} alt="Claude mascot" width={COLUNAS * CEL} height={LINHAS * CEL} />
          </Box>
        )}
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="row" gap={1}>
          {Svg ? (
            <Box flexGrow={1} flexShrink={1}>
              <Svg
                source={barraBlocos(f, janela)}
                alt={`Context ${percent}%`}
                width={BARRA_W}
                height={BARRA_H}
              />
            </Box>
          ) : (
            <Box flexDirection="row" flexGrow={1} columnGap={0}>
              {TIPOS.filter(x => f[x.campo] > 0).map(x => (
                <Box key={x.campo} flexGrow={escala(f[x.campo], janela)} minWidth={1} height={1} backgroundColor={x.cor} />
              ))}
              <Box key="livre" flexGrow={escala(livre, janela)} minWidth={livre > 0 ? 1 : 0} height={1} backgroundColor={LIVRE} />
            </Box>
          )}
          <Text color={corPct} bold>
            {percent}%
          </Text>
          <Text dimColor>
            {num(m?.tokens ?? ocupadoCtx)} / {num(janela)} context
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
            <Text dimColor>Last request</Text>
            {TIPOS.map(x => (
              <Text key={x.campo}>
                <Text color={x.cor}>■</Text> {x.nome} <Text bold>{num(f[x.campo])}</Text>
              </Text>
            ))}
            {acerto(f) !== null && (
              <Text>
                hit{' '}
                <Text bold color={corAcerto(acerto(f))}>
                  {acerto(f)}%
                </Text>
              </Text>
            )}
          </Box>
          {cincoHoras && (
            <Text color={corLimite} bold={corLimite !== undefined}>
              5-hour limit {cincoHoras.percentUsed}%{falta(cincoHoras.resetsAt, agora)}
            </Text>
          )}
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
            <Text dimColor>Session</Text>
            {TIPOS.map(x => (
              <Text key={x.campo}>
                <Text color={x.cor}>■</Text> {num(t[x.campo])}
              </Text>
            ))}
            <Text>
              total <Text bold>{num(soma(t))}</Text>
            </Text>
            {acerto(t) !== null && (
              <Text>
                hit{' '}
                <Text bold color={corAcerto(acerto(t))}>
                  {acerto(t)}%
                </Text>
              </Text>
            )}
            <Text bold>{gasto !== null ? usd(gasto) : `≈ ${usd(estimativa)}`}</Text>
            <Text dimColor wrap="truncate-end">Skills: {listaSkills}</Text>
          </Box>
          <Box flexDirection="row" columnGap={1}>
            <Button key="mods" label="Mods" onPress={() => $.ui.open({ id: "mods", title: "Mods" })} />
            <Button key="clear" label="Clear" onPress={() => limpar($)} />
            <Button
              key="handoff"
              variant="primary"
              label={gerando ? 'Writing handoff…' : 'Handoff'}
              onPress={() => handoff($)}
            />
          </Box>
        </Box>
      </Box>
      </Box>
      </Box>
    )
  })
}
