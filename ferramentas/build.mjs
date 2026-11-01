#!/usr/bin/env node
// Oficina 3D — empacota uma máquina (pasta com main.js) num único HTML offline.
// Mesma receita do sims/build.mjs do teardown (three.js, fontes e CSS embutidos), sem rodar código do repositório.
//
//   node build.mjs <pasta-da-maquina> <saida.html> [--kit /caminho/teardown/sims/kit] [--deps /caminho/node_modules]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const KIT = path.resolve(opt('--kit', '/root/teardown/sims/kit'));
const DEPS = path.resolve(opt('--deps', '/root/oficina-build/node_modules'));
const [dirArg, outArg] = args;
if (!dirArg || !outArg) { console.error('uso: build.mjs <pasta> <saida.html>'); process.exit(1); }
const dir = path.resolve(dirArg);
if (!fs.existsSync(path.join(dir, 'main.js'))) { console.error(`sem main.js em ${dir}`); process.exit(1); }

const esbuild = createRequire(path.join(DEPS, 'x.js'))('esbuild');
const b64 = (f) => fs.readFileSync(path.join(DEPS, f)).toString('base64');
const mono = (w) => `@font-face{font-family:'JetBrains Mono';font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)}) format('woff2');}`;
const FONTS = [400, 600, 700].map(mono).join('\n') +
  `\n@font-face{font-family:'Inter';font-weight:100 900;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2');}`;
const KIT_CSS = fs.readFileSync(path.join(KIT, 'style.css'), 'utf8');

const kitPlugin = {
  name: 'teardown-kit',
  setup(b) {
    b.onResolve({filter: /^teardown-kit\//}, (a) => ({path: path.join(KIT, a.path.slice('teardown-kit/'.length))}));
  },
};

const t0 = Date.now();
const res = await esbuild.build({
  plugins: [kitPlugin],
  entryPoints: [path.join(dir, 'main.js')],
  bundle: true, nodePaths: [DEPS], format: 'esm', minify: true, write: false,
  target: 'es2022', legalComments: 'none', loader: {'.glb': 'base64', '.woff2': 'base64'}, logLevel: 'warning',
});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '';
const title = opt('--title', path.basename(dir));
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<style>
${FONTS}
${KIT_CSS}
${css}
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(path.resolve(outArg)), {recursive: true});
fs.writeFileSync(outArg, html);
console.log(`${outArg}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
