# Código-fonte do Cronolito (OF-004)

O objeto é gerado inteiro por código com o motor Teardown e three.js. Cada arquivo tem um papel:

| Arquivo | Papel |
|---|---|
| `cronolito-shared/tempo.js` | A matemática: o ciclo de 16 s, a velocidade do tempo, a trava dos anéis, o raio da onda, os relógios de cada coisa ao redor e a conta da relatividade. Sem three.js. |
| `cronolito-shared/reliquia.js` | A geometria: gaiola, anéis, núcleo, escapamento, pedestal, flor, borboleta, ampulheta, gotas, a onda e o material que vira pedra. |
| `cronolito-shared/stage.js` | O estúdio: luz, sombra, câmera. |
| `cronolito-shared/console.js` | Os painéis e botões (tudo em português). |
| `cronolito-shared/film.js` | O roteiro do tour automático e as vistas da câmera. |
| `cronolito-shared/live.js` | A página que você comanda: botões, controles deslizantes, órbita, zoom, tour. |
| `cronolito-live/main.js` | O ponto de entrada. |

Para empacotar de novo num HTML único: copie as duas pastas para `teardown/sims/` e rode
`node ferramentas/build.mjs teardown/sims/cronolito-live objetos/cronolito.html --title "Cronolito · Oficina 3D"`.

Para capturar um instante do tour: abra a página com `?t=9.8` no fim (congela o tour nesse segundo).
