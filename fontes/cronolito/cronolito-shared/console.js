// O painel do Cronolito, em português: título e velocidade do tempo em cima à esquerda, a fase do ciclo, o estado
// das quatro coisas ao redor, os controles embaixo à esquerda; à direita a conta de verdade (quanta massa precisaria
// para frear o tempo assim), o gráfico do ciclo, o veredito e os botões de vista, peças e explosão. Layout fixo de
// 1600 × 900; update(f) redesenha tudo a partir do estado do quadro.
import {D, KMIN, M_PARAR, M_TERRA, PHASES, RELIC_MASS, RMAX, SUBJ, kDev, waveR} from './tempo.js';
import {ACC} from './reliquia.js';

export const C = {ink: '#17191c', mute: '#878b91', faint: '#cdced0', line: '#e2e2df', panel: 'rgba(250,250,248,.94)', acc: ACC, stone: '#8d8a84', live: '#3f8a52', bad: '#b23a32'};
export const VIEWS = [['geral', 'Geral'], ['reliquia', 'Relíquia'], ['nucleo', 'Núcleo'], ['cima', 'De cima']];
export const PARTS = [['tudo', 'Tudo'], ['nucleo', 'Núcleo'], ['aneis', 'Anéis'], ['escape', 'Escape'], ['gaiola', 'Gaiola']];
export const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');
const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
export const sci = (x) => {
  if (x < 1) return '0';
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return `${fmt(m, 1)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`;
};

const CSS = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.pn{position:absolute;background:${C.panel};border:1px solid ${C.line};box-shadow:0 1px 2px rgba(20,22,26,.04)}
.cp{font-size:9.6px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap}
.mu{color:${C.mute}}
.tb{position:absolute;height:22px;padding:0 6px;display:flex;align-items:center;justify-content:center;font-size:8.8px;font-weight:600;letter-spacing:.9px;text-transform:uppercase;border:1px solid ${C.line};background:#fff;color:${C.ink};white-space:nowrap}
.tb.on{background:${C.ink};color:#fff;border-color:${C.ink}}
.ph{position:absolute;left:46px;width:225px;height:20px;display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500;padding-left:6px}
.ph i{width:7px;height:7px;border-radius:50%;border:1.5px solid ${C.faint};display:block;box-sizing:border-box}
.ph.on{background:rgba(226,128,26,.12);font-weight:700}
.ph.on i{background:${ACC};border-color:${ACC}}
.ph.done i{background:${C.faint};border-color:${C.faint}}
.ph b{margin-left:auto;margin-right:6px;font-size:8.6px;font-weight:600;letter-spacing:1px;color:${C.mute}}
.sj{position:absolute;left:46px;width:225px;height:24px;display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500}
.sj .chip{font-size:8px;font-weight:700;letter-spacing:1.1px;padding:3px 6px;border-radius:2px;color:#fff;background:${C.live}}
.sj .chip.st{background:${C.stone}}
.sj .tm{margin-left:auto;font-size:10px;color:${C.mute};font-family:'JetBrains Mono',monospace}
.call{position:absolute;white-space:nowrap;background:rgba(250,250,248,.86);padding:3px 6px;border-radius:2px}
.call b{display:block;font-size:11.5px;font-weight:600}
.call span{display:block;font-size:8.4px;font-weight:500;letter-spacing:1.3px;color:${C.mute};text-transform:uppercase;margin-top:2px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${ACC};opacity:0;z-index:49}
.mono{font-family:'JetBrains Mono',monospace}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
const NS = 'http://www.w3.org/2000/svg';

export function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const leaders = add(`<svg style="position:absolute;left:0;top:0" width="1600" height="900"></svg>`);

  // ------------------------------------------------------------ título e velocidade do tempo
  add(`<div style="position:absolute;left:35px;top:33px;width:43px;height:3px;background:${ACC}"></div>`);
  add(`<div style="position:absolute;left:35px;top:45px;font-size:26px;font-weight:700;letter-spacing:-.3px">Cronolito <span style="color:${ACC}">·</span> <span style="font-weight:500">OF-004</span></div>`);
  add(`<div class="cp" style="position:absolute;left:35px;top:81px;font-weight:500;font-size:9.2px">Relicário que para o tempo e petrifica</div>`);
  add(`<div class="cp mu" style="position:absolute;left:35px;top:106px;font-weight:600;font-size:9px">Velocidade do tempo no campo</div>`);
  const kBig = add(`<div style="position:absolute;left:33px;top:121px;font-size:54px;font-weight:800;letter-spacing:-2.6px;color:${ACC};line-height:1"></div>`);
  add(`<div style="position:absolute;left:35px;top:184px;width:247px;height:8px;background:#e5e4e0"></div>`);
  const kFill = add(`<div style="position:absolute;left:35px;top:184px;height:8px;background:${ACC}"></div>`);
  add(`<div class="cp mu" style="position:absolute;left:35px;top:197px;font-size:8.6px;font-weight:500">Parado</div>`);
  add(`<div class="cp mu" style="position:absolute;left:35px;top:197px;width:247px;text-align:right;font-size:8.6px;font-weight:500">Normal</div>`);
  const clockLine = add(`<div style="position:absolute;left:35px;top:216px;font-size:11.5px;font-weight:500"></div>`);

  // ------------------------------------------------------------ fase do ciclo
  add(`<div class="pn" style="left:35px;top:244px;width:247px;height:228px"></div>`);
  add(`<div class="cp" style="position:absolute;left:46px;top:256px;font-weight:700">Fase do ciclo</div>`);
  const sNow = add(`<div class="cp mu" style="position:absolute;left:46px;top:256px;width:225px;text-align:right;font-weight:500"></div>`);
  const phRows = PHASES.map((p, i) => add(`<div class="ph" style="top:${276 + i * 21}px"><i></i>${p.nome}<b>${Math.round(p.a * D)}–${Math.round(p.b * D)} s</b></div>`));
  add(`<div style="position:absolute;left:46px;top:406px;width:225px;height:1px;background:${C.line}"></div>`);
  const phTxt = add(`<div style="position:absolute;left:46px;top:413px;width:225px;font-size:11px;line-height:1.42;white-space:normal"></div>`);

  // ------------------------------------------------------------ ao redor
  add(`<div class="pn" style="left:35px;top:480px;width:247px;height:166px"></div>`);
  add(`<div class="cp" style="position:absolute;left:46px;top:492px;font-weight:700">Em volta</div>`);
  add(`<div class="cp mu" style="position:absolute;left:46px;top:492px;width:225px;text-align:right;font-weight:500">Tempo vivido</div>`);
  const sjRows = SUBJ.map((o, i) =>
    add(`<div class="sj" style="top:${512 + i * 25}px"><span class="chip">VIVO</span><span>${o.nome}</span><span class="tm"></span></div>`),
  );
  add(`<div style="position:absolute;left:46px;top:616px;width:225px;font-size:9.6px;color:${C.mute};line-height:1.35">Cada coisa tem seu relógio: quando a onda passa por ela, ele para de contar.</div>`);

  // ------------------------------------------------------------ controles
  add(`<div class="pn" style="left:35px;top:762px;width:259px;height:123px"></div>`);
  const btn = {};
  btn.pause = add(`<div class="tb on" style="left:45px;top:771px;width:99px;height:26px;background:${ACC};border-color:${ACC};font-size:9.6px"></div>`);
  btn.back = add(`<div class="tb" style="left:149px;top:771px;width:66px;height:26px;font-size:9.6px">−½ s</div>`);
  btn.fwd = add(`<div class="tb" style="left:219px;top:771px;width:66px;height:26px;font-size:9.6px">+½ s</div>`);
  add(`<div class="cp" style="position:absolute;left:45px;top:809px;font-weight:500">Ativação</div>`);
  const ativVal = add(`<div class="cp" style="position:absolute;left:45px;top:809px;width:239px;text-align:right;font-weight:700"></div>`);
  const SL = {x: 46, w: 238};
  add(`<div style="position:absolute;left:${SL.x}px;top:828px;width:${SL.w}px;height:2px;background:#e1e1de"></div>`);
  const ativKnob = add(`<div style="position:absolute;top:823px;width:9px;height:12px;margin-left:-4.5px;background:${ACC}"></div>`);
  add(`<div class="cp" style="position:absolute;left:45px;top:845px;font-weight:500">Velocidade do vídeo</div>`);
  const velVal = add(`<div class="cp" style="position:absolute;left:45px;top:845px;width:239px;text-align:right;font-weight:700"></div>`);
  add(`<div style="position:absolute;left:${SL.x}px;top:864px;width:${SL.w}px;height:2px;background:#e1e1de"></div>`);
  const velKnob = add(`<div style="position:absolute;top:859px;width:9px;height:12px;margin-left:-4.5px;background:${ACC}"></div>`);

  // ------------------------------------------------------------ legenda no topo
  add(`<div class="cp" style="position:absolute;left:640px;top:36px;display:flex;gap:18px;font-weight:500;font-size:9.4px">
    ${[['Vivo', C.live], ['Em pedra', C.stone], ['Onda de estase', ACC]].map(([n, c]) => `<span><i style="display:inline-block;width:15px;height:3px;background:${c};vertical-align:middle;margin-right:6px"></i>${n}</span>`).join('')}</div>`);

  // ------------------------------------------------------------ a conta de verdade
  add(`<div class="pn" style="left:1318px;top:36px;width:245px;height:236px"></div>`);
  add(`<div class="cp" style="position:absolute;left:1329px;top:47px;font-weight:700">A conta de verdade</div>`);
  add(`<div class="cp mu" style="position:absolute;left:1329px;top:47px;width:224px;text-align:right;font-weight:500">Einstein</div>`);
  add(`<div class="mono" style="position:absolute;left:1329px;top:66px;font-size:14px;font-weight:600">dτ/dt = √(1 − r<sub style="font-size:9px">s</sub>/r)</div>`);
  add(`<div style="position:absolute;left:1329px;top:89px;width:224px;font-size:10.2px;line-height:1.4;color:${C.mute}">A única forma conhecida de frear o tempo num lugar é a gravidade. Para o relógio andar nessa velocidade a 9 cm do centro, a relíquia teria que pesar:</div>`);
  const massBig = add(`<div style="position:absolute;left:1328px;top:158px;font-size:30px;font-weight:800;letter-spacing:-1.2px;line-height:1"></div>`);
  const massKg = add(`<div class="mono" style="position:absolute;left:1329px;top:195px;font-size:11px;color:${C.mute}"></div>`);
  add(`<div style="position:absolute;left:1329px;top:215px;width:224px;height:1px;background:${C.line}"></div>`);
  add(`<div style="position:absolute;left:1329px;top:223px;width:224px;font-size:10.2px;line-height:1.4">A peça na mão tem <b>${fmt(RELIC_MASS)} kg</b>. Para parar de vez seriam <b>${fmt(M_PARAR / M_TERRA, 1)} Terras</b> num raio de 9 cm.</div>`);

  // ------------------------------------------------------------ gráfico do ciclo
  add(`<div class="pn" data-g="charts" style="left:1318px;top:280px;width:245px;height:168px"></div>`);
  add(`<div class="cp" style="position:absolute;left:1329px;top:291px;font-weight:700">O ciclo de ${D} s</div>`);
  add(`<div class="cp" style="position:absolute;left:1329px;top:307px;font-size:8.6px;font-weight:500;display:flex;gap:12px"><span><i style="display:inline-block;width:12px;height:2.4px;background:${ACC};vertical-align:middle;margin-right:5px"></i>Velocidade do tempo</span><span><i style="display:inline-block;width:12px;height:0;border-top:2px dashed ${C.mute};vertical-align:middle;margin-right:5px"></i>Raio da onda</span></div>`);
  const ch = add(`<svg style="position:absolute;left:1329px;top:322px" width="224" height="118"></svg>`);
  const CW = 224;
  const CH = 100;
  {
    const path = (fn) => {
      let d = '';
      for (let i = 0; i <= 200; i++) {
        const s = i / 200;
        d += `${i ? 'L' : 'M'}${(s * CW).toFixed(1)},${(6 + (1 - fn(s)) * (CH - 12)).toFixed(1)}`;
      }
      return d;
    };
    PHASES.forEach((p, i) => {
      if (i) ch.insertAdjacentHTML('beforeend', `<line x1="${p.a * CW}" x2="${p.a * CW}" y1="2" y2="${CH}" stroke="${C.line}" stroke-width="1"/>`);
    });
    ch.insertAdjacentHTML('beforeend', `<line x1="0" x2="${CW}" y1="${CH}" y2="${CH}" stroke="${C.faint}"/>`);
    ch.insertAdjacentHTML('beforeend', `<path d="${path((s) => waveR(s) / RMAX)}" fill="none" stroke="${C.mute}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    ch.insertAdjacentHTML('beforeend', `<path d="${path(kDev)}" fill="none" stroke="${ACC}" stroke-width="2.2"/>`);
    ch.insertAdjacentHTML('beforeend', `<text x="0" y="${CH + 13}" font-size="8.5" fill="${C.mute}" font-family="Inter">0 s</text><text x="${CW}" y="${CH + 13}" font-size="8.5" fill="${C.mute}" text-anchor="end" font-family="Inter">${D} s</text>`);
  }
  const chCur = document.createElementNS(NS, 'line');
  chCur.setAttribute('y1', '0');
  chCur.setAttribute('y2', String(CH));
  chCur.setAttribute('stroke', C.ink);
  chCur.setAttribute('stroke-width', '1.2');
  ch.appendChild(chCur);
  const chDot = document.createElementNS(NS, 'circle');
  chDot.setAttribute('r', '3.6');
  chDot.setAttribute('fill', ACC);
  ch.appendChild(chDot);

  // ------------------------------------------------------------ veredito
  add(`<div class="pn" style="left:1318px;top:456px;width:245px;height:128px"></div>`);
  add(`<div class="cp" style="position:absolute;left:1329px;top:467px;font-weight:700">Dá para existir?</div>`);
  add(`<div style="position:absolute;left:1329px;top:485px;display:flex;align-items:center;gap:7px;font-size:15px;font-weight:800;letter-spacing:.5px;color:${C.bad}"><i style="width:9px;height:9px;border-radius:50%;background:${C.bad};display:block"></i>INVIÁVEL</div>`);
  add(`<div style="position:absolute;left:1329px;top:508px;width:224px;font-size:10.2px;line-height:1.42">Frear o tempo a ${fmt(KMIN * 100)}% pede ~${fmt(M_PARAR / M_TERRA, 0)} Terras espremidas em 9 cm: isso já é um buraco negro. E virar pedra de verdade (fossilizar) leva uns 10 mil anos.</div>`);

  // ------------------------------------------------------------ vistas, peças, mostrar
  add(`<div class="pn" style="left:1318px;top:592px;width:245px;height:293px"></div>`);
  const spots = {};
  const mk = (key, label, x, y, w) => {
    const b = add(`<div class="tb" style="left:${x}px;top:${y}px;width:${w}px">${label}</div>`);
    spots[key] = [x + w / 2, y + 11];
    btn[key] = b;
    return b;
  };
  add(`<div class="cp" style="position:absolute;left:1329px;top:603px;font-weight:700">Vista</div>`);
  VIEWS.forEach(([k, n], i) => mk('v_' + k, n, 1329 + (i % 2) * 113, 620 + Math.floor(i / 2) * 27, 109));
  add(`<div class="cp" style="position:absolute;left:1329px;top:684px;font-weight:700">Peças</div>`);
  PARTS.forEach(([k, n], i) => mk('p_' + k, n, 1329 + (i % 3) * 75.3, 701 + Math.floor(i / 3) * 27, 71));
  add(`<div class="cp" style="position:absolute;left:1329px;top:765px;font-weight:700">Mostrar</div>`);
  mk('explode', 'Explodir peças', 1329, 782, 109);
  mk('names', 'Legendas', 1442, 782, 109);
  add(`<div style="position:absolute;left:1329px;top:816px;width:224px;font-size:9.6px;line-height:1.4;color:${C.mute}">Arraste para girar · roda do mouse ou pinça para aproximar · espaço pausa · H esconde o painel</div>`);

  // ------------------------------------------------------------ legendas com linha
  const CALL = {
    reliquia: {nucleo: ['Núcleo de cristal', 'guarda a carga', -150, -70], aneis: ['Anéis do cardã', '3 eixos que travam', 120, -60], escape: ['Escapamento', 'o relógio interno', 140, 50], gaiola: ['Gaiola geodésica', '120 hastes', -160, -30]},
    geral: {flor: ['Flor', '', -80, 10], borboleta: ['Borboleta', '', -70, -60], ampulheta: ['Ampulheta', '', 80, -30], gotas: ['Gotas d’água', '', 70, -60], nucleo: ['Cronolito', 'a relíquia', 90, -110]},
  };
  const callPool = [];
  const getCall = (i) => {
    if (!callPool[i]) {
      const n = add(`<div class="call"><b></b><span></span></div>`);
      const ln = document.createElementNS(NS, 'path');
      ln.setAttribute('fill', 'none');
      ln.setAttribute('stroke', C.ink);
      ln.setAttribute('stroke-width', '1');
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '2.6');
      dot.setAttribute('fill', C.ink);
      leaders.append(ln, dot);
      callPool[i] = {n, ln, dot};
    }
    return callPool[i];
  };

  // ------------------------------------------------------------ cursor do tour
  const cur = add(`<svg class="cur" width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.6 L10 14.2 L16.5 14.2 Z" fill="#fff" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/></svg>`);
  const ring = add(`<div class="ring"></div>`);

  const ativKnobAt = (k) => [SL.x + k * SL.w, 829];
  const velKnobAt = (k) => [SL.x + k * SL.w, 865];

  function update(f) {
    const S = f.S;
    // velocidade do tempo
    const pct = S.k * 100;
    kBig.textContent = pct >= 99.95 ? '100%' : pct < 1 ? `${fmt(pct, 1)}%` : `${fmt(pct, 0)}%`;
    kFill.style.width = `${Math.max(0.5, S.k * 247)}px`;
    clockLine.innerHTML = `Relógio interno: <b class="mono">${fmt(S.devClock, 1)} s</b> <span style="color:${C.mute}">de ${fmt(S.s * D, 1)} s</span>`;
    // fase
    sNow.textContent = `${fmt(S.s * D, 1)} s`;
    phRows.forEach((r, i) => {
      r.classList.toggle('on', i === S.phase);
      r.classList.toggle('done', i < S.phase);
    });
    phTxt.textContent = PHASES[S.phase]?.txt ?? '';
    // ao redor
    S.subj.forEach((o, i) => {
      const r = sjRows[i];
      const chip = r.children[0];
      const st = o.frozen > 0.5;
      chip.textContent = st ? 'PEDRA' : 'VIVO';
      chip.classList.toggle('st', st);
      r.children[2].textContent = `${fmt(o.clock, 1)} s`;
    });
    // conta
    const M = S.mass;
    massBig.textContent = M < 1 ? '0 kg' : M / M_TERRA >= 0.1 ? `${fmt(M / M_TERRA, M / M_TERRA < 10 ? 2 : 1)} Terras` : `${sci(M)} kg`;
    massBig.style.color = M < 1 ? C.ink : ACC;
    massKg.textContent = M < 1 ? 'tempo normal: nada a frear' : `${sci(M)} kg`;
    // gráfico
    chCur.setAttribute('x1', String(S.s * CW));
    chCur.setAttribute('x2', String(S.s * CW));
    chDot.setAttribute('cx', String(S.s * CW));
    chDot.setAttribute('cy', String(6 + (1 - S.k) * (CH - 12)));
    // controles
    btn.pause.innerHTML = f.paused ? '▶ &nbsp;Continuar' : '❚❚ &nbsp;Pausar';
    ativVal.textContent = `${fmt(S.s * D, 1)} s`;
    ativKnob.style.left = `${ativKnobAt(S.s)[0]}px`;
    velVal.textContent = f.speedText;
    velKnob.style.left = `${velKnobAt(f.speedK)[0]}px`;
    for (const [k] of VIEWS) btn['v_' + k].classList.toggle('on', f.view === k);
    for (const [k] of PARTS) btn['p_' + k].classList.toggle('on', (f.iso || 'tudo') === k);
    btn.explode.classList.toggle('on', f.explode > 0.5);
    btn.names.classList.toggle('on', !!f.names);
    // legendas
    let n = 0;
    if (f.names) {
      const set = f.view === 'geral' || f.view === 'cima' ? CALL.geral : CALL.reliquia;
      const an = f.anchors;
      for (const [k, [title, sub, dx, dy]] of Object.entries(set)) {
        if (f.iso && k !== f.iso) continue;
        if (!f.iso && (f.view === 'nucleo') && k !== 'nucleo' && k !== 'aneis') continue;
        const p = f.project(an[k]);
        if (!p || p[0] < 300 || p[0] > 1300 || p[1] < 40 || p[1] > 880) continue;
        const c = getCall(n++);
        const lx = dx < 0 ? Math.min(1290, Math.max(470, p[0] + dx)) : Math.min(1140, Math.max(305, p[0] + dx));
        const ly = Math.min(860, Math.max(50, p[1] + dy));
        c.n.style.display = '';
        c.n.style.left = `${lx}px`;
        c.n.style.top = `${ly - 13}px`;
        c.n.style.transform = dx < 0 ? 'translateX(-100%)' : '';
        c.n.style.textAlign = dx < 0 ? 'right' : 'left';
        c.n.children[0].textContent = title;
        c.n.children[1].textContent = sub;
        c.n.children[1].style.display = sub ? '' : 'none';
        const kx = p[0] + dx * 0.55;
        c.ln.setAttribute('d', `M${p[0]},${p[1]} L${kx},${ly} L${lx},${ly}`);
        c.ln.style.display = '';
        c.dot.setAttribute('cx', p[0]);
        c.dot.setAttribute('cy', p[1]);
        c.dot.style.display = '';
      }
    }
    for (let i = n; i < callPool.length; i++) {
      callPool[i].n.style.display = 'none';
      callPool[i].ln.style.display = 'none';
      callPool[i].dot.style.display = 'none';
    }
    // cursor
    const k = f.cursor;
    cur.style.display = k && k.x > 0 ? '' : 'none';
    if (k && k.x > 0) cur.style.transform = `translate(${k.x - 2}px, ${k.y - 2}px) scale(${k.press ? 0.86 : 1})`;
    if (k && k.ring > 0) {
      ring.style.opacity = String(k.ring);
      ring.style.left = `${k.ringX}px`;
      ring.style.top = `${k.ringY}px`;
      ring.style.transform = `scale(${1.6 - 0.6 * k.ring})`;
    } else ring.style.opacity = '0';
  }

  return {root: ui, btn, spots, ativKnobAt, velKnobAt, update};
}
