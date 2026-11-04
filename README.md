# claude-mods

Marketplace de mods para o Claude Code.

## medidor
Faixa acima do prompt com barra de contexto (cache lido, cache escrito, input, output), totais exatos, custo estimado (preços da API) e skills usadas. Botão Handoff que resume a conversa e abre uma sessão nova.

```
/plugin marketplace add mmacedok/claude-mods
/plugin install medidor@claude-mods
```

O botão Stats (ou `/stats`) abre o uso por modelo; os jobs do Gemini vêm de logs JSON em `~/.claude/medidor-gemini-logs`. Os handoffs são salvos em `~/.claude/medidor-handoffs`. Os preços ficam na tabela `PRECOS` em `plugins/medidor/hooks/register.tsx`.
