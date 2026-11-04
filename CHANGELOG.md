# Histórico do medidor

## 0.4.2 (2026-11-04)

- Input, cache escrito e output agora aparecem como blobs no tubo, com tamanho conforme a quantidade de tokens.
- Os blobs mudam de forma devagar, em loop sem emenda, e nunca se encostam.
- Quando o pedaço do tipo chega a 20 px de gel, o blob se mistura e some.
- A ponta direita do tubo é reservada para os blobs, e uma marca pontilhada mostra onde fica 100% do contexto.
- O tubo passou de 24 para 32 px de altura.

## 0.4.1 (2026-11-04)

- Tubos de limite maiores, do verde ao vermelho conforme o uso.

## 0.4.0 (2026-11-04)

- Velocidade da resposta em tok/s.
- Dois tubos verticais para os limites de 5 horas e semanal, com gota caindo e gel acumulando.
- Botão e comando `/stats`, com uso por modelo.
- As barras do Gemini só aparecem depois de usadas.
- O tubo agora chega até a porcentagem no fim da linha.

## 0.3.0 (2026-11-04)

- Tubo de gel no lugar da barra simples.
- Números compactos, como `259k` e `8.10M`.
- Cota do Gemini na faixa.

## 0.2.0 (2026-10-18)

- Sapateado, gelatina e espirro no ciclo do mascote parado.

## Primeira versão (2026-10-07)

- Primeira versão no marketplace: barra de contexto por tipo de token, totais, custo estimado, skills usadas e Handoff.
