import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { Cota, Fatias, Limite, Medida, Rodada, UsoModelo } from '../types'

const ZERO: Fatias = { lido: 0, escrito: 0, input: 0, output: 0 }

const fatias = atom({ plugin: 'funmeter', key: 'fatias' } as const, null)
const medida = atom({ plugin: 'funmeter', key: 'medida' } as const, null)
const skills = atom({ plugin: 'funmeter', key: 'skills' } as const, [])
const totais = atom({ plugin: 'funmeter', key: 'totais' } as const, ZERO)
const custo = atom({ plugin: 'funmeter', key: 'custo' } as const, null)
const estimado = atom({ plugin: 'funmeter', key: 'estimado' } as const, 0)
const limites = atom({ plugin: 'funmeter', key: 'limites' } as const, [])
const ocupado = atom({ plugin: 'funmeter', key: 'ocupado' } as const, false)
const feliz = atom({ plugin: 'funmeter', key: 'feliz' } as const, false)
const piso = atom({ plugin: 'funmeter', key: 'piso' } as const, null)
const mensagens = atom({ plugin: 'funmeter', key: 'mensagens' } as const, 0)
const fechado = atom({ plugin: 'funmeter', key: 'fechado' } as const, null)
const cotas = atom({ plugin: 'funmeter', key: 'cotas' } as const, [])
const cotasCodex = atom({ plugin: 'funmeter', key: 'cotasCodex' } as const, [])
const velocidade = atom({ plugin: 'funmeter', key: 'velocidade' } as const, null)
const porModelo = atom({ plugin: 'funmeter', key: 'porModelo' } as const, {})
const dobrados = atom({ plugin: 'funmeter', key: 'dobrados' } as const, {})
const pulso = atom({ plugin: 'funmeter', key: 'pulso' } as const, 0)
const ultimaResposta = atom({ plugin: 'funmeter', key: 'ultimaResposta' } as const, null)
const parado = atom({ plugin: 'funmeter', key: 'parado' } as const, false)
const paradoFechado = atom({ plugin: 'funmeter', key: 'paradoFechado' } as const, null)
const rodada = atom({ plugin: 'funmeter', key: 'rodada' } as const, null)

const LARANJA = '#D77757'
const CLARO = '#EE9C78'
const SOMBRA = '#B35E40'
const PERNA = '#A24F35'
const PERNA_SOMBRA = '#7F3C27'
const ESCURO = '#1a1a1a'
const BRILHO = '#F2C14E'
const VERMELHO = '#E24B4A'
const CEL = 5
const COLUNAS = 15
const LINHAS = 12

type Modo = 'idle' | 'working' | 'happy'

const arred = (v: number) => String(Math.round(v * 100) / 100)

// ---- Mascote em vetor, estilo quadrinho: traço de nanquim, sombra chapada com retícula e movimento com aceleração.
const TINTA = '#2b1711'
const BOCA = '#5a1f17'
const M_CX = 37.5 // centro do boneco
const M_PES = 55 // linha do chão

// Uma "pista" é uma animação SMIL que se repete a cada `total` segundos e fica na `base` fora das cenas.
// Cada cena começa em `em`, na base, e anda por passos [valores..., duração, curva?]: o passo leva do valor anterior
// até os valores dele, com a curva dada (io: acelera e freia, o: só freia, i: só acelera, l: constante).
// Cenas da mesma pista não podem se sobrepor no tempo.
const CURVAS: Record<string, string> = { io: '.42 0 .58 1', o: '0 0 .3 1', i: '.6 0 1 1', l: '0 0 1 1' }
type Passo = (number | string)[]
type Cena = { em: number; p: Passo[] }
const cena = (em: number, ...p: Passo[]): Cena => ({ em, p })
const repetir = (passos: Passo[], vezes: number): Passo[] => Array.from({ length: vezes }, () => passos).flat()

function pista(alvo: string, total: number, base: number[], cenas: Cena[]): string {
  if (cenas.length === 0) return ''
  const pts: { t: number; v: number[]; c: string }[] = [{ t: 0, v: base, c: 'l' }]
  const poe = (t: number, v: number[], c: string) => {
    const ult = pts[pts.length - 1] as { t: number; v: number[] }
    if (t < ult.t - 1e-6 || t > total + 1e-6) throw new Error(`pista ${alvo}: cena fora de ordem ou do ciclo em ${arred(t)}s (anterior ${arred(ult.t)}s, ciclo ${total}s)`)
    if (Math.abs(ult.t - t) < 1e-6 && ult.v.join() === v.join()) return
    pts.push({ t: Math.min(t, total), v, c })
  }
  for (const ce of [...cenas].sort((a, b) => a.em - b.em)) {
    let t = ce.em
    poe(t, base, 'l')
    for (const cru of ce.p) {
      const p = [...cru]
      const c = typeof p[p.length - 1] === 'string' ? String(p.pop()) : 'io'
      t += Number(p.pop())
      poe(t, p.map(Number), c)
    }
    poe(t, base, 'l') // cena que não termina na base volta num salto (só usado com a peça invisível)
  }
  poe(total, base, 'l')
  const values = pts.map(p => p.v.map(arred).join(' ')).join(';')
  const keyTimes = pts.map(p => String(Math.round((p.t / total) * 1e5) / 1e5)).join(';')
  const keySplines = pts
    .slice(1)
    .map(p => CURVAS[p.c] ?? CURVAS.io)
    .join(';')
  const comum = `calcMode="spline" values="${values}" keyTimes="${keyTimes}" keySplines="${keySplines}" dur="${total}s" repeatCount="indefinite"`
  return alvo === 'translate' || alvo === 'scale' || alvo === 'rotate'
    ? `<animateTransform attributeName="transform" type="${alvo}" ${comum}/>`
    : `<animate attributeName="${alvo}" ${comum}/>`
}
// aparece em `em` e some `dur` segundos depois (e o contrário, para a peça que ela substitui)
const aceso = (em: number, dur: number): Cena => cena(em, [1, 0.07], [1, dur - 0.14], [0, 0.07])
const apagado = (em: number, dur: number): Cena => cena(em, [0, 0.07], [0, dur - 0.14], [1, 0.07])

// As pistas de cada parte do boneco. O que faltar fica parado.
type Rig = {
  pos?: string // o corpo todo, em px
  inclina?: string // gira em volta dos pés
  pirueta?: string // gira em volta do meio do corpo
  amassa?: string // estica e amassa a partir dos pés
  respira?: string
  bracoE?: string // graus; positivo levanta
  bracoD?: string
  pernas?: string[]
  olhar?: string // o rosto inteiro desliza
  olhos?: string // escala dos olhos: piscar, arregalar, apertar
  normais?: string // opacidade dos olhos comuns
  felizes?: string // ^ ^
  apertados?: string // > <
  sorriso?: string
  bocaO?: string
  bocaOEscala?: string
  sombra?: string // escala da sombra no chão
  sempreFeliz?: boolean
  atras?: string // cenário atrás do boneco
  frente?: string // objetos na frente
}

function boneco(r: Rig): string {
  const perna = (i: number) => {
    const x = 22.5 + i * 10
    return (
      `<g>${r.pernas?.[i] ?? ''}<rect x="${x - 3}" y="42" width="6" height="13" rx="2.2" fill="${PERNA}" stroke="${TINTA}" stroke-width="1.5"/>` +
      `<rect x="${x + 0.2}" y="45.5" width="2" height="8.4" rx="1" fill="${PERNA_SOMBRA}"/></g>`
    )
  }
  // O braço direito é o esquerdo espelhado: nos dois, ângulo positivo levanta.
  const braco = (esquerdo: boolean, anim = '') =>
    `<g transform="translate(${esquerdo ? 15.5 : 59.5} 34)${esquerdo ? '' : ' scale(-1 1)'}"><g>${anim}` +
    `<rect x="-10.5" y="-5" width="13" height="10" rx="3.4" fill="${LARANJA}" stroke="${TINTA}" stroke-width="1.5"/>` +
    `<path d="M-8.2 -2.9H-2.4" stroke="${CLARO}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M-8.4 2.9H0.6" stroke="${SOMBRA}" stroke-width="1.7" stroke-linecap="round"/></g></g>`
  // Corpo: cor chapada, sombra de borda dura à direita e embaixo, uma faixa de retícula na passagem,
  // luz de contorno em cima à esquerda, um brilho branco e o traço por cima de tudo.
  const corpo =
    `<rect x="15" y="19" width="45" height="26" rx="5.5" fill="${LARANJA}"/>` +
    `<g clip-path="url(#cb)"><path d="M60.5 18.5V45.5H14.5V40.4Q39 42.6 51.5 38.2Q56.6 34.4 55.6 18.5Z" fill="${SOMBRA}"/>` +
    `<path d="M14.5 37Q39 39.4 49.4 35.4Q53.4 32 52.6 18.5H55.6Q56.6 34.4 51.5 38.2Q39 42.6 14.5 40.4Z" fill="url(#pt)"/></g>` +
    `<path d="M18.4 30V24.8Q18.4 21.7 21.6 21.7H45" fill="none" stroke="${CLARO}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M22.2 22.1H30.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".85"/><circle cx="33.4" cy="22.1" r=".7" fill="#fff" opacity=".85"/>` +
    `<rect x="15" y="19" width="45" height="26" rx="5.5" fill="none" stroke="${TINTA}" stroke-width="1.7"/>`
  const olho = (x: number) =>
    `<rect x="${x - 2.7}" y="-5.2" width="5.4" height="10.4" rx="2.5" fill="${ESCURO}"/><circle cx="${x - 0.9}" cy="-2.9" r="1.05" fill="#fff" opacity=".9"/>`
  const traco = `fill="none" stroke="${ESCURO}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`
  const rosto =
    `<g>${r.olhar ?? ''}` +
    `<g opacity="${r.sempreFeliz ? 0 : 1}">${r.normais ?? ''}<g transform="translate(${M_CX} 30.5)"><g>${r.olhos ?? ''}${olho(-10)}${olho(10)}</g></g></g>` +
    `<path opacity="${r.sempreFeliz ? 1 : 0}" d="M24.2 32.6L27.5 28.4L30.8 32.6M44.2 32.6L47.5 28.4L50.8 32.6" ${traco}>${r.felizes ?? ''}</path>` +
    `<path opacity="0" d="M24.6 27.8L30 30.6L24.6 33.4M50.4 27.8L45 30.6L50.4 33.4" ${traco}>${r.apertados ?? ''}</path>` +
    `<path opacity="${r.sempreFeliz ? 1 : 0}" d="M33.7 35.4Q37.5 41.4 41.3 35.4Z" fill="${BOCA}" stroke="${ESCURO}" stroke-width="1.1" stroke-linejoin="round">${r.sorriso ?? ''}</path>` +
    `<g transform="translate(${M_CX} 37.4)" opacity="0">${r.bocaO ?? ''}<g>${r.bocaOEscala ?? ''}<ellipse rx="1.8" ry="2.1" fill="${BOCA}" stroke="${ESCURO}" stroke-width="1"/></g></g>` +
    `</g>`
  return (
    `<g transform="translate(${M_CX} 56.8)"><g>${r.sombra ?? ''}<ellipse rx="19" ry="2.6" fill="#000" opacity=".28"/></g></g>` +
    (r.atras ?? '') +
    // O corte na linha do chão faz o corpo sumir dentro do buraco.
    `<g clip-path="url(#chao)"><g>${r.pos ?? ''}<g transform="translate(${M_CX} ${M_PES})"><g>${r.inclina ?? ''}<g>${r.amassa ?? ''}<g>${r.respira ?? ''}` +
    `<g transform="translate(0 -18)"><g>${r.pirueta ?? ''}<g transform="translate(${-M_CX} ${-(M_PES - 18)})">` +
    [0, 1, 2, 3].map(perna).join('') +
    braco(true, r.bracoE) +
    braco(false, r.bracoD) +
    corpo +
    rosto +
    `</g></g></g></g></g></g></g></g></g>` +
    (r.frente ?? '')
  )
}

const respirar = (dur: number) =>
  `<animateTransform attributeName="transform" type="scale" calcMode="spline" keyTimes="0;.5;1" keySplines=".42 0 .58 1;.42 0 .58 1" values="1 1;.985 1.03;1 1" dur="${dur}s" repeatCount="indefinite"/>`
const piscada: Passo[] = [
  [1, 0.1, 0.06, 'i'],
  [1, 1, 0.11, 'o'],
]
// Poeirinha que abre para o lado e some: no pouso de cada pulo.
const poeira = (T: number, x: number, lado: number, em: number) =>
  `<circle cx="${x}" cy="55.4" r="1.4" fill="#efe7dc" opacity="0">${pista('opacity', T, [0], [cena(em, [0.5, 0.03], [0, 0.42, 'o'])])}` +
  `${pista('cx', T, [x], [cena(em, [x + lado * 8, 0.45, 'o'])])}${pista('r', T, [1.4], [cena(em, [2.9, 0.45, 'o'])])}</circle>`
const laptopDesenho =
  `<rect x="22.5" y="37.4" width="30" height="10.1" rx="2" fill="#7b7b76" stroke="${TINTA}" stroke-width="1.4"/>` +
  `<path d="M25.2 39.3H40" stroke="#a9a9a3" stroke-width="1.2" stroke-linecap="round"/><path d="M48.6 38.9V45.6" stroke="#5c5c57" stroke-width="1.6" stroke-linecap="round"/>` +
  `<circle cx="${M_CX}" cy="42.8" r="1.7" fill="${CLARO}"/>` +
  `<rect x="18.5" y="46.6" width="38" height="3.6" rx="1.5" fill="#a3a39d" stroke="${TINTA}" stroke-width="1.3"/><path d="M21 47.7H54" stroke="#cfcfc9" stroke-width=".9" stroke-linecap="round"/>`

// working (6 s): digita no laptop com os olhos correndo a tela e símbolos de código subindo; trava, coça a cabeça
// e pensa (...); a lâmpada acende, ele dá um pulinho e volta a digitar mais depressa.
function mascoteTrabalhando(): string {
  const T = 6
  const digita = (inverso: boolean, vezes: number, d: number) => repetir(inverso ? [[-26, d], [-42, d]] : [[-42, d], [-26, d]], vezes)
  const glifo = (txt: string, cor: string, x: number, em: number) =>
    `<g opacity="0">${pista('opacity', T, [0], [cena(em, [1, 0.15], [1, 0.7], [0, 0.4])])}<g>${pista('translate', T, [x, 19], [cena(em, [x + 2, 11, 0.5, 'o'], [x - 1, 3, 0.75])])}` +
    `<text font-family="ui-monospace,Consolas,monospace" font-size="7" font-weight="700" text-anchor="middle" fill="${cor}" stroke="${TINTA}" stroke-width="1.6" paint-order="stroke" stroke-linejoin="round">${txt}</text></g></g>`
  const ponto = (i: number) => {
    const em = 3.1 + i * 0.18
    return `<circle cx="${31 + i * 6.5}" cy="${i === 1 ? 10.6 : 12}" r="1.5" fill="#E9EEF0" stroke="${TINTA}" stroke-width=".9" opacity="0">${pista('opacity', T, [0], [cena(em, [1, 0.08], [1, 3.85 - em - 0.08], [0, 0.05])])}</circle>`
  }
  const lampada =
    `<g transform="translate(${M_CX} 9)"><g>${pista('scale', T, [0, 0], [cena(3.9, [1.3, 1.3, 0.12, 'o'], [1, 1, 0.1], [1, 1, 0.9], [0, 0, 0.15, 'i'])])}` +
    `<path d="M-7.5 -1H-5.6M7.5 -1H5.6M-5.4 -6.6L-4.1 -5.3M5.4 -6.6L4.1 -5.3M0 -8.6V-6.9" stroke="#FFD84A" stroke-width="1.1" stroke-linecap="round"><animate attributeName="opacity" dur="0.4s" repeatCount="indefinite" values="1;.3;1"/></path>` +
    `<rect x="-1.9" y="2.2" width="3.8" height="2.8" rx=".8" fill="#9a9a95" stroke="${TINTA}" stroke-width="1"/>` +
    `<circle cy="-1" r="3.9" fill="#FFD84A" stroke="${TINTA}" stroke-width="1.1"/><path d="M-1.8 -2.6Q-1.4 -3.8 0 -3.9" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round"/></g></g>`
  return boneco({
    respira: respirar(1.6),
    pos: pista('translate', T, [0, 0], [
      cena(0.1, ...repetir([[0, 0.8, 0.15], [0, 0, 0.15]], 9)),
      cena(3.9, [0, -4, 0.12, 'o'], [0, 0, 0.14, 'i']),
      cena(4.3, ...repetir([[0, 0.8, 0.11], [0, 0, 0.11]], 7)),
    ]),
    amassa: pista('scale', T, [1, 1], [cena(3.82, [1.08, 0.9, 0.08], [0.92, 1.12, 0.12, 'o'], [1.1, 0.88, 0.14, 'i'], [1, 1, 0.14])]),
    bracoE: pista('rotate', T, [0], [cena(0.05, [-30, 0.15], ...digita(false, 15, 0.09), [-10, 0.2], [-10, 0.75], [40, 0.1, 'o'], [40, 0.25], [-30, 0.1], ...digita(false, 11, 0.07), [0, 0.1])]),
    bracoD: pista('rotate', T, [0], [
      cena(0.05, [-30, 0.15], ...digita(true, 15, 0.09), [48, 0.25, 'o'], ...repetir([[38, 0.1], [50, 0.1]], 3), [50, 0.1], [40, 0.1], [40, 0.25], [-30, 0.1], ...digita(true, 11, 0.07), [0, 0.1]),
    ]),
    pernas: ['', '', '', pista('translate', T, [0, 0], [cena(0.1, ...repetir([[0, -1.6, 0.15], [0, 0, 0.15]], 9))])],
    olhar: pista('translate', T, [0, 0], [
      cena(0.1, [0, 1.6, 0.2], ...repetir([[-1.6, 1.6, 0.45], [1.6, 1.6, 0.45]], 3), [-1.8, -1.8, 0.25, 'o'], [-1.8, -1.8, 0.6], [0, -1, 0.1], [0, 1.6, 0.3], ...repetir([[-1.6, 1.6, 0.3], [1.6, 1.6, 0.3]], 2), [0, 1.6, 0.3], [0, 0, 0.2]),
    ]),
    olhos: pista('scale', T, [1, 1], [cena(1.4, ...piscada), cena(3.05, [1, 0.6, 0.2], [1, 0.6, 0.6], [1.15, 1.2, 0.1, 'o'], [1.15, 1.2, 0.3], [1, 1, 0.2]), cena(5.2, ...piscada)]),
    frente:
      laptopDesenho +
      glifo('{ }', '#B45CFF', 15, 0.4) +
      glifo('&lt;/&gt;', '#6ECB3C', 59, 1.5) +
      glifo('=&gt;', '#FF8A1E', 17, 4.7) +
      [0, 1, 2].map(ponto).join('') +
      lampada,
  })
}

// happy (2,4 s): agacha, salta de braços abertos com confete estourando, amassa ao pousar e comemora com dois pulinhos.
function mascoteFeliz(): string {
  const T = 2.4
  const cores = ['#FF8A1E', '#6ECB3C', '#E9EEF0', '#B45CFF', BRILHO, VERMELHO, '#4FA8FF', '#6ECB3C']
  const alvos: [number, number, number][] = [[9, 10, -3], [18, 4, -2], [28, 2, -1], [47, 2, 1], [57, 4, 2], [66, 10, 3], [5, 20, -2], [70, 20, 2]]
  const confete = alvos
    .map(
      ([x, y, dx], k) =>
        `<g opacity="0">${pista('opacity', T, [0], [cena(0.5, [1, 0.05], [1, 1.0], [0, 0.25])])}<g>${pista('translate', T, [M_CX, 24], [cena(0.5, [x, y, 0.35, 'o'], [x + dx, 57, 0.95, 'i'])])}` +
        `<rect x="-1.3" y="-.8" width="2.6" height="1.6" rx=".4" fill="${cores[k]}"><animateTransform attributeName="transform" type="rotate" dur="${0.5 + (k % 3) * 0.12}s" repeatCount="indefinite" values="0;360"/></rect></g></g>`,
    )
    .join('')
  const estrela = (x: number, y: number, r: number, em: number) => {
    const c = arred(r * 0.28)
    return (
      `<g transform="translate(${x} ${y})"><g>${pista('scale', T, [0, 0], [cena(em, [1, 1, 0.2, 'o'], [1, 1, 0.3], [0, 0, 0.3, 'i'])])}` +
      `<path d="M0 ${-r}L${c} -${c}L${r} 0L${c} ${c}L0 ${r}L-${c} ${c}L${-r} 0L-${c} -${c}Z" fill="${BRILHO}" stroke="${TINTA}" stroke-width=".7" stroke-linejoin="round"/></g></g>`
    )
  }
  const bracos = pista('rotate', T, [0], [cena(0.01, [-18, 0.2], [58, 0.3, 'o'], [58, 0.45], [20, 0.14], [58, 0.16, 'o'], [15, 0.16], [15, 0.1], [58, 0.16, 'o'], [10, 0.16], [0, 0.25])])
  const encolhe = pista('translate', T, [0, 0], [cena(0.3, [0, -3, 0.2], [0, -3, 0.3], [0, 0, 0.13])])
  return boneco({
    sempreFeliz: true,
    respira: respirar(1.2),
    pos: pista('translate', T, [0, 0], [
      cena(0.01, [0, 0, 0.2], [0, -16, 0.34, 'o'], [0, -16.5, 0.1], [0, 0, 0.28, 'i'], [0, 0, 0.17], [0, -5, 0.16, 'o'], [0, 0, 0.16, 'i'], [0, 0, 0.1], [0, -5, 0.16, 'o'], [0, 0, 0.16, 'i']),
    ]),
    amassa: pista('scale', T, [1, 1], [
      cena(0.01, [1.15, 0.8, 0.2, 'o'], [0.87, 1.2, 0.1, 'o'], [0.97, 1.04, 0.3], [0.9, 1.14, 0.3], [1.22, 0.72, 0.07, 'i'], [0.95, 1.07, 0.12, 'o'], [0.94, 1.08, 0.16], [1.1, 0.9, 0.16, 'i'], [1, 1, 0.1], [0.94, 1.08, 0.16], [1.1, 0.9, 0.16, 'i'], [0.98, 1.02, 0.12], [1, 1, 0.12]),
    ]),
    inclina: pista('rotate', T, [0], [cena(0.3, [-6, 0.2], [6, 0.25], [0, 0.2])]),
    bracoE: bracos,
    bracoD: bracos,
    pernas: [encolhe, '', '', encolhe],
    sombra: pista('scale', T, [1, 1], [cena(0.21, [0.55, 0.55, 0.34, 'o'], [0.55, 0.55, 0.1], [1, 1, 0.28, 'i']), cena(1.1, [0.85, 0.85, 0.16], [1, 1, 0.16], [1, 1, 0.1], [0.85, 0.85, 0.16], [1, 1, 0.16])]),
    frente: poeira(T, 21, -1, 0.93) + poeira(T, 54, 1, 0.93) + confete + estrela(8, 14, 4, 0.1) + estrela(67, 9, 3.2, 1.2) + estrela(64, 30, 2.6, 0.7),
  })
}

// idle (60 s): respira e pisca o tempo todo, e de tempos em tempos faz uma cena:
// 2 olha em volta · 6 acena · 10 boceja e se espreguiça · 14,5 salto mortal · 18 malabarismo com as bolinhas dos tokens
// (a última cai na cabeça) · 26 laptop com janela de código · 35 dança com notas · 42 buraco de desenho animado ·
// 49,5 espirro · 54 cochila soltando z z z e acorda num susto.
function mascoteParado(): string {
  const T = 60
  const p = (alvo: string, base: number[], cenas: Cena[]) => pista(alvo, T, base, cenas)

  // -- malabarismo: três bolinhas dão a volta (arco alto da direita para a esquerda, passe baixo de volta)
  const M0 = 18.3
  const voltas = 4
  const bola = (i: number) => {
    const ini = M0 + i * 0.4
    const fim = ini + voltas * 1.2
    const xs: Passo[] = repetir([[8, 0.8, 'l'], [67, 0.4, 'l']], voltas)
    const ys: Passo[] = repetir([[3, 0.4, 'o'], [28.5, 0.4, 'i'], [21, 0.2, 'o'], [28.5, 0.2, 'i']], voltas)
    // as duas primeiras são jogadas para longe; a última sobe, cai na cabeça dele e quica para fora
    const saidaX: Passo[] = i === 0 ? [[60, 0.45, 'l']] : i === 1 ? [[72, 0.45, 'l']] : [[52, 0.2, 'l'], [M_CX, 0.2, 'l'], [M_CX, 0.35], [56, 0.3, 'l'], [66, 0.4, 'l']]
    const saidaY: Passo[] = i < 2 ? [[-8, 0.45, 'o']] : [[-6, 0.4, 'o'], [15.6, 0.35, 'i'], [6, 0.3, 'o'], [62, 0.4, 'i']]
    const some = fim + (i < 2 ? 0.45 : 1.45)
    return (
      `<circle r="2.6" cx="67" cy="28.5" fill="${TIPOS[i + 1]?.cor ?? '#fff'}" stroke="${TINTA}" stroke-width="1.1" opacity="0">` +
      p('opacity', [0], [cena(18, [1, 0.15], [1, some - 18.15 - 0.05], [0, 0.05])]) +
      p('cx', [67], [cena(ini, ...xs, ...saidaX)]) +
      p('cy', [28.5], [cena(ini, ...ys, ...saidaY)]) +
      `</circle>`
    )
  }
  const GALO = M0 + 0.8 + voltas * 1.2 + 0.75 // a bolinha bate na cabeça

  // -- laptop: entra deslizando, a janela de código abre em cima e as linhas se escrevem
  const linhas: [number, number, number, string][] = [
    [12, 6.6, 14, '#FF8A1E'], [28, 6.6, 20, '#6ECB3C'], [15, 9, 24, '#8fb4ff'], [41, 9, 12, '#E9EEF0'],
    [15, 11.4, 10, '#B45CFF'], [27, 11.4, 22, '#6ECB3C'], [12, 13.8, 7, '#FF8A1E'], [21, 13.8, 16, '#8fb4ff'],
  ]
  const janelaDeCodigo =
    `<g opacity="0">${p('opacity', [0], [cena(26.6, [1, 0.25], [1, 5.2], [0, 0.25])])}` +
    `<rect x="9" y="1.2" width="57" height="15.6" rx="2.2" fill="#0d1117" stroke="${TINTA}" stroke-width="1.3"/>` +
    `<circle cx="12.2" cy="3.7" r=".8" fill="${VERMELHO}"/><circle cx="14.8" cy="3.7" r=".8" fill="#D4B83A"/><circle cx="17.4" cy="3.7" r=".8" fill="#639922"/>` +
    linhas
      .map(([x, y, w, cor], i) => {
        const em = 27 + i * 0.5
        return `<rect x="${x}" y="${y}" width="0" height="1.3" rx=".65" fill="${cor}">${p('width', [0], [cena(em, [w, 0.4, 'l'], [w, 32 - em - 0.4], [0, 0.01])])}</rect>`
      })
      .join('') +
    `</g>`
  const laptop = `<g transform="translate(60 0)">${p('translate', [60, 0], [cena(26, [0, 0, 0.4, 'o'], [0, 0, 5.9], [60, 0, 0.35, 'i'])])}${laptopDesenho}</g>`
  const teclar = (inverso: boolean): Passo[] => [[-30, 0.3], ...repetir(inverso ? [[-26, 0.09], [-42, 0.09]] : [[-42, 0.09], [-26, 0.09]], 26), [0, 0.3], [0, 0.12], [50, 0.2, 'o'], [50, 0.5], [0, 0.3]]

  // -- dança: notas sobem dos lados
  const nota = (x: number, cor: string, em: number, dx: number) =>
    `<g opacity="0">${p('opacity', [0], [cena(em, [1, 0.15], [1, 0.9], [0, 0.35])])}<g>${p('translate', [x, 22], [cena(em, [x + dx, 13, 0.5, 'o'], [x - dx, 5, 0.5], [x + dx, -3, 0.4, 'i'])])}` +
    `<path d="M1.6 -.3V-6.4q2.5 .5 2.9 3" fill="none" stroke="${cor}" stroke-width="1.2" stroke-linecap="round"/><ellipse rx="1.9" ry="1.4" transform="rotate(-20)" fill="${cor}"/></g></g>`
  const notas = nota(8, '#B45CFF', 35.4, 2) + nota(67, '#6ECB3C', 36.2, -2) + nota(10, BRILHO, 37.2, 2) + nota(66, '#B45CFF', 38.1, -2) + nota(8, '#6ECB3C', 38.9, 2)
  const passoDeDanca = (inverso: boolean): Passo[] => repetir(inverso ? [[0, 0, 0.4], [0, -2.5, 0.2, 'o'], [0, 0, 0.2, 'i']] : [[0, -2.5, 0.2, 'o'], [0, 0, 0.2, 'i'], [0, 0, 0.4]], 6)

  // -- buraco: abre sob os pés, ele olha, toma um susto, pedala no ar, cai e volta num salto, espalhando terra
  const buraco =
    `<g transform="translate(${M_CX} 56.4)"><g transform="scale(0)">${p('scale', [0, 0], [cena(42, [1.1, 1.1, 0.25, 'o'], [1, 1, 0.1], [1, 1, 4.4], [0, 0, 0.25, 'i'])])}` +
    `<ellipse rx="23" ry="3.4" fill="#0b0b0c" stroke="#4a4038" stroke-width="1"/><ellipse cy="-.8" rx="19" ry="1.8" fill="#000" opacity=".6"/></g></g>`
  const terra = ([[30, -1.5], [44, 1.5], [34, -0.6], [41, 0.7]] as [number, number][])
    .map(
      ([x, dx]) =>
        `<rect width="2.2" height="2.2" rx=".6" fill="${PERNA}" stroke="${TINTA}" stroke-width=".6" opacity="0" transform="translate(${x} 54)">` +
        `${p('opacity', [0], [cena(45.6, [1, 0.02], [1, 0.4], [0, 0.1])])}${p('translate', [x, 54], [cena(45.6, [x + dx * 5, 43, 0.22, 'o'], [x + dx * 10, 58, 0.3, 'i'])])}</rect>`,
    )
    .join('')
  const pedala = (inverso: boolean): Passo[] => repetir(inverso ? [[0, 0, 0.0875], [0, -3, 0.0875]] : [[0, -3, 0.0875], [0, 0, 0.0875]], 4)

  // -- espirro: duas tomadas de ar, o corpo dispara para a frente e as gotas voam
  const ATCHIM = 49.5 + 1.55
  const gotas = ([[20, 48], [28, 52], [M_CX, 54], [47, 52], [55, 48]] as [number, number][])
    .map(
      ([x, y]) =>
        `<circle r="1" fill="#cfe6f2" opacity="0" transform="translate(${M_CX} 38)">${p('opacity', [0], [cena(ATCHIM, [0.95, 0.02], [0.9, 0.2], [0, 0.2])])}` +
        `${p('translate', [M_CX, 38], [cena(ATCHIM, [x, y, 0.42, 'o'])])}</circle>`,
    )
    .join('')

  // -- cochilo: os z sobem e crescem
  const ze = (em: number, tam: number) =>
    `<g opacity="0">${p('opacity', [0], [cena(em, [1, 0.2], [1, 1.1], [0, 0.5])])}<g>${p('translate', [52, 16], [cena(em, [56, 10, 0.6, 'o'], [61, 3, 0.7], [64, -4, 0.5])])}` +
    `<path transform="scale(${tam})" d="M0 0H4L0 5H4" fill="none" stroke="#cfe6f2" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></g></g>`

  const bracosJuntos: Cena[] = [
    cena(10.3, [58, 0.6, 'o'], [60, 0.8], [-14, 0.22, 'i'], [0, 0.35]), // espreguiça
    cena(14.5, [-18, 0.22], [55, 0.3, 'o'], [55, 0.4], [0, 0.3]), // salto
    cena(GALO, [-20, 0.1], [0, 0.4]),
    cena(43, [50, 0.1, 'o'], [56, 3.1], [0, 0.3]), // buraco
    cena(49.5, [10, 0.3], [0, 0.2], [20, 0.35], [24, 0.7], [-20, 0.09, 'i'], [0, 0.6]), // espirro
    cena(54.2, [-12, 1], [-12, 3.8], [30, 0.1, 'o'], [0, 0.4]), // cochilo e susto
  ]
  const felizEm: [number, number][] = [[6.1, 1.3], [14.75, 0.75], [31.75, 0.85], [35.2, 4.7]]
  const apertadoEm: [number, number][] = [[GALO + 0.03, 0.85], [ATCHIM, 0.85]]

  return boneco({
    respira: respirar(3.2),
    pos: p('translate', [0, 0], [
      cena(14.5, [0, 0, 0.22], [0, -17, 0.36, 'o'], [0, -17.6, 0.12], [0, 0, 0.3, 'i']),
      cena(GALO, [0, 1.2, 0.07], [0, 0, 0.2]),
      cena(35, ...repetir([[-3, -2.5, 0.2, 'o'], [-4, 0, 0.2, 'i'], [3, -2.5, 0.2, 'o'], [4, 0, 0.2, 'i']], 6), [0, 0, 0.25]),
      cena(43, [0, -2.5, 0.1, 'o'], [0, -1.5, 0.7], [0, 14, 0.14, 'i'], [0, 46, 0.18, 'l'], [0, 46, 1.5], [0, -15, 0.3, 'o'], [0, -15.5, 0.08], [0, 0, 0.26, 'i']),
      cena(ATCHIM, [-3, 0, 0.09, 'o'], [-3, 0, 0.5], [0, 0, 0.5]),
      cena(59, [0, -6, 0.11, 'o'], [0, 0, 0.14, 'i']),
    ]),
    inclina: p('rotate', [0], [
      cena(2, [-3, 0.3, 'o'], [-3, 0.55], [3, 0.4], [3, 0.55], [0, 0.3]),
      cena(6, [-4, 0.3, 'o'], [-4, 1.1], [0, 0.3]),
      cena(35, ...repetir([[-7, 0.4], [7, 0.4]], 6), [0, 0.25]),
      cena(49.5, [-3, 0.3], [-1, 0.2], [-7, 0.35], [-8, 0.7], [13, 0.09, 'i'], [10, 0.5], [0, 0.5]),
      cena(54.2, [5, 1.2], [7, 1.5], [5, 1], [7, 1.1], [0, 0.1, 'o']),
    ]),
    pirueta: p('rotate', [0], [cena(14.8, [360, 0.6], [0, 0.001, 'l'])]),
    amassa: p('scale', [1, 1], [
      cena(10, [1.05, 0.93, 0.35], [0.9, 1.16, 0.6, 'o'], [0.9, 1.16, 0.8], [1.07, 0.92, 0.2, 'i'], [0.98, 1.03, 0.18], [1, 1, 0.2]),
      cena(14.5, [1.15, 0.8, 0.22, 'o'], [0.87, 1.2, 0.1, 'o'], [0.96, 1.05, 0.26], [1, 1, 0.2], [0.9, 1.14, 0.2], [1.22, 0.72, 0.07, 'i'], [0.95, 1.07, 0.12, 'o'], [1.02, 0.98, 0.1], [1, 1, 0.1]),
      cena(GALO, [1.16, 0.8, 0.07, 'i'], [0.96, 1.05, 0.14, 'o'], [1, 1, 0.15]),
      cena(35, ...repetir([[0.96, 1.05, 0.2, 'o'], [1.06, 0.94, 0.2, 'i']], 12), [1, 1, 0.25]),
      cena(43, [0.94, 1.08, 0.1, 'o'], [1, 1, 0.7], [0.85, 1.22, 0.14, 'i'], [1, 1, 0.3], [1, 1, 1.38], [0.88, 1.18, 0.3, 'o'], [0.94, 1.08, 0.08], [0.9, 1.14, 0.2], [1.22, 0.74, 0.07, 'i'], [0.96, 1.06, 0.12, 'o'], [1, 1, 0.12]),
      cena(49.5, [0.97, 1.06, 0.3], [1, 1, 0.2], [0.94, 1.1, 0.35], [0.93, 1.12, 0.7], [1.22, 0.74, 0.09, 'i'], [0.97, 1.04, 0.2, 'o'], [1, 1, 0.3]),
      cena(54.5, [1.03, 0.97, 1.1], [0.99, 1.01, 1.1], [1.03, 0.97, 1.1], [0.99, 1.01, 1.1], [1, 1, 0.1]),
      cena(59, [0.9, 1.15, 0.11, 'o'], [1.12, 0.86, 0.14, 'i'], [1, 1, 0.2]),
    ]),
    bracoE: p('rotate', [0], [
      ...bracosJuntos,
      cena(M0, ...repetir([[22, 0.2, 'o'], [-6, 0.2, 'i']], 14), [0, 0.2]),
      cena(26.4, ...teclar(false)),
      cena(35, ...repetir([[55, 0.4], [-10, 0.4]], 6), [0, 0.25]),
    ]),
    bracoD: p('rotate', [0], [
      ...bracosJuntos,
      cena(6, [55, 0.25, 'o'], ...repetir([[25, 0.16], [58, 0.16]], 3), [0, 0.35]), // aceno
      cena(M0, ...repetir([[-6, 0.2, 'i'], [22, 0.2, 'o']], 14), [0, 0.2]),
      cena(26.4, ...teclar(true)),
      cena(35, ...repetir([[-10, 0.4], [55, 0.4]], 6), [0, 0.25]),
    ]),
    pernas: [0, 1, 2, 3].map(i =>
      p('translate', [0, 0], [cena(14.82, [0, -3, 0.2], [0, -3, 0.3], [0, 0, 0.15]), cena(35, ...passoDeDanca(i % 2 === 1)), cena(43.1, ...pedala(i % 2 === 1))]),
    ),
    olhar: p('translate', [0, 0], [
      cena(2, [-2.4, 0, 0.25, 'o'], [-2.4, 0, 0.6], [2.4, 0, 0.35], [2.4, 0, 0.6], [0, 0, 0.3]),
      cena(18.2, [0, -1.8, 0.3], ...repetir([[-1.5, -2, 0.6], [1.5, -2, 0.6]], 4), [0, -2.4, 0.4], [0, -2.4, GALO - 23.7], [0, 0, 0.2]),
      cena(26.6, [0, 1.6, 0.3], ...repetir([[-1.6, 1.6, 0.5], [1.6, 1.6, 0.5]], 4), [0, 0, 0.3]),
      cena(42.4, [0, 2.2, 0.3, 'o'], [0, 2.2, 0.5], [0, 0, 0.1]),
      cena(59.3, [-2.2, 0, 0.12], [2.2, 0, 0.18], [0, 0, 0.15]),
    ]),
    olhos: p('scale', [1, 1], [
      ...[1.2, 4.6, 8.7, 13.3, 13.6, 17.2, 21, 25.4, 29.5, 33.6, 41.2, 46.7, 48.3, 53.2].map(em => cena(em, ...piscada)),
      cena(10.3, [1.05, 0.12, 0.3], [1.05, 0.12, 1.15], [1, 1, 0.25]),
      cena(43, [1.2, 1.25, 0.1, 'o'], [1.2, 1.25, 0.7], [1, 1, 0.2]),
      cena(49.5, [1, 0.6, 0.3], [1, 1, 0.2], [1, 0.4, 0.35], [1, 0.3, 0.7], [1, 1, 0.1]),
      cena(54, [1, 0.55, 0.6], [1, 0.75, 0.4], [1, 0.12, 0.6], [1, 0.12, 3.4], [1.2, 1.25, 0.08, 'o'], [1.2, 1.25, 0.4], [1, 1, 0.3]),
    ]),
    normais: p('opacity', [1], [...felizEm, ...apertadoEm].map(([em, d]) => apagado(em, d))),
    felizes: p('opacity', [0], felizEm.map(([em, d]) => aceso(em, d))),
    apertados: p('opacity', [0], apertadoEm.map(([em, d]) => aceso(em, d))),
    sorriso: p('opacity', [0], felizEm.map(([em, d]) => aceso(em, d))),
    bocaO: p('opacity', [0], [aceso(10.35, 1.55), aceso(43, 0.9), aceso(50, ATCHIM - 50)]),
    bocaOEscala: p('scale', [1, 1], [cena(10.35, [1.5, 1.9, 0.6, 'o'], [1.5, 1.9, 0.6], [0.7, 0.6, 0.3], [1, 1, 0.05]), cena(50, [1.2, 1.5, 0.35], [1.3, 1.7, 0.7], [1, 1, 0.05])]),
    sombra: p('scale', [1, 1], [
      cena(14.72, [0.55, 0.55, 0.36, 'o'], [0.55, 0.55, 0.12], [1, 1, 0.3, 'i']),
      cena(43.94, [0, 0, 0.2], [0, 0, 1.48], [0.5, 0.5, 0.3, 'o'], [0.5, 0.5, 0.08], [1, 1, 0.26, 'i']),
      cena(59, [0.8, 0.8, 0.11], [1, 1, 0.14]),
    ]),
    atras: janelaDeCodigo + buraco,
    frente:
      poeira(T, 21, -1, 15.5) + poeira(T, 54, 1, 15.5) + poeira(T, 21, -1, 46.26) + poeira(T, 54, 1, 46.26) +
      [0, 1, 2].map(bola).join('') +
      laptop +
      notas +
      terra +
      gotas +
      ze(55.2, 0.8) + ze(56.5, 1) + ze(57.8, 1.25),
  })
}

// o maior SVG que o engine aceita; passou disso, a árvore inteira é recusada e a faixa some
const SVG_MAX = 131072
const cacheMascote = new Map<Modo, string>()
function mascote(modo: Modo): string {
  let svg = cacheMascote.get(modo)
  if (svg === undefined) {
    svg = desenharMascote(modo)
    cacheMascote.set(modo, svg)
  }
  return svg
}

function desenharMascote(modo: Modo): string {
  const w = COLUNAS * CEL
  const h = LINHAS * CEL
  const cenaDoModo = modo === 'working' ? mascoteTrabalhando() : modo === 'happy' ? mascoteFeliz() : mascoteParado()
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><clipPath id="chao"><rect x="-30" y="-60" width="${w + 60}" height="${60 + M_PES + 2.4}"/></clipPath>` +
    `<clipPath id="cb"><rect x="15" y="19" width="45" height="26" rx="5.5"/></clipPath>` +
    `<pattern id="pt" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="${SOMBRA}"/></pattern></defs>` +
    cenaDoModo +
    `</svg>`
  )
}

// A pasta do usuário vem de $.env: o módulo não tem Node, então process.env não existe aqui.
let CASA = ''
async function acharCasa($: EngineInterface) {
  const pasta = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  CASA = pasta.split(String.fromCharCode(92)).join('/')
}
const pastaHandoffs = () => `${CASA}/.claude/funmeter-handoffs`

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
// Fonte: tabela de modelos da skill claude-api (2026-10-06). Leitura do cache: US$0,25 no Fable 5.1 e US$0,20 no Opus 5.5 e no Sonnet 5.5
// (declarados); nos demais, 0,1x da entrada. Haiku 5.5: preço para prompts de até 100K (acima disso, 0,50 / 2,50).
const PRECOS: Record<string, { input: number; output: number; lido: number }> = {
  'claude-fable-5-1': { input: 10, output: 50, lido: 0.25 },
  'claude-fable-5': { input: 10, output: 50, lido: 1 },
  'claude-mythos-5-1': { input: 10, output: 50, lido: 0.25 },
  'claude-opus-5-5': { input: 4, output: 20, lido: 0.2 },
  'claude-opus-5': { input: 5, output: 25, lido: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, lido: 0.5 },
  'claude-opus-4-7': { input: 5, output: 25, lido: 0.5 },
  'claude-opus-4-6': { input: 5, output: 25, lido: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, lido: 0.2 },
  'claude-sonnet-5': { input: 2, output: 10, lido: 0.2 },
  'claude-sonnet-4-6': { input: 3, output: 15, lido: 0.3 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, lido: 0.01 },
  'claude-haiku-4-5': { input: 1, output: 5, lido: 0.1 },
}

// o id mais longo que casa: 'claude-opus-5-5' ganha de 'claude-opus-5'
const preco = (modelo: string) =>
  PRECOS[
    Object.keys(PRECOS)
      .filter(id => modelo.includes(id))
      .sort((a, b) => b.length - a.length)[0] ?? 'claude-opus-5-5'
  ] ?? { input: 4, output: 20, lido: 0.2 }

const valor = (f: Fatias, modelo: string) => {
  const p = preco(modelo)
  if (!p) return 0
  return (f.input * p.input + f.escrito * p.input * 2 + f.lido * p.lido + f.output * p.output) / 1e6
}

// Cheapest to most expensive per token: cache read (0.1x input), input, cache write (2x), output (5x).
const TIPOS = [
  // géis do Portal 2 (o azul fica reservado para o Gemini): laranja propulsão, branco conversão, verde e roxo
  { campo: 'lido', curto: 'CR', cor: '#FF8A1E' },
  { campo: 'input', curto: 'I', cor: '#6ECB3C' },
  { campo: 'escrito', curto: 'CW', cor: '#E9EEF0' },
  { campo: 'output', curto: 'O', cor: '#B45CFF' },
] as const

const LIVRE = '#5F5E5A'
const MAX_SKILLS = 3

const escala = (n: number, total: number) => (n > 0 ? Math.max(1, Math.round((n / total) * 1000)) : 0)

// 950 · 12.3k · 184k · 1.25M · 12.5M
// O arredondamento pode virar a casa: 999,6 -> 1.0k, 99950 -> 100k, 999950 -> 1.00M.
const num = (n: number) => {
  if (!Number.isFinite(n)) return '0'
  const a = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  if (Math.round(a) < 1000) return `${sinal}${Math.round(a)}`
  if (a < 1e6) {
    const k = a / 1e3
    const s = k >= 99.95 ? k.toFixed(0) : k.toFixed(1)
    if (parseFloat(s) < 1000) return `${sinal}${s}k`
  }
  const m = a / 1e6
  return `${sinal}${m.toFixed(m >= 9.995 ? 1 : 2)}M`
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
  const alvo = Date.parse(resetsAt)
  if (!Number.isFinite(alvo)) return ''
  const min = Math.round((alvo - agora) / 60000)
  if (min <= 0) return ' · resets now'
  return ` · resets in ${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

// Bateria do dia no limite semanal: cada dia vale 1/7 da semana (100% da bateria) e vira à meia-noite, hora local.
// O que sobra passa para o dia seguinte (bateria acima de 100%, dourada); o que passou é descontado dele (bateria negativa).
// Não precisa guardar nada: até hoje foram liberados (dias desde o começo da semana + 1) sétimos, nunca mais que a semana inteira.
const DIA_MS = 86400000
const FATIA_DIA = 100 / 7
const meiaNoite = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const bateriaDoDia = (semanal: Limite | undefined, agora: number): number | null => {
  const alvo = semanal?.resetsAt ? Date.parse(semanal.resetsAt) : NaN
  if (!semanal || !Number.isFinite(alvo) || alvo <= agora) return null
  // Math.round absorve os dias de 23h/25h do horário de verão
  const dias = Math.max(0, Math.round((meiaNoite(agora) - meiaNoite(alvo - 7 * DIA_MS)) / DIA_MS))
  const liberado = Math.min((dias + 1) * FATIA_DIA, 100)
  return ((liberado - semanal.percentUsed) / FATIA_DIA) * 100
}

// Tubo de gel do Portal 2, feito em código: vidro horizontal contínuo que enche da esquerda para a direita.
// A escala é real: o tubo inteiro é 100% da janela de contexto e cada gel ocupa exatamente a sua fração, sem largura mínima.
const TUBO_H = 32
const TAMPA = 8 // anel de metal em cada ponta
const PAREDE = 3 // espessura do vidro

const tom = (h: string, m: number) => {
  const alvo = m >= 0 ? 255 : 0
  const canal = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16)
    return Math.round(v + (alvo - v) * Math.abs(m))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(1)}${canal(3)}${canal(5)}`
}

const TUBO_CSS =
  '<style>.gl{animation:gl 8s ease-in-out var(--gl) infinite}.br{animation:br 5s ease-in-out var(--br) infinite alternate}' +
  '.bo{animation:bo 18s linear var(--bo) infinite}' +
  '@keyframes gl{0%{transform:translateX(-90px)}45%,100%{transform:translateX(var(--fora))}}' +
  '@keyframes br{from{transform:translateX(-9px)}to{transform:translateX(9px)}}' +
  '@keyframes bo{from{transform:translateX(0)}to{transform:translateX(var(--fim))}}' +
  '@media (prefers-reduced-motion:reduce){.gl,.br,.bo{animation:none}}</style>'

// Um SVG novo recomeça as animações do zero, e o tubo muda a cada token gasto. Por isso cada animação nasce já na fase
// que o relógio manda: o desenho troca e o movimento continua de onde estava. Enquanto o desenho não muda, a fase
// guardada é reusada, porque trocar o texto do SVG sem necessidade recarregaria a imagem à toa.
// O mascote fica de fora: trocar de humor deve começar o clipe novo no primeiro quadro.
const PERIODOS_CSS: Record<string, number> = { gl: 8, br: 10, bo: 18 } // br é alternate: ida e volta somam 10s
function emFase(svg: string, ms: number): string {
  const atras = (periodo: number) => `-${((ms / 1000) % periodo).toFixed(3)}s`
  return svg
    .replace(/ dur="([\d.]+)s"/g, (_, d) => ` begin="${atras(Number(d))}" dur="${d}s"`)
    .replace(/--(gl|br|bo):0s/g, (_, n) => `--${n}:${atras(PERIODOS_CSS[n] ?? 1)}`)
}
// Os guardados são por sessão ("lugar" leva o id dela) e limitados: duas sessões no mesmo processo não se atropelam
// (cada troca de texto recarregaria a imagem) e o Map não cresce para sempre.
const MAX_GUARDADOS = 12
function guardar<V>(m: Map<string, V>, chave: string, valor: V) {
  if (!m.has(chave) && m.size >= MAX_GUARDADOS) m.delete(m.keys().next().value as string)
  m.set(chave, valor)
}
const emFaseGuardado = new Map<string, { cru: string; pronto: string }>()
function comFase(lugar: string, cru: string, ms: number): string {
  const guardado = emFaseGuardado.get(lugar)
  if (guardado?.cru === cru) return guardado.pronto
  const pronto = emFase(cru, ms)
  guardar(emFaseGuardado, lugar, { cru, pronto })
  return pronto
}
// tubo() custa 1,4 a 2,5 ms e a faixa redesenha várias vezes por segundo: só refaz quando os números mudam.
const tuboGuardado = new Map<string, { chave: string; cru: string }>()
function tuboGuardadoDe(lugar: string, f: Fatias, janela: number, W: number): string {
  const chave = `${f.lido},${f.escrito},${f.input},${f.output},${janela},${W}`
  const g = tuboGuardado.get(lugar)
  if (g?.chave === chave) return g.cru
  const cru = tubo(f, janela, W)
  guardar(tuboGuardado, lugar, { chave, cru })
  return cru
}

// Blob: oito pontos em volta do centro, ligados por uma curva fechada e suave. A deformação é feita de senos
// que dão uma volta inteira no ciclo, então o último quadro é igual ao primeiro e o loop não tem emenda.
function formaDoBlob(cx: number, cy: number, r: number, semente: number, t: number): string {
  const n = 8
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * 2 * Math.PI
    const raio = r * (1 + 0.1 * Math.sin(2 * a + t + semente * 2.1) + 0.07 * Math.sin(3 * a - t + semente * 1.3))
    return [cx + raio * Math.cos(a), cy + raio * Math.sin(a)] as const
  })
  const p = (i: number) => pts[(i + n) % n] as readonly [number, number]
  let d = `M${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    d +=
      `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ` +
      `${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`
  }
  return `${d}Z`
}
function blob(cx: number, cy: number, r: number, semente: number, dur: number, attrs: string, passos = 12): string {
  const quadros = Array.from({ length: passos + 1 }, (_, q) => formaDoBlob(cx, cy, r, semente, (q / passos) * 2 * Math.PI))
  return `<path ${attrs} d="${quadros[0]}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" values="${quadros.join(';')}"/></path>`
}

// Enquanto um tipo é menos de 12% do cache read, ele não dá uma camada que se veja: vira gotas que fluem dentro do
// laranja, com área igual à parte dele na mistura. Dali para cima é uma camada própria, à direita do laranja.
const GOTAS_ATE = 0.12
// Cada gota entra e sai fora da parte visível, onde o salto do loop não aparece. A meia-largura vai a 1,4 r (blob até 1,17 r x escala 1,2) e,
// à direita, o recorte da mistura tem um bojo de +5,5 px: a margem é por gota, 1,4 r + 7, nos dois lados.
const GOTA_MARGEM_R = 1.4
const GOTA_MARGEM_BASE = 7
const MISTURA_TOPO = 7.6 // abaixo da superfície mais funda do gel
const MISTURA_BASE = 27 // acima do fundo mais alto do gel
const GOTA_MIN = 3.4 // o tubo costuma aparecer encolhido: abaixo disso a gota some, mesmo que a área real fosse menor
const GOTAS_MAX = 16 // por tipo: com três tipos o desenho ainda cabe no limite de tamanho do SVG; a área se mantém com gotas maiores
const GOTA_QUADROS = 20
const sorteio = (i: number) => {
  const v = Math.sin(i * 12.9898) * 43758.5453
  return v - Math.floor(v)
}
function gotasDaMistura(x0: number, xFim: number, parte: number, id: string, ordem: number): string {
  const w = xFim - x0
  if (parte <= 0 || w < 2) return ''
  const h = MISTURA_BASE - MISTURA_TOPO
  const meio = (MISTURA_BASE + MISTURA_TOPO) / 2
  const rMedio = 4 + 7 * Math.min(parte, GOTAS_ATE)
  // quantidade e raio usam a margem do raio médio (não a de cada gota), para não haver conta circular
  const percurso = w + 2 * (GOTA_MARGEM_R * rMedio + GOTA_MARGEM_BASE)
  const alvo = parte * percurso * h // o percurso inclui as margens escondidas, então a parte visível fica com a densidade certa
  const n = Math.max(1, Math.min(GOTAS_MAX, Math.round(alvo / (Math.PI * rMedio * rMedio))))
  const pesos = Array.from({ length: n }, (_, i) => 1 + 0.3 * (2 * sorteio(i) - 1))
  const k = alvo / (Math.PI * pesos.reduce((t, p) => t + p, 0))
  return pesos
    .map((p, i) => {
      const r = Math.max(GOTA_MIN, Math.sqrt(k * p))
      const margem = GOTA_MARGEM_R * r + GOTA_MARGEM_BASE
      const esquerda = x0 - margem
      const percursoDela = w + 2 * margem
      const sem = i + ordem * 37
      // Como num tubo de verdade, o líquido corre mais no meio que junto ao vidro: a profundidade da gota dá a velocidade.
      // Tudo aqui depende só da gota, não da largura: o líquido crescer ou uma gota nova não fazem as outras saltarem.
      const fundura = (i % 2 ? 1 : -1) * (0.15 + 0.85 * sorteio(sem + 100))
      const periodo = Math.round(20 + 18 * fundura * fundura)
      const cy = meio + fundura * Math.max(0, h / 2 - r * 0.85 - 2.3)
      const inicio = (0.31 + ordem * 0.21 + i * 0.618034) % 1
      // Acelera e freia ao longo do caminho, e sobe e desce em ondas lentas. Os senos dão voltas inteiras, então o loop fecha.
      const surto = 0.035 + 0.025 * sorteio(sem + 200)
      const surto2 = 0.012 * (sorteio(sem + 250) - 0.5)
      const fx = sorteio(sem + 300)
      const fy = sorteio(sem + 350)
      const xEm = (u: number) => esquerda + percursoDela * (u + surto * Math.sin(2 * Math.PI * u) + surto2 * Math.sin(4 * Math.PI * u))
      const yEm = (t: number) => cy + 1.5 * Math.sin(2 * Math.PI * (2 * t + fx)) + 0.8 * Math.sin(2 * Math.PI * (3 * t + fy))
      const virada = 1 - inicio
      const tempos = Array.from({ length: GOTA_QUADROS + 1 }, (_, q) => q / GOTA_QUADROS).filter(t => t !== virada)
      const pontos: [number, number, number][] = []
      for (const t of tempos) {
        if (t > virada && (pontos[pontos.length - 1]?.[0] ?? 0) < virada) {
          pontos.push([virada, xEm(1), yEm(virada)], [virada, xEm(0), yEm(virada)])
        }
        pontos.push([t, xEm(t < virada ? inicio + t : inicio + t - 1), yEm(t)])
      }
      const chaves = pontos.map(q => q[0].toFixed(4)).join(';')
      const valores = pontos.map(q => `${q[1].toFixed(1)} ${q[2].toFixed(1)}`).join(';')
      return (
        `<g><animateTransform attributeName="transform" type="translate" dur="${periodo}s" repeatCount="indefinite" keyTimes="${chaves}" values="${valores}"/>` +
        // um pouco esticada no sentido do fluxo
        `<g transform="scale(1.2 .85)">` +
        blob(0, 0, r, sem, 11 + (i % 5), `fill="url(#gota-${id})"`, 4) +
        `</g></g>`
      )
    })
    .join('')
}

// Janela 0, NaN ou negativa daria 0/0 nos caminhos e nos clips: um só guarda, usado onde importa.
const JANELA_PADRAO = 200000
const janelaValida = (j: number) => (Number.isFinite(j) && j > 0 ? j : JANELA_PADRAO)
const positivo = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

function tubo(fCru: Fatias, janelaCrua: number, larguraCrua: number): string {
  const janela = janelaValida(janelaCrua)
  const W = Number.isFinite(larguraCrua) && larguraCrua > 0 ? larguraCrua : 760
  const f: Fatias = { lido: positivo(fCru.lido), escrito: positivo(fCru.escrito), input: positivo(fCru.input), output: positivo(fCru.output) }
  const H = TUBO_H
  const x0 = TAMPA
  const L = W - 2 * TAMPA
  const corDe = (campo: (typeof TIPOS)[number]['campo']) => TIPOS.find(x => x.campo === campo)?.cor ?? LIVRE
  const menores = ['escrito', 'input', 'output'] as const
  const emGotas = (c: (typeof TIPOS)[number]['campo']) => c !== 'lido' && f.lido > 0 && f[c] > 0 && f[c] / f.lido < GOTAS_ATE
  const emMistura = menores.filter(emGotas)
  const mistura = emMistura.reduce((t, c) => t + f[c], f.lido)
  let acum = 0
  const pedacos = (
    [
      { id: 'lido', n: mistura },
      ...menores.map(c => ({ id: c, n: emGotas(c) ? 0 : f[c] })),
    ] as const
  )
    .map(x => {
      const a = acum
      acum = Math.min(L, acum + (x.n / janela) * L)
      return { cor: corDe(x.id), id: x.id, b: x0 + acum, largura: acum - a }
    })
    .filter(p => p.largura >= 0.5)
  const fim = x0 + acum
  const xMistura = x0 + Math.min(L, (mistura / janela) * L)
  const gotas = emMistura.map(c => gotasDaMistura(x0, xMistura, f[c] / mistura, c, menores.indexOf(c))).join('')

  // superfície irregular do gel: a mesma para todos os pedaços, para eles encaixarem
  const topo = (x: number, t: number) => PAREDE + 2.1 + 1.7 * Math.sin(x / 15 + t) + 0.8 * Math.sin(x / 6.1 + t * 2)
  const baixo = (x: number, t: number) => H - PAREDE - 1.1 - 0.9 * Math.sin(x / 19 + t)
  const contorno = (b: number, t: number, bojo: number) => {
    let d = `M${x0 - 1} ${topo(x0, t).toFixed(1)}`
    for (let x = x0 + 6; x < b; x += 6) d += `L${x} ${topo(x, t).toFixed(1)}`
    d += `L${b.toFixed(1)} ${topo(b, t).toFixed(1)}Q${(b + bojo).toFixed(1)} ${(H / 2).toFixed(1)} ${b.toFixed(1)} ${baixo(b, t).toFixed(1)}`
    for (let x = Math.floor((b - 1) / 12) * 12; x > x0; x -= 12) d += `L${x} ${baixo(x, t).toFixed(1)}`
    return `${d}L${x0 - 1} ${baixo(x0, t).toFixed(1)}Z`
  }

  // do último para o primeiro: cada gel fica por cima do seguinte e a divisa entre eles é a curva do gel.
  // A superfície segue a mesma fase em todos; só o bojo da ponta muda, para os quadros terem sempre os mesmos pontos.
  const fases = [0, 2.1, 4.2, 0]
  const bojos = [11, 15, 8, 11]
  const geis = [...pedacos]
    .reverse()
    .map(p => {
      const quadros = fases.map((t, q) => contorno(p.b, t, bojos[q] ?? 11))
      // a duração é do tipo, não da posição: um gel novo não muda o ritmo dos outros
      const dur = p.id === 'input' ? 7 : p.id === 'output' ? 8 : p.id === 'escrito' ? 9 : 6
      return `<path fill="url(#c-${p.id})" d="${quadros[0]}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" values="${quadros.join(';')}"/></path>`
    })
    .join('')

  const cores = pedacos
    .map(
      p =>
        `<linearGradient id="c-${p.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${tom(p.cor, 0.45)}"/>` +
        `<stop offset=".38" stop-color="${p.cor}"/><stop offset=".72" stop-color="${tom(p.cor, -0.22)}"/><stop offset="1" stop-color="${tom(p.cor, -0.62)}"/></linearGradient>`,
    )
    .join('')

  // brilhos molhados e bolhas dentro do gel; com gotas na mistura ficam fracos, para não parecerem cache write
  const forcaBrilho = gotas ? 0.35 : 1
  const brilhos: string[] = []
  for (let x = x0 + 8, i = 0; x < fim - 4; x += 15 + ((i * 13) % 17), i++) {
    brilhos.push(`<ellipse cx="${x}" cy="${(H * 0.4 + (i % 3) * 0.9).toFixed(1)}" rx="${4 + (i % 4) * 1.5}" ry="${(1.4 + (i % 2) * 0.7).toFixed(1)}" fill="#fff" fill-opacity="${((0.62 + (i % 3) * 0.14) * forcaBrilho).toFixed(2)}"/>`)
    if (!gotas && i % 2 === 0) brilhos.push(`<circle cx="${x + 7}" cy="${(H * 0.56 + (i % 3)).toFixed(1)}" r="1.1" fill="#fff" fill-opacity=".55"/>`)
  }
  const bolhas =
    gotas || fim - x0 < 40
      ? ''
      : [0, 1, 2, 3, 4]
          .map(i => `<circle class="bo" style="animation-delay:calc(var(--bo) - ${(i * 3.6).toFixed(1)}s)" cx="${x0 - 2}" cy="${H * 0.33 + ((i * 5) % 9) * (H / 24)}" r="${(0.8 + (i % 3) * 0.4).toFixed(1)}" fill="#fff" fill-opacity=".38"/>`)
          .join('')

  // o vidro é reto e entra nos anéis de metal: um tubo contínuo, sem ponta arredondada
  const interno = `x="${x0}" y="${PAREDE}" width="${L}" height="${H - 2 * PAREDE}"`
  const casca = `x="${x0 - 3}" y="1.5" width="${L + 6}" height="${H - 3}"`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="--fim:${L + 4}px;--fora:${W + 90}px;--gl:0s;--br:0s;--bo:0s">${TUBO_CSS}` +
    `<defs>${cores}` +
    emMistura
      .map(c => `<radialGradient id="gota-${c}" cx=".42" cy=".36" r=".68"><stop offset="0" stop-color="${tom(corDe(c), 0.45)}"/><stop offset=".6" stop-color="${corDe(c)}"/><stop offset="1" stop-color="${tom(corDe(c), -0.28)}"/></radialGradient>`)
      .join('') +
    `<clipPath id="mistura"><path d="${contorno(xMistura, 0, 11)}"/></clipPath>` +
    `<clipPath id="dentro"><rect ${interno}/></clipPath>` +
    `<clipPath id="cheio"><rect x="${x0}" y="0" width="${Math.max(0, fim - x0 - 3).toFixed(1)}" height="${H}"/></clipPath>` +
    `<linearGradient id="metal" x1="0" x2="0" y1="0" y2="1">${METAL}</linearGradient>` +
    `<linearGradient id="entra" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="sai" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>` +
    `<filter id="macio" x="-5%" y="-100%" width="110%" height="300%"><feGaussianBlur stdDeviation=".7"/></filter>` +
    `<linearGradient id="vidro" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bcd8e6" stop-opacity=".1"/><stop offset=".55" stop-color="#0e1419" stop-opacity=".35"/><stop offset="1" stop-color="#bcd8e6" stop-opacity=".07"/></linearGradient>` +
    `<linearGradient id="reflexo" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>` +
    `<linearGradient id="clarao" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<rect ${casca} fill="url(#vidro)"/>` +
    `<g clip-path="url(#dentro)">${geis}<g clip-path="url(#mistura)">${gotas}</g><g clip-path="url(#cheio)"><g class="br">${brilhos.join('')}</g>${bolhas}</g></g>` +
    `<path d="M${x0 - 3} 1.5H${x0 + L + 3}M${x0 - 3} ${H - 1.5}H${x0 + L + 3}" fill="none" stroke="#c4dbe6" stroke-opacity=".55"/>` +
    // o vidro escurece ao entrar em cada anel, e tem marcas de medida a 25, 50 e 75% da janela
    `<rect x="${x0}" y="${PAREDE}" width="14" height="${H - 2 * PAREDE}" fill="url(#entra)"/><rect x="${x0 + L - 14}" y="${PAREDE}" width="14" height="${H - 2 * PAREDE}" fill="url(#sai)"/>` +
    `<path d="${[0.25, 0.5, 0.75].map(p => `M${(x0 + L * p).toFixed(1)} ${H - PAREDE}v-${p === 0.5 ? 6 : 4}`).join('')}" stroke="#fff" stroke-opacity=".3" fill="none"/>` +
    `<rect x="${x0}" y="3.2" width="${L}" height="2.4" fill="url(#reflexo)" filter="url(#macio)"/>` +
    `<rect x="${x0}" y="${H - 4.2}" width="${L}" height="1.2" fill="#fff" fill-opacity=".14" filter="url(#macio)"/>` +
        `<g clip-path="url(#dentro)"><path class="gl" d="M0 ${H}L16 0h34L34 ${H}z" fill="url(#clarao)"/></g>` +
    `<rect width="${TAMPA}" height="${H}" rx="1.5" fill="url(#metal)"/><rect x="${TAMPA - 1.5}" width="1.5" height="${H}" fill="#2b3135" fill-opacity=".7"/>` +
    `<rect x="${W - TAMPA}" width="${TAMPA}" height="${H}" rx="1.5" fill="url(#metal)"/><rect x="${W - TAMPA}" width="1.5" height="${H}" fill="#2b3135" fill-opacity=".7"/>` +
    // frisos nos anéis
    `<path d="M2.5 1V${H - 1}M5 1V${H - 1}M${W - 2.5} 1V${H - 1}M${W - 5} 1V${H - 1}" stroke="#14191d" stroke-opacity=".38" stroke-width=".8" fill="none"/>` +
    `</svg>`
  )
}

// A barrinha discreta da cota do Gemini: só o trilho azul que enche conforme o plano é consumido.
const AZUL = '#4FA8FF'
const COTA_W = 28
const COTA_H = 5
const barrinha = (usado: number, cor = AZUL) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${COTA_W}" height="${COTA_H}" viewBox="0 0 ${COTA_W} ${COTA_H}">` +
  `<rect width="${COTA_W}" height="${COTA_H}" rx="2.5" fill="${cor}" fill-opacity=".18"/>` +
  `<rect width="${(Math.min(1, Math.max(0, usado)) * COTA_W).toFixed(2)}" height="${COTA_H}" rx="2.5" fill="${cor}" fill-opacity=".9"/></svg>`
// O Codex (plano ChatGPT) tem a sua cor: um verde-água que não se confunde com os géis nem com o azul do Gemini.
const VERDE_AGUA = '#2DD4BF'

// Os frascos dos limites do Claude (5h e semana) e a bateria do dia: mesmo tamanho, mesmo vidro e mesmo metal.
const VT_W = 58
const VT_H = 74

// A cor do gel anda com o uso: verde vazio, passa pelo amarelo e pelo laranja e chega ao vermelho cheio.
// Gira o matiz em vez de misturar RGB, que no meio do caminho daria um marrom apagado.
function corDoUso(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100
  const h = 125 - 125 * t
  const sat = 0.9
  const luz = 0.55
  const canal = (n: number) => {
    const k = (n + h / 30) % 12
    const v = luz - sat * Math.min(luz, 1 - luz) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`
}

// Metal em cilindro: borda escura, faixa de luz, meio-tom, sombra e um fio de luz do outro lado.
const METAL =
  '<stop offset="0" stop-color="#59636a"/><stop offset=".2" stop-color="#f3f7f9"/><stop offset=".48" stop-color="#9ba6ac"/>' +
  '<stop offset=".82" stop-color="#434c52"/><stop offset="1" stop-color="#77848b"/>'
// Reflexo comprido do vidro: nasce forte em cima e some antes do fundo.
const REFLEXO_VIDRO =
  '<linearGradient id="e" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff" stop-opacity=".75"/>' +
  '<stop offset=".6" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
// Desfoques em coordenadas do desenho: a área não depende do tamanho da forma, então um halo fino não sai cortado.
const DESFOQUES =
  `<filter id="b" filterUnits="userSpaceOnUse" x="0" y="0" width="${VT_W}" height="${VT_H}"><feGaussianBlur stdDeviation="3.2"/></filter>` +
  `<filter id="h" filterUnits="userSpaceOnUse" x="0" y="0" width="${VT_W}" height="${VT_H}"><feGaussianBlur stdDeviation="1.6"/></filter>`
// Vai e volta com aceleração suave. A defasagem entre animações vem sempre dos valores e das durações, nunca de begin:
// comFase já põe um begin em cada <animate>, e dois deixam o SVG inválido.
const SUAVE = 'calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"'
const n1 = (v: number) => v.toFixed(1)
const vaivem = (forma: (a: number) => string, a: number, dur: number) =>
  `<animate attributeName="d" dur="${dur}s" repeatCount="indefinite" ${SUAVE} values="${forma(a)};${forma(-a)};${forma(a)}"/>`
const pecaDeMetal = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${n1(h)}" rx="1.8" fill="url(#m)"/>` +
  `<rect x="${x + 1}" y="${n1(y + 0.6)}" width="${w - 2}" height=".9" rx=".45" fill="#fff" fill-opacity=".5"/>` +
  `<rect x="${x + 0.5}" y="${n1(y + h - 1.3)}" width="${w - 1}" height="1.3" rx=".6" fill="#14191d" fill-opacity=".5"/>`
const rotuloDoFrasco = (texto: string, tamanho: number, cor: string, base = VT_H - 1) =>
  `<text x="${VT_W / 2}" y="${base}" text-anchor="middle" font-size="${tamanho}" font-weight="600" font-family="system-ui,sans-serif" fill="${cor}">${texto}</text>`
// O líquido tem volume: sombreado de cilindro na horizontal e, por cima, claro junto à superfície e escuro no fundo.
const corDoLiquido = (cor: string, nivel: number, fundo: number, sombra = -0.6) =>
  `<linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${tom(cor, -0.3)}"/><stop offset=".28" stop-color="${tom(cor, 0.4)}"/>` +
  `<stop offset=".55" stop-color="${cor}"/><stop offset="1" stop-color="${tom(cor, sombra)}"/></linearGradient>` +
  `<linearGradient id="p" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${n1(Math.min(nivel, fundo - 1))}" y2="${fundo}"><stop offset="0" stop-color="#fff" stop-opacity=".3"/>` +
  `<stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>`

// Frasco de vidro com fundo arredondado: uma gota cresce no bico, cai acelerando e respinga no gel, que brilha e solta bolhas.
function tuboVertical(rotulo: string, usado: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(Number.isFinite(usado) ? usado : 0)))
  const cor = corDoUso(pct)
  const xE = 17
  const xD = 41
  const cx = (xE + xD) / 2
  const yT = 6
  const yB = 56
  const R = 4
  const nivel = yB - (pct / 100) * (yB - yT)
  const altura = yB - nivel
  const vidro = `M${xE} ${yT}V${yB - R}Q${xE} ${yB} ${xE + R} ${yB}H${xD - R}Q${xD} ${yB} ${xD} ${yB - R}V${yT}`
  const crista = (a: number) => `M${xE} ${n1(nivel + a)}Q${xE + 6} ${n1(nivel + a - 1.6)} ${cx} ${n1(nivel)}T${xD} ${n1(nivel - a)}`
  const corpo = (a: number) => `${crista(a)}V${yB}H${xE}Z`
  // a onda de trás fica um pouco acima e em outro ritmo: dá profundidade à superfície
  const tras = (a: number) => `M${xE} ${n1(nivel - 0.9 + a)}Q${xE + 6} ${n1(nivel - 0.9 + a + 1.6)} ${cx} ${n1(nivel - 0.9)}T${xD} ${n1(nivel - 0.9 - a)}V${yB}H${xE}Z`

  // A gota pende do bico crescendo a partir da ponta, solta-se, estica na queda e mergulha atrás da onda da frente.
  const T = 2.6
  const y0 = yT + 1.2
  const yFim = Math.max(y0, nivel - 4)
  const gota =
    pct < 100
      ? `<g><animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.42;.8;1" keySplines="0 0 1 1;.6 0 1 .75;0 0 1 1" values="${cx} ${n1(y0)};${cx} ${n1(y0)};${cx} ${n1(yFim)};${cx} ${n1(yFim)}"/>` +
        `<path d="M0 0C.9 1.6 2 3 2 4.2A2 2 0 1 1 -2 4.2C-2 3 -.9 1.6 0 0Z" fill="${tom(cor, 0.22)}">` +
        `<animateTransform attributeName="transform" type="scale" dur="${T}s" repeatCount="indefinite" keyTimes="0;.42;.8;.81;1" values="0 0;1 1;.8 1.3;0 0;0 0"/></path></g>`
      : ''
  // No impacto: uma ondinha abre na superfície e dois respingos saltam em arco.
  const impacto =
    pct < 100
      ? `<ellipse cx="${cx}" cy="${n1(nivel)}" rx="0" ry="1" fill="none" stroke="${tom(cor, 0.7)}" stroke-width=".9" opacity="0">` +
        `<animate attributeName="rx" dur="${T}s" repeatCount="indefinite" keyTimes="0;.8;1" values="0;0;10"/>` +
        `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="0;.8;.82;1" values="0;0;.95;0"/></ellipse>` +
        [
          { dx: -6, sobe: 6, r: 0.9 },
          { dx: 4.5, sobe: 3.5, r: 0.7 },
        ]
          .map(
            s =>
              `<circle cx="${cx}" cy="${n1(nivel)}" r="${s.r}" fill="${tom(cor, 0.5)}" opacity="0">` +
              `<animate attributeName="cx" dur="${T}s" repeatCount="indefinite" keyTimes="0;.8;1" values="${cx};${cx};${cx + s.dx}"/>` +
              `<animate attributeName="cy" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.8;.9;1" keySplines="0 0 1 1;0 .6 .4 1;.6 0 1 .4" values="${n1(nivel)};${n1(nivel)};${n1(nivel - s.sobe)};${n1(nivel + 1)}"/>` +
              `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="0;.8;.81;.97;1" values="0;0;1;1;0"/></circle>`,
          )
          .join('')
      : ''
  // Bolhas sobem do fundo até a superfície; cada uma espera um pouco diferente antes de sair.
  const bolha = (x: number, r: number, dur: number, k: number) =>
    `<circle cx="${x}" cy="${yB - 2}" r="${r}" fill="#fff" opacity="0">` +
    `<animate attributeName="cy" dur="${dur}s" repeatCount="indefinite" keyTimes="0;${k.toFixed(2)};1" values="${yB - 2};${yB - 2};${n1(nivel + 2)}"/>` +
    `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" keyTimes="0;${k.toFixed(2)};${(k + 0.06).toFixed(2)};.93;1" values="0;0;.65;.65;0"/></circle>`
  const bolhas = altura > 12 ? bolha(xE + 6, 1, 3.4, 0.1) + bolha(cx + 2, 0.8, 4.6, 0.35) + bolha(xD - 5, 1.2, 5.8, 0.2) : ''
  const gel =
    pct > 0
      ? `<path fill="${tom(cor, -0.38)}" d="${tras(1)}">${vaivem(tras, 1, 4)}</path>` +
        gota +
        `<path fill="url(#g)" d="${corpo(0.8)}">${vaivem(corpo, 0.8, 3)}</path>` +
        `<path fill="url(#p)" d="${corpo(0.8)}">${vaivem(corpo, 0.8, 3)}</path>` +
        bolhas +
        `<path fill="none" stroke="${tom(cor, 0.62)}" stroke-width="1.1" stroke-linecap="round" d="${crista(0.8)}">${vaivem(crista, 0.8, 3)}</path>`
      : gota
  // O gel ilumina o que está em volta; perto do limite (80%) a luz pulsa.
  const alerta = pct >= 80
  const luz =
    pct > 0
      ? `<rect x="${xE}" y="${n1(nivel)}" width="${xD - xE}" height="${n1(altura)}" rx="3" fill="${cor}" opacity="${alerta ? 0.6 : 0.42}" filter="url(#b)">` +
        (alerta ? `<animate attributeName="opacity" dur="1.6s" repeatCount="indefinite" ${SUAVE} values=".3;.85;.3"/>` : '') +
        `</rect>`
      : ''
  const marcas = [0.25, 0.5, 0.75].map(f => `M${xD - (f === 0.5 ? 7 : 4.5)} ${n1(yB - f * (yB - yT))}H${xD - 0.8}`).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VT_W}" height="${VT_H}" viewBox="0 0 ${VT_W} ${VT_H}">` +
    `<defs>${corDoLiquido(cor, nivel, yB)}` +
    `<linearGradient id="m" x1="0" x2="1" y1="0" y2="0">${METAL}</linearGradient>` +
    `<linearGradient id="v" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#cfe6f2" stop-opacity=".26"/><stop offset=".2" stop-color="#0b1116" stop-opacity=".5"/>` +
    `<stop offset=".8" stop-color="#0b1116" stop-opacity=".58"/><stop offset="1" stop-color="#cfe6f2" stop-opacity=".18"/></linearGradient>` +
    REFLEXO_VIDRO +
    DESFOQUES +
    `<clipPath id="d"><path d="${vidro}Z"/></clipPath></defs>` +
    luz +
    `<path d="${vidro}Z" fill="url(#v)"/>` +
    `<g clip-path="url(#d)">${gel}${impacto}<path d="${marcas}" stroke="#fff" stroke-opacity=".32" stroke-width=".8" fill="none"/></g>` +
    `<path d="${vidro}" fill="none" stroke="#d6ecf7" stroke-opacity=".75" stroke-width="1.2"/>` +
    `<rect x="${xE + 2.2}" y="${yT + 2}" width="2.2" height="${yB - yT - 8}" rx="1.1" fill="url(#e)"/>` +
    `<rect x="${xD - 3.4}" y="${yT + 5}" width="1" height="${yB - yT - 14}" rx=".5" fill="#fff" fill-opacity=".2"/>` +
    pecaDeMetal(xE - 3.5, 0, xD - xE + 7, yT) +
    `<path d="M${cx - 2.4} ${yT}h4.8l-1.2 1.6h-2.4z" fill="#394147"/>` +
    pecaDeMetal(xE - 3.5, yB + 0.8, xD - xE + 7, 5.4) +
    rotuloDoFrasco(`${rotulo} ${pct}%`, 13, '#ecece6') +
    `</svg>`
  )
}

// A bateria do dia: começa em 100% mais o saldo do dia anterior e descarrega conforme se gasta a cota.
// O número é o que resta e fica negativo depois da cota; a carga para em zero e o contorno pisca em vermelho quando está no fim.
// Acima de 100% (sobra de ontem) ela fica dourada e brilhando enquanto durar o extra.
const BATERIA_FRACA = 15
const OURO = '#E8B931'
function bateria(rotulo: string, restante: number): string {
  const numero = Math.round(Number.isFinite(restante) ? restante : 0) || 0
  const carga = Math.max(0, Math.min(100, numero))
  const dourada = numero > 100
  const fraca = carga <= BATERIA_FRACA
  const cor = dourada ? OURO : corDoUso(100 - carga)
  const xE = 17
  const xD = 41
  const cx = (xE + xD) / 2
  const yT = 9
  const yB = 58
  const nivel = yB - (carga / 100) * (yB - yT)
  const crista = (a: number) => `M${xE} ${n1(nivel + a)}Q${xE + 6} ${n1(nivel + a - 1.2)} ${cx} ${n1(nivel)}T${xD} ${n1(nivel - a)}`
  const corpo = (a: number) => `${crista(a)}V${yB}H${xE}Z`
  // A carga é luz, não líquido: superfície quase parada, uma faixa de claridade que sobe por ela e uma linha acesa no topo.
  const energia =
    carga > 0
      ? `<path fill="url(#g)" d="${corpo(0.6)}">${vaivem(corpo, 0.6, 3)}</path>` +
        `<path fill="url(#p)" d="${corpo(0.6)}">${vaivem(corpo, 0.6, 3)}</path>` +
        `<g clip-path="url(#c)"><rect x="${xE}" y="-12" width="${xD - xE}" height="12" fill="url(#s)">` +
        `<animateTransform attributeName="transform" type="translate" dur="${dourada ? 2.2 : 3.6}s" repeatCount="indefinite" keyTimes="0;.55;1" values="0 ${yB + 12};0 ${n1(nivel)};0 ${n1(nivel)}"/></rect></g>` +
        `<path fill="none" stroke="${tom(cor, 0.7)}" stroke-width="1.1" stroke-linecap="round" d="${crista(0.6)}">${vaivem(crista, 0.6, 3)}</path>`
      : ''
  const celulas = [0.25, 0.5, 0.75].map(f => `M${xE} ${n1(yB - f * (yB - yT))}H${xD}`).join('')
  const formaDoRaio = `M${cx + 2} ${yT + 13}L${cx - 5} ${yT + 27}H${cx - 0.5}L${cx - 2} ${yT + 37}L${cx + 5} ${yT + 22}H${cx + 0.5}Z`
  // O raio tem um clarão desfocado por trás que respira junto com ele; sem carga, sobra só o contorno vermelho.
  const raio =
    carga > 0
      ? `<path d="${formaDoRaio}" fill="#fff" filter="url(#h)"><animate attributeName="opacity" dur="3s" repeatCount="indefinite" ${SUAVE} values=".2;.85;.2"/></path>` +
        `<path d="${formaDoRaio}" fill="#fff" stroke="#0b1116" stroke-opacity=".5" stroke-width=".7" stroke-linejoin="round"><animate attributeName="opacity" dur="3s" repeatCount="indefinite" ${SUAVE} values=".72;1;.72"/></path>`
      : `<path d="${formaDoRaio}" fill="none" stroke="#E24B4A" stroke-opacity=".8" stroke-width="1" stroke-linejoin="round"/>`
  // Estrelinhas de quatro pontas: acendem crescendo e apagam encolhendo, cada uma no seu tempo.
  const estrela = (x: number, y: number, r: number, valores: string, dur: number) => {
    const c = arred(r * 0.26)
    return (
      `<g transform="translate(${x} ${y})"><path d="M0 ${-r}L${c} -${c}L${r} 0L${c} ${c}L0 ${r}L-${c} ${c}L${-r} 0L-${c} -${c}Z" fill="#FFF6C8" opacity="0">` +
      `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="${valores}"/>` +
      `<animateTransform attributeName="transform" type="scale" dur="${dur}s" repeatCount="indefinite" values="${valores.split(';').map(v => (v === '1' ? '1' : '.25')).join(';')}"/></path></g>`
    )
  }
  const estrelas = dourada
    ? estrela(xE + 5, yT + 8, 3, '0;1;0;0', 2.4) + estrela(xD - 4, yT + 20, 2.4, '0;0;1;0', 2.4) + estrela(xE + 6, yB - 10, 2.6, '1;0;0;1', 2.4) +
      estrela(xD + 7, yT + 1, 3.2, '0;0;1;0', 3) + estrela(xE - 7, yT + 30, 2.6, '0;1;0;0', 2.1) + estrela(xD + 8, yB - 14, 2.2, '1;0;0;1', 2.7)
    : ''
  // Luz em volta: ouro pulsando com sobra, vermelho pulsando no fim, e no resto só o clarão da própria carga.
  const corpoTodo = `x="${xE - 2}" y="${yT - 2}" width="${xD - xE + 4}" height="${yB - yT + 4}" rx="6"`
  const luz = dourada
    ? `<rect ${corpoTodo} fill="#FFD86B" filter="url(#b)"><animate attributeName="opacity" dur="2.4s" repeatCount="indefinite" ${SUAVE} values=".3;.8;.3"/></rect>`
    : fraca
      ? `<rect ${corpoTodo} fill="#E24B4A" filter="url(#b)"><animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" ${SUAVE} values=".15;.65;.15"/></rect>`
      : `<rect x="${xE}" y="${n1(nivel)}" width="${xD - xE}" height="${n1(yB - nivel)}" rx="3" fill="${cor}" opacity=".36" filter="url(#b)"/>`
  const pisca = fraca ? `<animate attributeName="stroke-opacity" dur="1.2s" repeatCount="indefinite" ${SUAVE} values="1;.3;1"/>` : ''
  const contorno = fraca ? '#E24B4A' : dourada ? '#FFD86B' : 'url(#k)'
  const corTexto = dourada ? '#FFD86B' : numero < 0 ? '#F09595' : '#ecece6'
  // "Energy 130%" não cabe em 13px: a letra diminui para caber na largura (cerca de 0,6 em por caractere)
  const texto = `${rotulo} ${numero}%`
  const tamanhoTexto = Math.min(13, Math.floor(((VT_W - 2) / (texto.length * 0.6)) * 10) / 10)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VT_W}" height="${VT_H}" viewBox="0 0 ${VT_W} ${VT_H}">` +
    `<defs>${corDoLiquido(cor, nivel, yB, dourada ? -0.3 : -0.6)}` +
    `<linearGradient id="m" x1="0" x2="1" y1="0" y2="0">${METAL}</linearGradient>` +
    `<linearGradient id="k" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f1f6f8"/><stop offset=".5" stop-color="#9fb0ba"/><stop offset="1" stop-color="#5b6870"/></linearGradient>` +
    `<linearGradient id="s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    REFLEXO_VIDRO +
    DESFOQUES +
    `<clipPath id="d"><rect x="${xE}" y="${yT}" width="${xD - xE}" height="${yB - yT}" rx="2.6"/></clipPath>` +
    `<clipPath id="c"><rect x="${xE}" y="${n1(nivel)}" width="${xD - xE}" height="${n1(yB - nivel)}"/></clipPath></defs>` +
    luz +
    pecaDeMetal(cx - 5.5, 2, 11, yT - 4) +
    `<rect x="${xE - 1.6}" y="${yT - 1.6}" width="${xD - xE + 3.2}" height="${yB - yT + 3.2}" rx="4.4" fill="#161c21" stroke="${contorno}" stroke-width="1.5">${pisca}</rect>` +
    `<rect x="${xE}" y="${yT}" width="${xD - xE}" height="${yB - yT}" rx="2.6" fill="#070b0e"/>` +
    `<g clip-path="url(#d)">${energia}<path d="${celulas}" stroke="#0b1116" stroke-opacity=".5" stroke-width="1.1" fill="none"/></g>` +
    raio +
    `<rect x="${xE + 2}" y="${yT + 2.5}" width="2" height="${yB - yT - 9}" rx="1" fill="url(#e)" opacity=".8"/>` +
    estrelas +
    rotuloDoFrasco(texto, tamanhoTexto, corTexto, VT_H - 3.5) +
    `</svg>`
  )
}

// O painel Stats: uso por modelo nesta sessão e os jobs do Gemini.
const PAINEL_STATS = 'stats'
const logsGemini = () => `${CASA}/.claude/funmeter-gemini-logs`
const MAX_LOGS = 300
type UsoGemini = { jobs: number; ok: number; falhas: number; input: number; output: number; raciocinio: number; segundos: number }

// Log já lido não muda: guarda o resumo por nome + mtime. O Map é refeito a cada listagem, então só tem o que está na pasta (máx. MAX_LOGS).
type RegGemini = { modelo: string; ok: boolean; input: number; output: number; raciocinio: number; segundos: number }
let logsLidos = new Map<string, { mtimeMs: number; reg: RegGemini }>()

async function usoGemini($: EngineInterface): Promise<Record<string, UsoGemini>> {
  const saida: Record<string, UsoGemini> = {}
  let lista: { name: string; kind: string; mtimeMs: number }[] = []
  try {
    lista = (await $.fs.list(logsGemini())) as typeof lista
  } catch {
    return saida
  }
  const recentes = lista
    .filter(a => a.kind === 'file' && a.name.endsWith('.json'))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, MAX_LOGS)
  const novos = new Map<string, { mtimeMs: number; reg: RegGemini }>()
  for (const a of recentes) {
    let c = logsLidos.get(a.name)
    if (c?.mtimeMs !== a.mtimeMs) {
      try {
        const j = JSON.parse((await $.fs.read(`${logsGemini()}/${a.name}`)) as string)
        c = {
          mtimeMs: a.mtimeMs,
          reg: {
            modelo: j.model || 'unknown',
            ok: j.status === 'SUCCESS',
            input: j.result?.usage?.input_tokens ?? 0,
            output: j.result?.usage?.output_tokens ?? 0,
            raciocinio: j.result?.usage?.thinking_tokens ?? 0,
            segundos: j.ended && j.started ? Math.round((j.ended - j.started) / 1000) : 0,
          },
        }
      } catch {
        continue // log pela metade: a próxima leitura pega inteiro
      }
    }
    novos.set(a.name, c)
    const r = c.reg
    const u = (saida[r.modelo] ??= { jobs: 0, ok: 0, falhas: 0, input: 0, output: 0, raciocinio: 0, segundos: 0 })
    u.jobs += 1
    if (r.ok) u.ok += 1
    else u.falhas += 1
    u.input += r.input
    u.output += r.output
    u.raciocinio += r.raciocinio
    u.segundos += r.segundos
  }
  logsLidos = novos
  return saida
}

async function alternarStats($: EngineInterface): Promise<boolean> {
  if ((await $.ui.panes()).some(p => p.id === PAINEL_STATS)) {
    await $.ui.close({ id: PAINEL_STATS })
    return false
  }
  await $.ui.open({ id: PAINEL_STATS, title: 'Stats', columns: 46 })
  return true
}

// `agy -p /usage` responde na hora, sem gastar tokens, com a cota real do plano Google.
const agy = () => `${CASA}/AppData/Local/agy/bin/agy.exe`
const COTA_CADA_MS = 120000
const COTA_OLHA_MS = 30000
const cotasArq = () => `${CASA}/.claude/funmeter-cotas.json`
const NOMES_COTA: Record<string, string> = { 'Gemini Models': 'Gemini', 'Gemini 4 Argon': 'Argon', 'Claude and GPT models': 'Claude/GPT' }

function lerCotas(saida: string): Cota[] {
  const json = JSON.parse(saida.slice(saida.indexOf('{')))
  const lista: Cota[] = []
  for (const g of json.command?.data?.groups ?? []) {
    for (const b of g.buckets ?? []) {
      if (typeof b.remaining_fraction !== 'number') continue
      lista.push({ nome: NOMES_COTA[g.name] ?? g.name, janela: b.window === 'weekly' ? 'wk' : String(b.window), usado: 1 - b.remaining_fraction })
    }
  }
  return lista
}

// As sessões abertas dividem uma leitura só, guardada em COTAS_ARQ. O agy roda sem o atualizador:
// a cada 15 min ele abria uma janela de terminal visível (agy --bg-updater). Só 'true' desliga; '1' não.
async function atualizarCotas($: EngineInterface, forcar = false) {
  let salvo: { em: number; lista: Cota[] } | null = null
  try {
    salvo = JSON.parse(String(await $.fs.read(cotasArq())))
  } catch {
    // ainda não existe, ou outra sessão estava gravando
  }
  if (salvo?.lista?.length) {
    const lista = salvo.lista
    await update($, cotas, () => lista)
  }
  if (!forcar && salvo && Date.now() - salvo.em < COTA_CADA_MS) return
  try {
    // Reserva a vez antes de rodar, para as outras sessões não lerem junto.
    await $.fs.write(cotasArq(), JSON.stringify({ em: Date.now(), lista: salvo?.lista ?? [] }))
    const r = await $.process.run([agy(), '-p', '/usage', '--output-format', 'json'], { timeoutMs: 30000, env: { AGY_CLI_DISABLE_AUTO_UPDATE: 'true' } })
    if (r.exitCode === 0) {
      const lista = lerCotas(r.stdout)
      await $.fs.write(cotasArq(), JSON.stringify({ em: Date.now(), lista }))
      await update($, cotas, () => lista)
    }
  } catch {
    // sem agy ou sem rede: fica a última leitura
  }
}

// O Codex grava o limite do plano ChatGPT em cada sessão (~/.codex/sessions/AAAA/MM/DD/*.jsonl).
// Lê a sessão mais recente, sem gastar nada; só relê quando o arquivo muda.
const sessoesCodex = () => `${CASA}/.codex/sessions`
const dois = (n: number) => String(n).padStart(2, '0')
let codexLido: { arq: string; mtimeMs: number } | null = null

function acharLimites(o: unknown): Record<string, unknown> | null {
  if (!o || typeof o !== 'object') return null
  const r = (o as Record<string, unknown>).rate_limits
  if (r && typeof r === 'object') return r as Record<string, unknown>
  for (const v of Object.values(o)) {
    const achado = acharLimites(v)
    if (achado) return achado
  }
  return null
}

function lerCodex(texto: string, agora: number): Cota[] | null {
  const linhas = texto.split('\n')
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (!linhas[i].includes('"rate_limits"')) continue
    let rl: Record<string, unknown> | null = null
    try {
      rl = acharLimites(JSON.parse(linhas[i]))
    } catch {
      continue
    }
    if (!rl) continue
    const lista: Cota[] = []
    for (const b of [rl.primary, rl.secondary] as ({ used_percent?: number; window_minutes?: number; resets_at?: number } | null)[]) {
      if (!b || typeof b.used_percent !== 'number') continue
      const min = b.window_minutes ?? 0
      const janela = min >= 10080 ? 'wk' : min % 60 === 0 && min > 0 ? `${min / 60}h` : `${min}m`
      // Se a janela já reiniciou depois dessa leitura, o uso voltou a zero.
      const reiniciou = typeof b.resets_at === 'number' && b.resets_at * 1000 <= agora
      lista.push({ nome: 'Codex', janela, usado: reiniciou ? 0 : b.used_percent / 100 })
    }
    return lista.length ? lista : null
  }
  return null
}

async function atualizarCodex($: EngineInterface) {
  let achado: { arq: string; mtimeMs: number } | null = null
  for (let d = 0; d < 7 && !achado; d++) {
    const dia = new Date(Date.now() - d * 86400000)
    const pasta = `${sessoesCodex()}/${dia.getFullYear()}/${dois(dia.getMonth() + 1)}/${dois(dia.getDate())}`
    try {
      const lista = (await $.fs.list(pasta)) as { name: string; kind: string; mtimeMs: number }[]
      const ult = lista.filter(a => a.kind === 'file' && a.name.endsWith('.jsonl')).sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
      if (ult) achado = { arq: `${pasta}/${ult.name}`, mtimeMs: ult.mtimeMs }
    } catch {
      // dia sem sessão do Codex
    }
  }
  if (!achado || (codexLido?.arq === achado.arq && codexLido.mtimeMs === achado.mtimeMs)) return
  try {
    const lista = lerCodex(String(await $.fs.read(achado.arq)), Date.now())
    codexLido = achado
    if (lista) await update($, cotasCodex, () => lista)
  } catch {
    // arquivo sendo gravado: tenta na próxima volta
  }
}

// Rodada de agentes de fora: antes do primeiro uso de um agente a cota dele é medida e guardada;
// a caixinha mostra só o que se gastou desde então e some no ✕. O próximo uso depois do ✕ começa outra rodada.
type Agente = 'Gemini' | 'Codex'
const chaveCota = (c: Cota) => `${c.nome}|${c.janela}`

function agenteDe(e: Record<string, unknown>): Agente | null {
  const ferramenta = String(e.tool ?? '')
  if (/^mcp__codex__/i.test(ferramenta)) return 'Codex'
  if (/^mcp__gemini__/i.test(ferramenta)) return 'Gemini'
  if (ferramenta === 'Agent' && /antigravity|gemini/i.test(String(e.subagent_type ?? ''))) return 'Gemini'
  if (ferramenta === 'Bash' || ferramenta === 'PowerShell') {
    const cmd = String(e.command ?? '')
    if (/\bcodex(\.exe)?\s/i.test(cmd)) return 'Codex'
    if (/\bagy(\.exe)?\s|\bgemini(\.exe)?\s/i.test(cmd)) return 'Gemini'
  }
  return null
}

const medirAgente = ($: EngineInterface, a: Agente) => (a === 'Codex' ? atualizarCodex($) : atualizarCotas($, true))
const cotasDoAgente = async ($: EngineInterface, a: Agente): Promise<Cota[]> => (a === 'Codex' ? read($, cotasCodex) : read($, cotas))

// Cada agente ganha um codinome sci-fi sorteado a cada rodada, nunca igual ao do outro; a cor da caixinha diz quem é (azul Gemini, verde-água Codex).
const NOMES_SCIFI = ['Vex-9', 'Nova', 'Orion', 'Zephyr', 'Astra-7', 'Nyx', 'Talon', 'Cygnus', 'Solaris', 'Ion', 'Quasar', 'Helix-3', 'Lyra', 'Axon', 'Vanta', 'Pulsar', 'Kestrel', 'Nebula', 'Rigel', 'Vega', 'Chronos', 'Halcyon', 'Photon', 'Zenith']
const sortearNome = (usados: string[]) => {
  const livres = NOMES_SCIFI.filter(n => !usados.includes(n))
  return livres[Math.floor(Math.random() * livres.length)] ?? NOMES_SCIFI[0]!
}

async function comecarRodada($: EngineInterface, a: Agente) {
  const atual = await read($, rodada)
  if (atual?.agentes.includes(a)) return
  await medirAgente($, a)
  const inicio: Record<string, number> = {}
  for (const c of await cotasDoAgente($, a)) inicio[chaveCota(c)] = c.usado
  await update($, rodada, r => {
    const nomes = { ...(r?.nomes ?? {}) }
    nomes[a] = sortearNome(Object.entries(nomes).filter(([k]) => k !== a).map(([, v]) => v))
    return { agentes: [...(r?.agentes ?? []), a], inicio: { ...(r?.inicio ?? {}), ...inicio }, nomes }
  })
}

async function fecharAgente($: EngineInterface, a: string) {
  await update($, rodada, r => {
    if (!r) return null
    const agentes = r.agentes.filter(x => x !== a)
    return agentes.length ? { ...r, agentes } : null
  })
}

// O que a rodada gastou de cada cota. Cota que não existia no começo conta do zero da primeira leitura (nada);
// janela que reiniciou no meio fica em zero, nunca negativa.
function gastoNaRodada(lista: Cota[], inicio: Record<string, number>, nome: string): Cota[] {
  const gastos = lista.map(c => ({ ...c, usado: Math.max(0, c.usado - (inicio[chaveCota(c)] ?? c.usado)) }))
  const usados = gastos.filter(c => c.usado >= 0.005)
  if (usados.length) return usados
  // nada gasto ainda: mostra só a cota principal do agente, em 0%
  const principal = gastos.find(c => c.nome === nome && c.janela === 'wk') ?? gastos.find(c => c.nome === nome) ?? gastos[0]
  return principal ? [principal] : []
}

async function somar($: EngineInterface, f: Fatias, modelo: string) {
  const v = valor(f, modelo)
  await update($, estimado, x => x + v)
  await update($, porModelo, todos => {
    const a: UsoModelo = todos[modelo] ?? { chamadas: 0, ...ZERO }
    return {
      ...todos,
      [modelo]: {
        chamadas: a.chamadas + 1,
        lido: a.lido + f.lido,
        escrito: a.escrito + f.escrito,
        input: a.input + f.input,
        output: a.output + f.output,
      },
    }
  })
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
  await update($, ultimaResposta, () => null)
  await update($, parado, () => false)
  await update($, paradoFechado, () => null)
  await update($, velocidade, () => null)
  await update($, porModelo, () => ({}))
}

async function limpar($: EngineInterface) {
  if (await read($, ocupado)) return
  await $.command.run({ command: 'clear' })
  await zerar($)
}

const pastaSessoes = () => `${CASA}/.claude/projects`

async function arquivoDa($: EngineInterface, id: string): Promise<string> {
  const slug = (await $.session.cwd()).replace(/[^A-Za-z0-9]/g, '-')
  return `${pastaSessoes()}/${slug}/${id}.jsonl`
}

async function tituloDa($: EngineInterface, id: string): Promise<string | null> {
  try {
    const arquivo = await arquivoDa($, id)
    let txt: string
    try {
      txt = String(await $.fs.read(arquivo))
    } catch {
      // fs.read recusa arquivo acima de 4 MiB, e é nas sessões longas que o Handoff mais se usa: o findstr devolve só as linhas do título
      const r = await $.process.run(['findstr', '/C:custom-title', arquivo.split('/').join('\\')], { timeoutMs: 20000 })
      txt = r.stdout
    }
    const m = [...txt.matchAll(/"type":"custom-title","customTitle":"((?:[^"\\]|\\.)*)"/g)]
    return m.length ? (JSON.parse(`"${m[m.length - 1]?.[1] ?? ''}"`) as string) : null
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
    const caminho = `${pastaHandoffs()}/handoff-${id}-${await $.clock.now()}.md`
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
    // A troca termina apagando a sessão antiga, sem volta. O resumo salvo é a única cópia fora da sessão nova: sem ele, a antiga fica.
    if (!salvo) {
      $.ui.toast('Handoff sent, but the summary could not be saved, so the old session was kept')
      return
    }
    try {
      // process.run resolve com qualquer código de saída, e o del sai com 0 mesmo quando falha: quem confirma é o arquivo ter sumido
      await $.process.run(['cmd', '/c', 'del', '/q', arquivo.split('/').join('\\')])
      if (await $.fs.exists(arquivo)) throw new Error('still there')
      $.ui.toast('Handoff sent; old session deleted')
    } catch {
      $.ui.toast(`Handoff sent, but could not delete the old session (${arquivo})`)
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
const PISO_RETOMADO = 20000 // tamanho assumido da 1ª mensagem numa sessão retomada
const REAPARECE_MSGS = 5 // fechado no ✕, o aviso volta depois de 5 mensagens
const FORCAR_LARANJA = false // true mostra o aviso sempre (para testar o visual)

// As fatias do último turno, encolhidas ou esticadas para somarem o contexto medido: mantêm a proporção entre os tipos.
function naMedida(f: Fatias, medido: number | null): Fatias {
  const total = soma(f)
  if (medido === null || total <= 0) return f
  const k = medido / total
  return { lido: Math.round(f.lido * k), escrito: Math.round(f.escrito * k), input: Math.round(f.input * k), output: Math.round(f.output * k) }
}

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

// Passada 1h da última resposta o cache expirou, e a próxima mensagem escreve o contexto inteiro de novo como cache write.
// A hora fica também em $.store, para o aviso valer numa sessão retomada depois de fechar o app.
const PARADO_MS = 60 * 60 * 1000
const RESPOSTAS_MAX = 50

async function verParado($: EngineInterface) {
  const quando = await read($, ultimaResposta)
  const agora = await $.clock.now()
  const esta = quando !== null && agora - quando >= PARADO_MS
  if (esta !== (await read($, parado))) await update($, parado, () => esta)
}

async function lerResposta($: EngineInterface) {
  try {
    const salvas = ((await $.store.get('respostas')) ?? {}) as Record<string, number>
    const quando = salvas[await $.session.id()]
    if (quando) await update($, ultimaResposta, () => quando)
  } catch {
    // sem a hora salva, o aviso só deixa de valer para uma sessão retomada; o medidor segue normal
  }
}

async function guardarResposta($: EngineInterface) {
  const agora = await $.clock.now()
  await update($, ultimaResposta, () => agora)
  await update($, parado, () => false)
  try {
    const salvas = ((await $.store.get('respostas')) ?? {}) as Record<string, number>
    const recentes = Object.entries({ ...salvas, [await $.session.id()]: agora })
      .sort((a, b) => b[1] - a[1])
      .slice(0, RESPOSTAS_MAX)
    await $.store.set('respostas', Object.fromEntries(recentes))
  } catch {
    // idem: guardar a hora nunca pode derrubar o resto do fim de turno
  }
}

async function fecharParado($: EngineInterface) {
  const quando = await read($, ultimaResposta)
  await update($, paradoFechado, () => quando)
}

const duracao = (ms: number) => {
  const min = Math.floor(ms / 60000)
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

const ultimoBom = new Map<string, any>()
let relerResposta = false
// depois de resume/branch/clear a hora da última resposta é a da conversa nova: lê de novo no 1º evento que vier (measure ou fim de turno; o desenho não serve: a leitura do store não pegou lá)
async function conferirRelida($: EngineInterface) {
  if (!relerResposta) return
  relerResposta = false
  await lerResposta($)
  await verParado($)
}

export const register: Register = on => {
  const turnosContados = new Set<string>()

  on('session.start', async ($, e, next) => {
    $.ui.status(undefined)
    await acharCasa($)
    void atualizarCotas($)
    void atualizarCodex($)
    $.clock.every(COTA_OLHA_MS, () => {
      void atualizarCotas($)
      void atualizarCodex($)
    })
    await lerResposta($)
    await verParado($)
    $.clock.every(30000, () => void verParado($))
    await $.command.register({ name: 'funstats', description: 'Show or hide the usage stats pane' })
    // Mantém os números do Gemini frescos enquanto o painel está aberto.
    $.clock.every(4000, () => {
      void $.ui.panes().then(l => {
        if (l.some(p => p.id === PAINEL_STATS)) void update($, pulso, n => n + 1)
      })
    })
    return next(e)
  })

  // Gemini ou Codex: mede a cota antes do primeiro uso da rodada e de novo quando a chamada termina.
  on('tool.call', async ($, e, next) => {
    const agente = agenteDe(e as unknown as Record<string, unknown>)
    if (!agente) return next(e)
    try {
      await comecarRodada($, agente)
    } catch {
      // sem leitura agora: a caixinha aparece na próxima medição
    }
    const r = await next(e)
    // espera a leitura (o agy /usage responde na hora): quando o resultado volta, a caixinha já tem o gasto da chamada
    try {
      await medirAgente($, agente)
    } catch {
      // sem leitura: fica a do relógio de 30s
    }
    return r
  })

  on('command.run', { command: 'funstats' }, async $ => {
    return { text: (await alternarStats($)) ? 'Stats pane open.' : 'Stats pane closed.' }
  })

  on('session.end', async ($, e, next) => {
    // clear, resume e a troca de sessão do Handoff (branch) mantêm o processo sob outro id e não disparam session.start:
    // o estado da conversa anterior sai, e a hora da última resposta da nova é lida de novo no próximo measure ou fim de turno.
    // O Handoff zera de novo depois do branch (inofensivo) e o texto dele já está guardado numa variável local.
    if (e.reason === 'clear' || e.reason === 'resume' || e.reason === 'other') {
      await zerar($)
      relerResposta = true
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // Lê o fluxo à mão para cronometrar do primeiro pedaço ao último: tok/s sem a espera até o modelo começar a responder.
    const fluxo = next(e)
    let primeiro: number | null = null
    let chegou = false
    let r: Awaited<typeof fluxo.result>
    try {
      let passo = await fluxo.next()
      while (!passo.done) {
        primeiro ??= await $.clock.now()
        yield passo.value
        passo = await fluxo.next()
      }
      chegou = true
      r = passo.value
    } finally {
      if (!chegou) await fluxo.return(undefined as never)
    }
    if (r.usage) {
      const f = deUso(r.usage)
      turnosContados.add(e.turnId)
      if (turnosContados.size > 50) turnosContados.delete(turnosContados.values().next().value as string) // turno abortado nunca chega ao turn.complete
      await somar($, f, e.model)
      if (!e.agentId) {
        await update($, fatias, () => f)
        await update($, piso, p => p ?? soma(f))
        const seg = primeiro === null ? 0 : ((await $.clock.now()) - primeiro) / 1000
        if (f.output >= 10 && seg >= 0.2) await update($, velocidade, () => Math.round(f.output / seg))
      }
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await conferirRelida($)
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
      await guardarResposta($)
      await update($, feliz, () => true)
      $.clock.after(4000, () => update($, feliz, () => false))
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    await conferirRelida($)
    const c = e.context
    if (c.tokens !== undefined) {
      const m: Medida = { tokens: c.tokens, janela: c.window, percent: c.percent ?? 0 }
      await update($, medida, () => m)
      // O piso nasce da soma do 1º turno, que num turno de várias chamadas é maior que o contexto: nunca passa do medido.
      if (c.tokens > 0) await update($, piso, p => (p !== null && p > (c.tokens as number) ? (c.tokens as number) : p))
      // Sessão retomada: a 1ª mensagem não está à vista, então o piso é um tamanho típico e as mensagens vêm do número de turnos.
      if (c.tokens > 0 && (await read($, piso)) === null && (await read($, mensagens)) === 0) {
        try {
          const turnos = await $.session.turns()
          if (turnos >= 2) {
            await update($, piso, () => Math.min(c.tokens ?? PISO_RETOMADO, PISO_RETOMADO))
            await update($, mensagens, () => turnos)
          }
        } catch {
          // sem o número de turnos fica como sessão nova
        }
      }
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

    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const Svg = 'Svg' in ui ? ui.Svg : undefined

    // Everything is read at once and next(e) is asked last: while Claude works the band redraws many times a second,
    // and a slow draw that asked next(e) first left the band without the meter whenever a newer redraw cut it short.
    const [lidas, m, t, gasto, estimativa, usadas, lims, gerando, contente, agora, base, msgs, fechouEm, plano, tokSeg, respondeuEm, estaParado, paradoFechou, sid, codex, run] = await Promise.all([
      read($, fatias),
      read($, medida),
      read($, totais),
      read($, custo),
      read($, estimado),
      read($, skills),
      read($, limites),
      read($, ocupado),
      read($, feliz),
      $.clock.now(),
      read($, piso),
      read($, mensagens),
      read($, fechado),
      read($, cotas),
      read($, velocidade),
      read($, ultimaResposta),
      read($, parado),
      read($, paradoFechado),
      $.session.id().catch(() => ''),
      read($, cotasCodex),
      read($, rodada),
    ])

    // Sempre visível: antes da primeira resposta (e depois do Clear) desenha o funmeter inteiro zerado, com o mascote animado.
    const f = lidas ?? ZERO

    let meu: any
    try {
      meu = desenhar()
      guardar(ultimoBom, sid, meu)
    } catch (erro) {
      // a draw that throws makes the engine show the band without the meter: show the last good one and why
      meu = (
        <Box flexDirection="column">
          {ultimoBom.get(sid)}
          <Text dimColor>Context meter error: {String(erro).slice(0, 160)}</Text>
        </Box>
      )
    }
    const acima = await next(e)
    return (
      <Box flexDirection="column">
        {acima}
        {meu}
      </Box>
    )

    function desenhar() {
    const cincoHoras = lims.find(x => x.kind === 'five_hour')
    const semana = lims.find(x => x.kind === 'seven_day')
    const modo: Modo = e.props.isWorking ? 'working' : contente ? 'happy' : 'idle'
    const janela = janelaValida(m?.janela ?? JANELA_PADRAO)
    // f é a soma de todas as chamadas do último turno: num turno longo ela passa do que está no contexto (e até da janela).
    // O tamanho do contexto é o que o engine mediu; f só diz em que proporção ele se divide entre os tipos.
    const medido = m?.tokens !== undefined && m.tokens > 0 ? m.tokens : null
    const noTubo = naMedida(f, medido)
    const ocupadoCtx = soma(noTubo)
    // numa sessão retomada ainda não há resposta nesta execução (f é zero), mas o engine já mediu o contexto
    const ctx = medido ?? ocupadoCtx
    const livre = Math.max(janela - ocupadoCtx, 0)
    const percent = m?.percent ?? Math.round((ocupadoCtx / janela) * 100)
    const corPct = percent >= 85 ? '#E24B4A' : undefined
    const bateriaHoje = bateriaDoDia(semana ?? undefined, agora)
    const corLimite = cincoHoras && cincoHoras.percentUsed >= 80 ? '#E24B4A' : undefined
    const extra = ctx - (base ?? ctx)
    const vale = FORCAR_LARANJA || valeHandoff(ctx, base, msgs, percent)
    const aviso = vale && (fechouEm === null || msgs - fechouEm >= REAPARECE_MSGS)
    const avisoParado = estaParado && !e.props.isWorking && ctx > 0 && respondeuEm !== null && paradoFechou !== respondeuEm
    const textoAviso = avisoParado
      ? `Last reply was ${duracao(agora - (respondeuEm ?? agora))} ago: the cache has expired, so your next message writes all ${num(ctx)} tokens of context again. Handoff starts fresh instead.`
      : extra > 0
        ? `Good time for a handoff: ${num(extra)} tokens of history, it pays for itself in ~${Math.max(1, Math.ceil(HANDOFF_CUSTO / (extra * 0.1)))} messages`
        : `Good time for a handoff: context at ${percent}%`
    // O desenho nasce um pouco mais largo que o espaço; sem `width`, o app o encolhe até a vaga e o tubo encosta no x%.
    const tuboW = Math.max(220, Math.min(1400, Math.round((e.props.bodyColumns ?? 100) * 7.6)))
    const listaSkills =
      usadas.length === 0
        ? 'none'
        : usadas.slice(-MAX_SKILLS).join(' · ') +
          (usadas.length > MAX_SKILLS ? ` +${usadas.length - MAX_SKILLS}` : '')

    return (
      <Box flexDirection="column">
      {(avisoParado || aviso) && (
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
          <Button key="fechar-aviso" plain label="✕" onPress={() => (avisoParado ? fecharParado($) : fecharAviso($))} />
        </Box>
      )}
      <Box flexDirection="row" gap={1} alignItems="center">
        {Svg && mascote(modo).length <= SVG_MAX && (
          <Box key="mascote" flexShrink={0}>
            <Svg source={mascote(modo)} alt="Claude mascot" width={COLUNAS * CEL} height={LINHAS * CEL} />
          </Box>
        )}
      {/* À direita do mascote: em cima as medidas e os frascos, embaixo um rodapé com os agentes e os botões.
          Os botões são mais largos que os frascos; na mesma coluna deixavam um buraco entre o tubo e os frascos. */}
      <Box key="corpo" flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} rowGap={1}>
      <Box key="cima" flexDirection="row" columnGap={2} alignItems="center">
      <Box key="medidas" flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
        <Box flexDirection="row" gap={1} alignItems="center">
          {Svg ? (
            <Box key="tubo" flexGrow={1} flexShrink={1} minWidth={0}>
              <Svg key="tubo-svg" source={comFase(`${sid}:tubo`, tuboGuardadoDe(sid, noTubo, janela, tuboW), agora)} alt={`Context ${percent}%`} height={TUBO_H} />
            </Box>
          ) : (
            <Box flexDirection="row" flexGrow={1} columnGap={0}>
              {TIPOS.filter(x => noTubo[x.campo] > 0).map(x => (
                <Box key={x.campo} flexGrow={escala(noTubo[x.campo], janela)} minWidth={1} height={1} backgroundColor={x.cor} />
              ))}
              <Box key="livre" flexGrow={escala(livre, janela)} minWidth={livre > 0 ? 1 : 0} height={1} backgroundColor={LIVRE} />
            </Box>
          )}
          <Box key="contexto" flexDirection="row" columnGap={1} flexShrink={0}>
            <Text color={corPct} bold>
              {percent}%
            </Text>
            <Text dimColor>
              {num(m?.tokens ?? ocupadoCtx)}/{num(janela)}
            </Text>
          </Box>
        </Box>
            <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
              {TIPOS.map(x => (
                <Text key={x.campo}>
                  <Text color={x.cor}>●</Text> <Text dimColor>{x.curto}</Text> <Text bold>{num(f[x.campo])}</Text>
                  <Text dimColor>/{num(t[x.campo])}</Text>
                </Text>
              ))}
            </Box>
            {/* Segunda linha: o que se mede da conversa (acerto do cache, custo, velocidade, quando o limite volta). */}
            <Box key="metricas" flexDirection="row" flexWrap="wrap" columnGap={2}>
              {acerto(t) !== null && (
                <Text>
                  <Text dimColor>hit</Text>{' '}
                  <Text bold color={corAcerto(acerto(f))}>
                    {acerto(f) ?? 0}%
                  </Text>
                  <Text dimColor>/</Text>
                  <Text color={corAcerto(acerto(t))}>{acerto(t)}%</Text>
                </Text>
              )}
              <Text bold>{gasto !== null ? usd(gasto) : `≈ ${usd(estimativa)}`}</Text>
              {tokSeg !== null && (
                <Text key="tok-s">
                  <Text bold>{tokSeg}</Text> <Text dimColor>tok/s</Text>
                </Text>
              )}
              {cincoHoras && (
                <Text color={corLimite} dimColor={corLimite === undefined} bold={corLimite !== undefined}>
                  5h{falta(cincoHoras.resetsAt, agora)}
                </Text>
              )}
            </Box>
      </Box>
          {Svg && (cincoHoras || semana) && (
            <Box key="tubos-limite" flexDirection="row" alignItems="center" flexShrink={0}>
              {cincoHoras && <Svg source={comFase(`${sid}:5h`, tuboVertical('5h', cincoHoras.percentUsed), agora)} alt={`5 hour limit ${cincoHoras.percentUsed}%`} width={VT_W} height={VT_H} />}
              {bateriaHoje !== null && <Svg source={comFase(`${sid}:24h`, bateria('Energy', bateriaHoje), agora)} alt={`Today's battery (1/7 of the weekly limit, carried over at midnight): ${Math.round(bateriaHoje)}%`} width={VT_W} height={VT_H} />}
              {semana && <Svg source={comFase(`${sid}:wk`, tuboVertical('wk', semana.percentUsed), agora)} alt={`Weekly limit ${semana.percentUsed}%`} width={VT_W} height={VT_H} />}
            </Box>
          )}
      </Box>
      <Box key="rodape" flexDirection="row" columnGap={2} alignItems="center" justifyContent="space-between">
            <Box key="agentes" flexDirection="row" flexWrap="wrap" columnGap={1} alignItems="center" flexGrow={1} flexShrink={1} minWidth={0}>
              {/* Uma caixinha por agente usado nesta rodada, só com o que ele gastou desde a medição de antes; o ✕ fecha. */}
              {[
                { nome: 'Gemini', cor: AZUL, fundo: '#1A2738', lista: plano as Cota[] },
                { nome: 'Codex', cor: VERDE_AGUA, fundo: '#142D2A', lista: codex as Cota[] },
              ]
                .filter(g => run?.agentes.includes(g.nome))
                .map(g => ({ ...g, lista: gastoNaRodada(g.lista, run?.inicio ?? {}, g.nome) }))
                .filter(g => g.lista.length > 0)
                .map(g => (
                  // Fundo tingido em vez de borda: a caixinha ocupa uma linha só.
                  <Box key={`agente-${g.nome}`} flexDirection="row" columnGap={1} alignItems="center" flexShrink={0} backgroundColor={g.fundo} paddingX={1}>
                    <Text color={g.cor} bold>
                      {run?.nomes?.[g.nome] ?? g.nome}
                    </Text>
                    {g.lista.map((c: Cota) => (
                      <Box key={`${c.nome}-${c.janela}`} flexDirection="row" columnGap={1} alignItems="center" flexShrink={0}>
                        <Text dimColor>{c.nome === g.nome ? c.janela : `${c.nome} ${c.janela}`}</Text>
                        {Svg && <Svg source={barrinha(c.usado, g.cor)} alt={`${c.nome} ${c.janela} ${Math.round(c.usado * 100)}%`} width={COTA_W} height={COTA_H} />}
                        <Text color={g.cor}>{Math.round(c.usado * 100)}%</Text>
                      </Box>
                    ))}
                    <Button key={`fechar-${g.nome}`} plain label="✕" onPress={() => fecharAgente($, g.nome)} />
                  </Box>
                ))}
              {usadas.length > 0 && <Text dimColor wrap="truncate-end">Skills: {listaSkills}</Text>}
            </Box>
          <Box flexDirection="row" columnGap={1} flexShrink={0}>
            <Button key="mods" label="Mods" onPress={() => $.ui.open({ id: "mods", title: "Mods" })} />
            <Button key="stats" label="Stats" onPress={() => void alternarStats($)} />
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
    }
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL_STATS }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    await read($, pulso)
    const [meus, gemini, dobra, lims, plano, tokSeg, agora] = await Promise.all([
      read($, porModelo),
      usoGemini($),
      read($, dobrados),
      read($, limites),
      read($, cotas),
      read($, velocidade),
      $.clock.now(),
    ])
    const nome = (m: string) => m.replace(/^claude-/, '').replace(/-\d{8}$/, '')
    const secao = (id: string, titulo: string, linhas: string[]) => {
      const fechada = dobra[id] === true
      return (
        <Box key={id} flexDirection="column">
          <Button key={`t:${id}`} label={`${fechada ? '▸' : '▾'} ${titulo}`} onPress={() => void update($, dobrados, d => ({ ...d, [id]: !d[id] }))} />
          {!fechada && linhas.map((l, i) => <Text key={`${id}:${i}`} dimColor>{`  ${l}`}</Text>)}
        </Box>
      )
    }
    const claude = Object.entries(meus).sort((a, b) => b[1].chamadas - a[1].chamadas)
    const jobs = Object.entries(gemini).sort((a, b) => b[1].jobs - a[1].jobs)
    return (
      <Box flexDirection="column">
        <Text bold>Claude (this session)</Text>
        {tokSeg !== null && <Text dimColor>  last response {tokSeg} tok/s</Text>}
        {lims.map(l => (
          <Text key={l.kind} dimColor>{`  ${l.kind === 'five_hour' ? '5h' : l.kind === 'seven_day' ? 'week' : l.kind} ${l.percentUsed}%${falta(l.resetsAt, agora)}`}</Text>
        ))}
        {(() => {
          const s = lims.find(x => x.kind === 'seven_day')
          const alvo = s?.resetsAt ? Date.parse(s.resetsAt) : NaN
          const b = bateriaDoDia(s, agora)
          if (!s || b === null) return null
          const dias = ((alvo - agora) / DIA_MS).toFixed(1)
          return <Text key="cota-dia-stats" dimColor>{`  today's battery ${Math.round(b)}% (100% = ${FATIA_DIA.toFixed(1)}% of the week) · ${100 - s.percentUsed}% of the week left over ${dias} days`}</Text>
        })()}
        {claude.length === 0 && <Text dimColor>  no calls yet</Text>}
        {claude.map(([m, u]) =>
          secao(`c:${m}`, `${nome(m)}  ${u.chamadas}x  ${num(u.input + u.output)}`, [
            `input  ${num(u.input)}`,
            `output ${num(u.output)}`,
            `cache read ${num(u.lido)}  written ${num(u.escrito)}`,
          ]),
        )}
        <Text bold color={AZUL}>Gemini / agy (Google)</Text>
        {plano.map(c => (
          <Text key={`${c.nome}-${c.janela}`} dimColor>{`  ${c.nome} ${c.janela} ${Math.round(c.usado * 100)}%`}</Text>
        ))}
        {jobs.length === 0 && <Text dimColor>  no jobs yet</Text>}
        {jobs.map(([m, u]) =>
          secao(`g:${m}`, `${m}  ${u.jobs} jobs  ${num(u.input + u.output)}`, [
            `ok ${u.ok}  failed ${u.falhas}`,
            `input ${num(u.input)}  output ${num(u.output)}`,
            `thinking ${num(u.raciocinio)}  time ${u.segundos}s`,
          ]),
        )}
      </Box>
    )
  })
}
