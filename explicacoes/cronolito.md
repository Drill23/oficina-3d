# OF-004 · Cronolito — o relicário que para o tempo e petrifica

**Abrir o objeto:** [drill23.github.io/oficina-3d/#of-004](https://drill23.github.io/oficina-3d/#of-004) · arquivo: [`objetos/cronolito.html`](../objetos/cronolito.html)

## O que é

Uma relíquia de mão, com 18 cm de diâmetro, que para o tempo e transforma em pedra tudo o que fica dentro do seu campo. É uma criação original da Oficina 3D, feita a partir do pedido de um objeto com o poder de parar o tempo e petrificar as coisas.

Ao redor dela ficam quatro "testemunhas", cada uma com o seu próprio relógio: uma **flor no vaso** que balança, uma **borboleta** voando, uma **ampulheta** escorrendo areia e uma **torneira pingando** numa bacia. Quando a onda passa por elas, a gota fica parada no ar, o fio de areia congela, a asa para no meio da batida — e tudo vira pedra.

## As peças

| Peça | O que faz |
|---|---|
| **Núcleo de cristal** | Um cristal de seis faces dentro de uma esfera de vidro. Acumula a carga: brilha cada vez mais forte enquanto os anéis aceleram. |
| **Anéis do cardã** | Três anéis um dentro do outro, cada um girando num eixo diferente (como um giroscópio). Na hora da trava, os três se alinham no mesmo plano — a famosa *trava de cardã* — e é aí que o tempo para. As marcas douradas acendem nesse momento. |
| **Escapamento** | O relógio interno na base: uma roda de escape de 15 dentes, uma roda de 40 e uma de 24, com a âncora balançando. Marca 2 tiques por segundo e para de vez quando o tempo trava. |
| **Gaiola geodésica** | 120 hastes de bronze e nós dourados, abertas em cima e embaixo para os eixos, com a alça de relógio de bolso no topo. |
| **Base (coroa)** | Madeira escura com 12 marcas de hora na borda; segura o escapamento e a gaiola. |

## Como funciona (o ciclo de 16 segundos)

Tudo é movido por **um único número**: a ativação, de 0 a 16 s. Dela saem a velocidade dos anéis, o brilho do cristal, o raio da onda, os relógios de cada coisa ao redor, os números dos painéis e o gráfico — por isso nada na tela discorda do movimento.

1. **Repouso (0–1 s)** — o escapamento marca o tempo normal.
2. **Carga (1–5 s)** — os anéis aceleram até 8 vezes e o cristal acumula energia.
3. **Trava (5–7 s)** — os três anéis se alinham num plano só. O tempo dentro da relíquia cai para 0,1%.
4. **Onda (7–11 s)** — a onda de estase se espalha até 68 cm e vira em pedra tudo o que toca: o chão, o pedestal, a flor, a borboleta, a ampulheta, as gotas.
5. **Estase (11–14 s)** — dentro do campo nada se move.
6. **Retorno (14–16 s)** — a onda recua e a pedra volta a ser o que era.

## Como usar a página

- **Tour automático:** se ninguém mexer, a página se apresenta sozinha com um cursor. Qualquer clique entrega o controle; depois de 25 s parado, o tour volta.
- **Vista:** Geral, Relíquia, Núcleo e De cima.
- **Peças:** isola o Núcleo, os Anéis, o Escape ou a Gaiola para ver só aquela parte trabalhando.
- **Explodir peças:** separa a gaiola, a base, o escapamento, os anéis e o núcleo.
- **Ativação:** arraste para ir a qualquer instante do ciclo. **Velocidade do vídeo** deixa tudo em câmera lenta.
- Arraste para girar, use a roda do mouse ou a pinça para aproximar. No celular, vire a tela de lado.

## A conta de verdade

A física conhece uma única forma de fazer o tempo andar mais devagar num lugar: a gravidade (relatividade de Einstein). Perto de uma massa *M*, o relógio anda na velocidade

> dτ/dt = √(1 − rₛ/r), com rₛ = 2GM/c²

Para o tempo andar a 0,1% a 9 cm do centro, a relíquia precisaria ter cerca de **6 × 10²⁵ kg — umas 10 Terras** espremidas numa bola de 9 cm. Isso já é um buraco negro. A peça na mão tem 1,4 kg. O painel "A conta de verdade" mostra essa massa mudando a cada instante do ciclo.

E a petrificação de verdade (fossilização, quando minerais substituem o material vivo) leva uns 10 mil anos.

## Veredito: inviável

Com a física que conhecemos, frear o tempo pede massa de planeta concentrada num ponto, e virar pedra leva milênios. O Cronolito é ficção — mas toda a lógica dele (anéis, trava, onda, relógios locais) foi montada com regras consistentes para dar para ver e entender cada parte.

## Ficha técnica

| | |
|---|---|
| Diâmetro da gaiola | 18 cm |
| Massa da peça | 1,4 kg |
| Anéis | 3 (Ø 15,6 · 12,8 · 10 cm) |
| Escapamento | rodas de 15, 40 e 24 dentes, módulo 1,2 mm |
| Alcance da onda | 68 cm |
| Tempo dentro do campo | 0,1% do normal |
| Entrada única | Ativação (ciclo de 16 s) |

O código-fonte do objeto está em [`fontes/cronolito/`](../fontes/cronolito/).
