#!/usr/bin/env node
// Abre uma página de objeto no Chrome headless, espera N segundos e salva um PNG (miniatura / revisão).
//   node shot.mjs <pagina.html> <saida.png> [--wait 6] [--size 1600x900] [--scale 0.5]
import path from 'node:path';
import {createRequire} from 'node:module';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const wait = +opt('--wait', '6');
const [w, h] = opt('--size', '1600x900').split('x').map(Number);
const scale = +opt('--scale', '0.5');
const deps = opt('--deps', '/root/oficina-build/node_modules');
const [page, out] = args;
const {chromium} = createRequire(path.join(deps, 'x.js'))('playwright');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome',
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: scale});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve(page));
await p.waitForTimeout(wait * 1000);
await p.screenshot({path: out, timeout: 180000});
const gl = await p.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const e = c && c.getExtension('WEBGL_debug_renderer_info');
  return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'sem webgl2';
});
console.log(out, '| GPU:', gl, errs.length ? '| erros: ' + errs.slice(0, 3).join(' || ') : '');
await browser.close();
