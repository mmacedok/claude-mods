export type Fatias = { lido: number; escrito: number; input: number; output: number }
export type Medida = { tokens: number; janela: number; percent: number }
export type Limite = { kind: string; percentUsed: number; resetsAt?: string }
export type Cota = { nome: string; janela: string; usado: number }
export type UsoModelo = Fatias & { chamadas: number }
/** Uma barra de agente (docs/AGENTES-PLANO.md): subagente do Claude ou job do Gemini/Codex. */
export type BarraAgente = {
  id: string
  provedor: 'Claude' | 'Gemini' | 'Codex'
  modelo: string
  /** nome do modelo: Hydrogen, Sol, Haiku; "Sol 2" quando repete */
  nome: string
  esforco?: string
  acao: string
  tarefas?: { feitas: number; total: number }
  idsFeitos?: string[]
  imagens?: { prontas: number; total: number }
  estado: 'rodando' | 'concluido' | 'erro' | 'parado' | 'limite'
  tentaDeNovo?: string
  inicio: number
  fim?: number
  /** tokens que pesam no limite, para dividir a subida do semanal entre agentes juntos */
  tokens: number
  /** semanal do provedor (0..1) quando o agente começou; null até a primeira leitura */
  base: number | null
  /** quanto o semanal subiu por causa dele (0..1) */
  gasto: number
  fechada?: boolean
  liveMtime?: number
}
/** Última leitura do semanal de um grupo (Claude, Codex, Gemini:<balde>) e os tokens de cada agente naquela hora. */
export type ContaSemanal = { semanal: number; tokens: Record<string, number> }
/** Job do Gemini ou do Codex pedido nesta sessão cujo .live.json ainda não apareceu. */
export type Esperando = { provedor: 'Gemini' | 'Codex'; desde: number }

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
      barras: BarraAgente[]
      contas: Record<string, ContaSemanal>
      esperando: Esperando[]
    }
  }
}
