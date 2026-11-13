# Painel direito: botões e vasos

Brief de implementação: alinhar Mods / Stats / Clear / Handoff em uma grade 2×2, com quatro larguras iguais, pequenos intervalos iguais e Handoff primário, alinhada aos três vasos do mock-up. Escopo: painel direito de hooks/register.tsx.

## Referências e revisão

- TARGET-07: imagem 7.webp fornecida no pedido. Alvo aprovado pelo usuário: painel emoldurado, prateleira de três vasos e grade abaixo. Arte original preservada.
- BEFORE-08: imagem 8.png fornecida no pedido. Rejeitada como resultado: larguras e alinhamentos inconsistentes, intervalos apertados.
- PANEL-01: implementação em código; não foi gerada uma nova imagem. Revisão da árvore aprovada; revisão visual nativa pendente porque o ambiente bloqueou processos.

## Contrato e solução

Declarações consultadas: plugin-authoring/types/claude-code.d.ts do Claude Code 2.1.321, BoxProps (linha 928), ButtonProps (1093), SvgProps (13576), TextProps (13871) e Space (13220).

Button não expõe width, flexGrow, flexBasis ou style. Box expõe width, flexGrow, flexShrink e alignItems, mas não flexBasis. Cada botão fica em uma Box em coluna com alignItems=stretch. No desktop, width=0, minWidth=0 e flexGrow=1 dão às duas células a mesma base e dividem igualmente o espaço disponível, independentemente do texto. As linhas usam o mesmo columnGap e a grade usa rowGap, ambos xs.

A grade usa width="198px" no desktop (3 × VT_W, sendo VT_W=66). A largura é independente da disponibilidade das cotas e coincide com a fileira completa dos vasos. A moldura e seu padding ficam por fora dessa área. O terminal mantém largura automática e não recebe dimensões em pixels. Foram removidos largo() e os espaços invisíveis dos rótulos. Handoff mantém variant=primary inclusive em Writing handoff…; o estado longo não muda a base das células.

## Por que os vasos podem faltar

A fileira exige Svg e pelo menos uma cota five_hour ou seven_day. Sem ambas as cotas, só os botões aparecem, por condição explícita de dados. A bateria diária também exige um resetsAt semanal válido. Esse comportamento explica a captura sem vasos, mas não há um registro dos dados da sessão original para confirmar o estado exato daquela captura. Não foram inventados valores nem alteradas essas condições.

## Verificações

- CRLF preservado; trecho key="esquerda" comparado integralmente e idêntico ao original.
- band.test.tsx não foi alterado; chaves painel, tubos-limite, mods, stats, clear e handoff preservadas.
- Checagem TypeScript 6.0.2 em memória com as declarações da skill e opções do cabeçalho: antes e depois têm somente os mesmos erros antigos, TS2532 na linha 1331 e TS2345 na linha 1334.
- Smoke da função ui.render transpilada em memória com engine simulado: seis cenários (desktop/terminal × sem dados/com cotas/gerando handoff). Controles, largura declarada, variante primária e condição dos três vasos conferidos. Não verifica pintura nem layout do aplicativo.
- Os comandos tsc e claude plugin test foram tentados e bloqueados pelo ambiente (spawn EPERM; o terminal também retornou Acesso negado). A suíte oficial de 28 testes e a revisão nativa em tamanho real não puderam ser executadas.

Próxima verificação no desktop: conferir largura/altura visíveis e cliques dos quatro controles, incluindo o texto longo Writing handoff…, com e sem cotas. A tipagem e a árvore validam o contrato; não provam a pintura nativa.
