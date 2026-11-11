export type Fatias = { lido: number; escrito: number; input: number; output: number }
export type Medida = { tokens: number; janela: number; percent: number }
export type Limite = { kind: string; percentUsed: number; resetsAt?: string }
export type Cota = { nome: string; janela: string; usado: number }
export type UsoModelo = Fatias & { chamadas: number }
/** Uso de agentes de fora (Gemini, Codex) nesta rodada: a leitura de cada cota antes do primeiro uso, por `nome|janela`. */
export type Rodada = { agentes: string[]; inicio: Record<string, number>; nomes?: Record<string, string> }

declare module 'claude-code' {
  interface PluginState {
    funmeter: {
      fatias: Fatias | null
      medida: Medida | null
      skills: string[]
      totais: Fatias
      custo: number | null
      estimado: number
      limites: Limite[]
      ocupado: boolean
      feliz: boolean
      piso: number | null
      mensagens: number
      fechado: number | null
      cotas: Cota[]
      cotasCodex: Cota[]
      velocidade: number | null
      porModelo: Record<string, UsoModelo>
      dobrados: Record<string, boolean>
      pulso: number
      ultimaResposta: number | null
      parado: boolean
      paradoFechado: number | null
      rodada: Rodada | null
    }
  }
}
