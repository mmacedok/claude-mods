# Barras de agentes no funmeter — plano e pesquisa (fase 0)

Referência visual (rascunho do Henrique): `docs/agentes-referencia.webp`. É só a ideia de layout;
o look final é trabalho do Fable. Nomes como "Astra/Vega/Orion" do rascunho **não** valem (regra nova abaixo).

## O que cada barra mostra

Uma barra por agente que está rodando ou rodou nesta rodada (subagente do Claude, job do Gemini, job do Codex).

```
● Hydrogen  xhigh  •  escrevendo hud.png  •  3/7   [tubo]  +4.2%
● Sol       high   •  rodando npm test             [tubo]  +1.8%
✓ Terra     high   •  concluído                    [tubo]  +2.5%
```

| Campo | Regra |
|---|---|
| **Nome** | nome curto do **modelo**, capitalizado: `gemini-4-hydrogen-xhigh` → Hydrogen, `gpt-6.1-sol` → Sol, `gpt-6.1-terra` → Terra, `claude-haiku-5-5` → Haiku, `claude-fable-5-2` → Fable. Dois iguais: "Sol", "Sol 2". Acaba o sorteio de `NOMES_SCIFI`. |
| **Esforço** | `low` `medium` `high` `xhigh` `max` (ou vazio se o modelo não tem). Mostrar de forma compacta (sigla, pips, ícone — escolha do Fable). |
| **Ação atual** | o que o agente está fazendo agora, curto: "lendo register.tsx", "rodando npm test", "escrevendo hud.png", "pensando". Corta com reticências. |
| **Tarefas** | "3/7" só quando existir lista de tarefas; senão some. |
| **Tubo** | **limite semanal do provedor**: já nasce cheio até o % semanal de quando o agente começou (parte apagada) e o que ele gasta enche por cima, numa cor viva (ver abaixo). |
| **Número** | `+3%` = quanto o semanal subiu por causa desse agente. `~` na frente quando é estimativa. |
| **Fechar** | um ✕ discreto por barra (só aparece forte no hover/foco); fecha só aquela barra. |
| **Cor** | por provedor: Claude laranja (`LARANJA #D77757`), Gemini azul (`AZUL`), Codex verde-água (`VERDE_AGUA`) — as mesmas de hoje. |

Estados: `rodando` (líquido animado), `concluído` (✓, tubo congela), `erro` (vermelho), `parado` (STOPPED/TIMEOUT, cinza),
`LIMIT` (Codex sem cota: mostrar "volta às 18:40" com `tenta_de_novo`).

## Regra do tubo (limite semanal)

Exemplo do Henrique: o semanal do Gemini está em 27 %. Entra o Hydrogen: o tubo dele já nasce com 27 % (base).
Ele termina com o semanal em 30 %: o tubo mostra 27 % de base + 3 % dele, e o número `+3%`. O próximo agente
do Gemini já nasce com 30 % de base, e assim por diante.

- Cada provedor tem o seu semanal: Claude conta no do Claude, Codex no do ChatGPT (`secondary`, janela 10080 min), Gemini no do Google (`wk`).
- **Base** de cada barra = `% semanal` do provedor no momento em que aquele agente começou. Tubo cheio = 100 % do semanal.
- **Agentes juntos** do mesmo provedor: enquanto rodam ao mesmo tempo, a subida do semanal no período é repartida entre eles
  pelos **tokens** que cada um usou. Cada um mostra a sua parte na sua barra; somadas, dão a subida total.
- Agente que termina congela o valor (base + parte dele). O ✕ discreto fecha a barra; fechar não muda a conta dos outros.
- Se o semanal virar (reset) no meio, a barra recomeça a medida a partir do novo valor.
- Cuidado: o semanal sobe em passos (o Gemini dá fração, o Codex dá % inteiro, o Claude dá % inteiro). Um agente curto pode
  mostrar `+0%`; mostrar `<1%` nesse caso, ou `~` com a estimativa por tokens.

## Contrato de dados para o visual

O desenho recebe uma lista pronta; o Fable pode trabalhar só com dados falsos.

```ts
type BarraAgente = {
  id: string                 // agentId do Claude ou id do job (g63e50f, ca4b922)
  provedor: 'Claude' | 'Gemini' | 'Codex'
  nome: string               // "Hydrogen", "Sol 2"
  esforco?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  acao: string               // "rodando npm test"
  tarefas?: { feitas: number; total: number }
  imagens?: { prontas: number; total: number }   // Codex com manifesto
  estado: 'rodando' | 'concluido' | 'erro' | 'parado' | 'limite'
  tentaDeNovo?: string       // LIMIT do Codex
  base: number               // 0..1, % semanal do provedor quando o agente começou (parte apagada do tubo)
  gasto: number              // 0..1, quanto o semanal subiu por causa dele (parte viva, por cima da base)
  estimado: boolean          // true = mostra "~"
  // o ✕ chama fecharBarra(id)
}
```

## O que a pesquisa (fase 0) achou

| Pergunta | Resposta |
|---|---|
| O funmeter lê `D:\AI Workshop`? | Sim. `$.fs` aceita caminho absoluto. **Limite de 4 MiB por leitura.** |
| Tokens de cada subagente do Claude? | Sim, de graça: `turn.step` (resultado tem `usage`) e `tool.call` trazem `agentId`; `agent.spawn` dá `model`, `description`, `agentId`; `turn.complete` marca o fim. |
| Esforço do subagente do Claude? | `turn.step` traz `e.effort`. |
| Limite semanal (e 5 h) do Claude | já lido (`session.measure` → `rateLimits`, frascos). |
| Gemini: eventos ao vivo | `agy -p ... --output-format stream-json`: uma linha por passo (`step_update` com `step_type` `tool`/`agent_response`, `tool_name`, `tool_info.parameters`, `state` ACTIVE/DONE, `usage` com tokens) e `result` no fim. Testado. |
| Gemini: limite semanal | já lido pelo funmeter: `agy -p /usage --output-format json` → `funmeter-cotas.json` (`Gemini 5h`, `wk`). |
| Gemini: esforço | `agy --effort low…max`; o servidor MCP ainda não passa (hoje vem no sufixo do modelo, ex. `-xhigh`). |
| Codex: eventos ao vivo | `codex exec --json` (já usado): `item.started/completed` (`command_execution`, `file_change`, `mcp_tool_call`, `agent_message`). **Tokens só no `turn.completed`, no fim.** |
| Codex: limite semanal e tokens no meio | no rollout `~/.codex/sessions/AAAA/MM/DD/rollout-*-<thread_id>.jsonl`: eventos `token_count` com `rate_limits.secondary.used_percent` (semanal, janela 10080 min; `primary` = 5 h) e `total_token_usage`. `thread_id` vem no `thread.started` do `--json`. |
| Codex: esforço | parâmetro `effort` do `codex_start` (padrão high); `codex_tarefa` não passa → padrão do `config.toml`. |

**Problema achado:** o rollout de hoje tem 9 MB; `$.fs.read` recusa acima de 4 MiB, então `atualizarCodex` (register.tsx ~1291)
falha calada em sessões longas e os frascos do Codex ficam velhos. O status ao vivo resolve isso para os jobs; o leitor atual
precisa ler só o fim do arquivo (via `$.process.run` ou o arquivo de status).

## Fases

1. **Servidores MCP — FEITO (2026-11-13), testado com um job de cada.** Gravam `<LOGDIR>/<id>.live.json`
   (Gemini: `D:\AI Workshop\Bridge\respostas\mcp`; Codex: `D:\AI Workshop\Codex\Bridge\respostas\mcp`) ao nascer o job,
   a cada evento (no máximo a cada 500 ms) e no fim; escrita atômica (`.tmp` + rename), ~300 bytes. Formato real:
   ```json
   { "id": "c88fbee", "provedor": "Codex", "modelo": "gpt-6.1-terra", "esforco": "low",
     "estado": "rodando|concluido|erro|parado|limite", "inicio": 1794596000000, "fim": 1794596013000,
     "passos": 3, "tokens": 68787, "acao": "rodando Get-ChildItem -Force",
     "imagens": { "prontas": 2, "total": 5 },
     "limites": { "h5": 0.41, "h5Reset": 1794609367, "semanal": 0.48, "semanalReset": 1794994988 },
     "tentaDeNovo": "6:40 PM", "em": 1794596013000 }
   ```
   `imagens` só no Codex com manifesto; `limites` só no Codex (do rollout, ao vivo); `tentaDeNovo` só no LIMIT.
   O Gemini não tem `limites`: o semanal dele vem do `funmeter-cotas.json`. A ação fica na tela até a próxima começar.
   - Gemini: `stream-json`; novo parâmetro `effort` (troca o sufixo do slug, porque o agy recusa `--effort` junto de um slug com esforço);
     `gemini_start` devolve `effort` e `live`.
   - Codex: segue o rollout do `thread_id` lendo só o pedaço novo; esforço/modelo do `turn_context` ou do `config.toml`;
     tira o invólucro do shell (`pwsh.exe -Command '...'`) do texto da ação.
   - Cópias de antes: `server.mjs.bak-0713` nas duas pastas. Os servidores em uso só pegam o código novo ao reiniciar o Claude Code.
2. **Funmeter — coleta — FEITO (0.7.0).** Estado `barras: BarraAgente[]` (contrato em `types/index.d.ts`).
   - `tool.call` de `gemini_start/gemini_run/codex_start/codex_tarefa` põe um pedido em `esperando`; a volta de 2 s
     (`voltaDasBarras`) lista a pasta do `.live.json`, pega o arquivo que nasceu depois do pedido e cria a barra;
     depois só relê os que mudaram de `mtime`. Pedido sem arquivo em 2 min é esquecido.
   - `agent.spawn`: barra do subagente do Claude e o pedido de TaskCreate/TaskUpdate no prompt (não em resume, fork ou workflow).
     `tool.call` com `agentId` vira a ação e o "3/7"; `turn.step`/`turn.complete` com `agentId` dão tokens e esforço; o fim marca ✓/✗.
3. **Funmeter — limite — FEITO (0.7.0).** `contarSemanal`: base = semanal do grupo na primeira leitura depois do começo;
   a subida entre leituras é dividida pelos tokens novos de cada agente (Claude inclui o loop principal, cuja parte fica de fora);
   sem tokens novos, vai para quem terminou há menos de 3 min. Roda a cada `session.measure`, a cada volta e no fim de um job.
   Fontes do semanal: Claude `session.measure` → `rateLimits` (`seven_day`); Gemini `cotas` (`wk`, balde Argon se o modelo for Argon);
   Codex `limites.semanal` do `.live.json` (senão `cotasCodex`).
   Visual provisório no `rodape` (chave `agente-<id>`, ✕ `fechar-<id>`); o Fable troca.
4. **Visual — FEITO (0.8.0).** `tuboAgente` em `register.tsx`; uma linha por agente na coluna do meio; frascos, bateria e botões no `painel`. Prévia: `docs/agentes-previa.png`. Barra de agente que acabou some depois de 10 min (`SOME_DEPOIS_MS`); no máximo 4 linhas (`AGENTES_VISIVEIS`).
5. Testes, versão 0.7.0, commit, push, `claude plugin update funmeter@claude-mods`.

## Para o Fable (fase 4: o look)

Faça o desenho das barras a partir de `BarraAgente[]` com dados falsos. A coleta (fases 1–3) não é sua.

- Onde: `hooks/register.tsx`, no `rodape` da banda `AbovePrompt` (hoje: caixinhas `agente-Gemini/Codex`, ~linha 1924),
  ou numa linha própria acima do rodapé se precisar de largura. Substitui as caixinhas atuais.
- Estilo: o mesmo vidro/líquido dos frascos e do `tubo` (bolhas, brilho, gota). Até 3–4 barras visíveis; mais que isso, resumir ("+2").
- Tubo em duas partes: a **base** (semanal de quando o agente começou) apagada/fosca, e o **gasto** dele por cima, vivo e animado
  enquanto roda. A divisa entre as duas tem que ser legível mesmo quando o gasto é 1 %.
- ✕ discreto na ponta de cada barra (`Button`), apagado até hover/foco.
- Entregue também uma prévia em imagem (como as de `.previas`) com os estados: rodando, concluído, erro, parado, limite, estimado.

Regras do projeto (não quebrar):
- `register.tsx` usa **CRLF**.
- `comFase` põe `begin` em cada `<animate>` dos frascos, bateria e tubo: **não escreva `begin`** nesses.
- Cenas da mesma `pista` não podem se sobrepor no tempo (dá erro).
- Cada SVG abaixo de **131072 caracteres**.
- Testes: `claude plugin test plugins/funmeter` na raiz do repo (hoje 27/27). Testes da bateria exigem `>Energy N%<` e `#FFD86B` só quando dourada.
- Nunca gravar em C:; em E: só na pasta de rascunho da sessão.
- Publicar: subir a versão em `CHANGELOG.md`, `.claude-plugin/marketplace.json` e `plugins/funmeter/.claude-plugin/plugin.json`;
  commit em `main` como `funmeter X.Y.Z: ...`; git sem identidade → `-c user.name="mmacedok" -c user.email=<do último commit>`.
