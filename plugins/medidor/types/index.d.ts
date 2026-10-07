export type Fatias = { lido: number; escrito: number; input: number; output: number }
export type Medida = { tokens: number; janela: number; percent: number }
export type Limite = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    medidor: {
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
    }
  }
}
