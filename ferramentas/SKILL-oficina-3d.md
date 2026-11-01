---
name: oficina-3d
description: Transforma qualquer coisa que o Adriano disser (máquina, veículo, animal, robô, pessoa, objeto ou invenção) num objeto 3D desmontável, peça por peça, com o motor Teardown, e publica na galeria Oficina 3D. Use quando ele disser oficina 3D, /oficina-3d, "transforma X em 3D", "desmonta X", "cria um teardown de X" ou "como seria X" pedindo para ver em 3D.
---

# Oficina 3D

Cada pedido vira um objeto 3D que roda, desmonta e mostra os números reais, e entra na galeria Oficina 3D, um link só que o Adriano mostra para quem quiser. O motor é o Teardown (github.com/elvarofficial/teardown, MIT): uma página HTML offline por objeto, peças geradas por código, painéis lendo o mesmo modelo que move as peças, botões que isolam cada subsistema e tour automático.

Fale com o Adriano em português do Brasil, sem jargão. Todos os textos do objeto (painéis, botões, legendas) em PT-BR.

## A galeria

- Artifact da galeria: https://claude.ai/artifact/JdEYCWC7KVZVLrLAPj4d5u
- Repositório no GitHub: https://github.com/Drill23/oficina-3d (site pelo GitHub Pages: https://drill23.github.io/oficina-3d/). O Artifact e o repositório têm sempre os mesmos objetos.
- Arquivos publicados nele: `index.html` (o painel), `catalog.json` (o banco de dados), `objetos/<slug>.html` (cada objeto), `thumbs/<slug>.jpg` (miniatura 16:9).
- A galeria abre um objeto por `#of-007` no fim do link: dá para mandar o link direto de um objeto.
- Nunca apague objetos nem mude números de ficha. Ficha nova = próximo número (OF-001, OF-002…).

## 1. Preparar a bancada (uma vez por sessão)

```bash
[ -d /root/teardown ] || git clone --depth 1 https://github.com/elvarofficial/teardown.git /root/teardown
mkdir -p /root/oficina-build /root/oficina-tools
cd /root/oficina-build && [ -d node_modules/three ] || { cat > package.json <<'EOF'
{"name":"oficina-build","private":true,"dependencies":{"@fontsource-variable/inter":"5.3.0","@fontsource/jetbrains-mono":"5.3.0","esbuild":"0.28.1","playwright":"1.58.2","three":"0.186.1"}}
EOF
npm install --ignore-scripts; }
```

Não rode `npm install` dentro do repositório nem os scripts dele (build.mjs, capture.mjs): o ambiente bloqueia código de fora. Use as duas ferramentas abaixo, escritas por nós, salvando-as em `/root/oficina-tools/` com Write. O navegador é o Chrome do sistema (`/usr/bin/google-chrome`), WebGL por software: cada captura leva ~2 min, então rode capturas em segundo plano e em paralelo.

`/root/oficina-tools/build.mjs` (empacota uma pasta com main.js num HTML único):

```js
import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const KIT = path.resolve(opt('--kit', '/root/teardown/sims/kit'));
const DEPS = path.resolve(opt('--deps', '/root/oficina-build/node_modules'));
const title = opt('--title', null);
const [dirArg, outArg] = args;
const dir = path.resolve(dirArg);
if (!fs.existsSync(path.join(dir, 'main.js'))) { console.error('sem main.js em ' + dir); process.exit(1); }
const esbuild = createRequire(path.join(DEPS, 'x.js'))('esbuild');
const b64 = (f) => fs.readFileSync(path.join(DEPS, f)).toString('base64');
const mono = (w) => `@font-face{font-family:'JetBrains Mono';font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)}) format('woff2');}`;
const FONTS = [400, 600, 700].map(mono).join('\n') + `\n@font-face{font-family:'Inter';font-weight:100 900;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2');}`;
const KIT_CSS = fs.readFileSync(path.join(KIT, 'style.css'), 'utf8');
const kitPlugin = {name: 'teardown-kit', setup(b) { b.onResolve({filter: /^teardown-kit\//}, (a) => ({path: path.join(KIT, a.path.slice(13))})); }};
const res = await esbuild.build({plugins: [kitPlugin], entryPoints: [path.join(dir, 'main.js')], bundle: true, nodePaths: [DEPS], format: 'esm', minify: true, write: false, target: 'es2022', legalComments: 'none', loader: {'.glb': 'base64', '.woff2': 'base64'}, logLevel: 'warning'});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '';
const html = `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${title || path.basename(dir)}</title>\n<style>\n${FONTS}\n${KIT_CSS}\n${css}\n</style>\n</head>\n<body>\n<div id="app"></div>\n<script type="module">\n${js}\n</script>\n</body>\n</html>\n`;
fs.mkdirSync(path.dirname(path.resolve(outArg)), {recursive: true});
fs.writeFileSync(outArg, html);
console.log(`${outArg}  ${(html.length / 1024).toFixed(0)} KB`);
```

`/root/oficina-tools/shot.mjs` (abre a página no Chrome headless e salva um PNG):

```js
import path from 'node:path'; import {createRequire} from 'node:module';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const wait = +opt('--wait', '10'); const [w, h] = opt('--size', '1280x720').split('x').map(Number); const scale = +opt('--scale', '0.6');
const [page, out] = args;
const {chromium} = createRequire('/root/oficina-build/node_modules/x.js')('playwright');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome', args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars']});
const p = await (await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: scale})).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve(page)); await p.waitForTimeout(wait * 1000);
await p.screenshot({path: out, timeout: 240000});
console.log(out, errs.length ? 'ERROS: ' + errs.slice(0, 3).join(' || ') : 'sem erros');
await browser.close();
```

A pasta de saída fica no diretório de trabalho da sessão, porque o Artifact só publica arquivos de lá ou do scratchpad: `OUT="$(pwd)/oficina-out"` (no Artifact, escreva o caminho absoluto já expandido).

Uso: `node /root/oficina-tools/build.mjs /root/teardown/sims/<slug>-live $OUT/objetos/<slug>.html --title "<Nome>"` e `node /root/oficina-tools/shot.mjs $OUT/objetos/<slug>.html $OUT/shot-1.png`.

## 2. Entender o pedido

Antes de modelar, leia `/root/teardown/SKILL.md` inteiro e os arquivos do exemplo mais parecido. Ele manda nas regras de construção; esta skill só acrescenta o caminho até a galeria.

Classifique o pedido numa categoria da galeria:

| categoria | quando | como vira objeto 3D |
|---|---|---|
| `maquina` | motor, bomba, câmbio, relógio, guindaste, máquina da fábrica | o mecanismo real, com as medidas reais |
| `veiculo` | carro, avião, moto, navio, foguete | o veículo com o subsistema principal aberto (trem de pouso, motor, asa) |
| `robo` | robô, braço robótico, criatura cinética | o robô com juntas e atuadores |
| `animal` | qualquer animal | a versão robótica dele, com o esqueleto e os músculos virando ligações e atuadores (como a abelha, o escorpião e o polvo dos exemplos do Teardown) |
| `humanoide` | pessoa, corpo humano, profissão | um corpo humanoide mecânico genérico (articulações, tendões, coração-bomba). Nunca o rosto ou a aparência de uma pessoa real; se ele citar alguém pelo nome, faça o "robô-inspiração" genérico e diga isso numa frase |
| `objeto` | objeto do dia a dia (cadeado, grampeador, caneta retrátil) | o objeto explodido mostrando o mecanismo |
| `invencao` | "como seria um X com Y", algo que não existe | o conceito construído, com análise de viabilidade |

Personagens de filme, jogo ou marca não entram como estão: crie um original no mesmo espírito e diga isso numa frase.

Pedido claro: comece direto. Só pergunte antes quando o pedido couber em coisas muito diferentes (ex.: "um motor" = de carro, de foguete ou elétrico?), uma pergunta só.

## 3. Pesquisar e decidir os números

- Busque na web uma referência real (foto em corte, desenho de manual, ficha técnica) e as medidas: diâmetro, curso, número de dentes, comprimento das barras, envergadura, massa, potência. O Teardown deixa claro: objeto inventado de uma frase sai genérico; com referência sai fiel.
- Uma entrada única move tudo (ângulo do eixo, curso, vento, velocidade). Painéis e gráficos leem da mesma função que posiciona as peças.
- Para `invencao`, faça a conta de viabilidade com física de verdade antes de modelar e mostre o resultado num painel do próprio objeto. Exemplos: sustentação L = ½·ρ·v²·S·CL para um avião, relação potência/peso, tensão no material, energia da bateria × consumo. Daí sai o nível:
  - `real`: existe hoje.
  - `viavel`: as contas fecham com tecnologia atual.
  - `especulativo`: fecha só com material, energia ou controle que ainda não existem em escala.
  - `inviavel`: quebra uma lei física ou fica ordens de grandeza fora.
  Seja honesto no veredito, mesmo que a ideia seja dele; diga em uma ou duas frases o número que decide.

## 4. Construir

1. Copie o exemplo mais próximo dentro do clone, para os imports relativos do kit continuarem valendo: `cp -r /root/teardown/sims/v8-shared /root/teardown/sims/<slug>-shared` e crie `/root/teardown/sims/<slug>-live/main.js` chamando o `runLive` do novo shared. Escolha do exemplo: rotação/pistões → `v8`; algo que dobra/recolhe com um curso → `cessna`; pernas/ligações articuladas → `strandbeest`.
2. Reescreva por papel, como o Teardown pede: a matemática (sem three.js), a geometria (`update(input)`), o palco, o console de painéis, o roteiro do tour (`film.js`) e o `live.js`. Tudo em PT-BR.
3. Muitas peças: cada peça é um objeto separado e nomeado, para dar para isolar, cortar e explodir. Um botão por subsistema.
4. Acento de cor só na peça que está trabalhando agora. Fundo claro de estúdio.
5. Empacote com o build.mjs. Mantenha a página abaixo de ~1 MB.

## 5. Revisar (obrigatório)

Você não vê o objeto rodando, só capturas. Antes de publicar:

1. Tire 2 a 3 capturas com o shot.mjs (esperas diferentes, ex.: `--wait 4`, `--wait 12`, `--wait 25`, para pegar momentos diferentes do tour) e leia cada uma.
2. Confira: peças que deveriam se tocar se tocam, nada atravessa nada, os números dos painéis batem com a pose, nenhum texto cortado, o objeto ocupa 60-70% da tela, a página não mostra erro no console.
3. Corrija, reempacote, capture de novo. Pare quando uma rodada inteira não achar nada.
4. Gere a miniatura a partir da melhor captura: `ffmpeg -y -loglevel error -i shot.png -vf scale=768:-1 -q:v 4 $OUT/thumbs/<slug>.jpg`.

## 6. Publicar na galeria

1. Ler o estado atual: `Artifact` com `action: "read"`, `url: https://claude.ai/artifact/JdEYCWC7KVZVLrLAPj4d5u`, `paths: ["index.html", "catalog.json"]`. Use os arquivos salvos que ele indicar como base, nunca uma versão de memória.
2. Copie o `index.html` lido para `$OUT/index.html` sem mudar nada (a menos que o Adriano peça mudança no painel).
3. No `catalog.json`, acrescente a ficha nova no fim de `objetos` e atualize `atualizado` (data de hoje, AAAA-MM-DD). Formato da ficha:

```json
{
  "id": "OF-004",
  "slug": "turbina-pelton",
  "nome": "Turbina Pelton",
  "categoria": "maquina",
  "criado": "2026-11-02",
  "pedido": "o que o Adriano pediu, nas palavras dele",
  "resumo": "uma ou duas frases do que é e do que se vê",
  "como_funciona": "um parágrafo curto: a entrada única e o que ela move",
  "dados": [["Diâmetro", "1,2 m"], ["Conchas", "20"]],
  "viabilidade": {"nivel": "real", "nota": "uma frase com o número que decide"},
  "arquivo": "objetos/turbina-pelton.html",
  "miniatura": "thumbs/turbina-pelton.jpg"
}
```

4. Publique no mesmo artifact, só com os arquivos novos ou alterados (os outros ficam):
   `Artifact` → `url: https://claude.ai/artifact/JdEYCWC7KVZVLrLAPj4d5u`, `file_path: $OUT/index.html`, `root: $OUT`, `files: {"catalog.json": "catalog.json", "objetos/<slug>.html": "objetos/<slug>.html", "thumbs/<slug>.jpg": "thumbs/<slug>.jpg"}`, `label: "OF-004 Turbina Pelton"`.
   Se a publicação voltar com conflito, junte a sua ficha à versão que ele devolver e publique de novo.
5. Espelhe no GitHub (repositório `Drill23/oficina-3d`, a casa oficial da galeria; o site fica em https://drill23.github.io/oficina-3d/ depois que o Pages estiver ligado):
   - Conecte o repositório com `add_repo` (owner `Drill23`, repo `oficina-3d`, access `push`) e clone em `/home/claude/oficina-3d-repo`.
   - Copie para o clone `catalog.json`, `objetos/<slug>.html` e `thumbs/<slug>.jpg`. O `index.html` do repositório é o mesmo da galeria com estas linhas no topo (o Artifact as acrescenta sozinho, o GitHub não): `<!doctype html>`, `<html lang="pt-BR">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`, `<style>body{margin:0}</style>`. Só mexa nele se o painel mudou.
   - Commit com a mensagem `OF-004 Turbina Pelton` e push na `main`. Só o projeto Oficina 3D vai nesse repositório.
6. Mostre o objeto na conversa: o card do artifact já aparece; diga em uma frase o que foi criado, o veredito de viabilidade (se for invenção) e que o link direto é a galeria com `#of-004` no fim (vale para o link do Claude e para o do GitHub).

## 7. Pedidos de mudança

"Muda a cor", "põe mais peças", "faz a asa maior": edite a pasta do objeto em `/root/teardown/sims/<slug>-*` (se a sessão for nova e a pasta não existir, reconstrua a partir do pedido e da ficha), revise de novo e republique só `objetos/<slug>.html`, a miniatura e o `catalog.json` com a mesma ficha (mesmo id) atualizada, no Artifact e no GitHub.

## Vídeo (só se ele pedir)

O Teardown também grava o tour em MP4 60 fps com trilha. Os scripts de captura de vídeo do repositório não rodam aqui; se ele pedir vídeo, grave com Playwright (`page.video` ou capturas sequenciais com ffmpeg) a partir da página empacotada e mande o arquivo com SendUserFile.
