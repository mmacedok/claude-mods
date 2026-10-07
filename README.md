# claude-mods

Marketplace de mods para o Claude Code.

## medidor
Faixa acima do prompt com barra de contexto (cache lido, cache escrito, input, output), totais exatos, custo estimado (preços da API) e skills usadas. Botão Handoff que resume a conversa e abre uma sessão nova.

```
/plugin marketplace add mmacedok/claude-mods
/plugin install medidor@claude-mods
```

Os handoffs são salvos em `~/.claude/medidor-handoffs`. Os preços ficam na tabela `PRECOS` em `plugins/medidor/hooks/register.tsx`.
