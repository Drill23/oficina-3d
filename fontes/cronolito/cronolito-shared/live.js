// O Cronolito como página que você comanda: vistas, peças isoladas, explosão, legendas, pausa, a ativação e a
// velocidade em controles deslizantes, órbita arrastando, zoom na roda ou na pinça. Sem ninguém mexer, roda o tour
// automático com cursor; um clique, arrasto ou tecla entrega o controle, 25 s de silêncio devolvem o tour.
import {createConsole, PARTS, VIEWS as VLIST} from './console.js';
import {TOUR, tourAt, viewAt} from './film.js';
import {createStage} from './stage.js';
import {D, stateAt, wrap1} from './tempo.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrapDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1];
const speedText = (p) => (p >= 1 ? 'Normal (1×)' : `${String(p).replace('.', ',')}×`);

const CSS = `
html,body{background:#eae9e6;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.tb{pointer-events:auto;cursor:pointer}
.tb:hover{filter:brightness(.95)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:62px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid #e1e1de;background:rgba(255,255,255,.95);color:#17191c;font:600 8.8px Inter,sans-serif;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto;text-transform:uppercase}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#e2801a}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:18px;text-align:center;font:600 12px/1.4 Inter,sans-serif;letter-spacing:1px;color:#878b91;text-transform:uppercase;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.lang = 'pt-BR';
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);

  // ------------------------------------------------------------ qualidade
  const TIERS = [{pr: 2, shadow: 2048}, {pr: 1.4, shadow: 1024}, {pr: 1, shadow: 1024}];
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  let tier = light ? 1 : 0;
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.6, TIERS[tier].pr));
  };
  const applyTier = () => {
    st.setShadow(TIERS[tier].shadow);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };

  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.root.appendChild(tourChip);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Gire o celular de lado para ver o painel inteiro';
  document.body.appendChild(note);

  // ------------------------------------------------------------ estado
  let T = 0;
  let s = 0;
  let paused = false;
  let speedI = SPEEDS.length - 1;
  let view = 'geral';
  let viewT = 0;
  let iso = null;
  let exTarget = 0;
  let ex = 0;
  let names = true;
  let hidden = false;
  const off = {az: 0, el: 0, k: 1};
  const cam = {...viewAt('geral', 0)};
  let ring = {t: -9, x: 0, y: 0};
  const pulse = (k) => (ring = {t: T, x: ui.spots[k]?.[0] ?? 0, y: ui.spots[k]?.[1] ?? 0});

  // ------------------------------------------------------------ tour
  const AP = {on: true, t0: 0};
  let lastInput = 0;
  let tour = tourAt(0, ui.spots);
  const startTour = () => {
    AP.on = true;
    AP.t0 = T - s * D; // continua do ponto do ciclo onde está
    paused = false;
    speedI = SPEEDS.length - 1;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    AP.on = false;
    view = tour.view;
    viewT = T - tour.since;
    iso = tour.iso;
    exTarget = tour.explode > 0.5 ? 1 : 0;
    ex = tour.explode;
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });

  // ------------------------------------------------------------ botões
  const setView = (v) => {
    view = v;
    viewT = T;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  for (const [k] of VLIST)
    ui.btn['v_' + k].addEventListener('click', () => {
      takeOver();
      pulse('v_' + k);
      setView(k);
    });
  for (const [k] of PARTS)
    ui.btn['p_' + k].addEventListener('click', () => {
      takeOver();
      pulse('p_' + k);
      iso = k === 'tudo' ? null : k;
      if (iso && (view === 'geral' || view === 'cima')) setView('reliquia');
    });
  ui.btn.explode.addEventListener('click', () => {
    takeOver();
    pulse('explode');
    exTarget = exTarget ? 0 : 1;
    if (exTarget && (view === 'geral' || view === 'cima')) setView('reliquia');
  });
  ui.btn.names.addEventListener('click', () => {
    takeOver();
    pulse('names');
    names = !names;
  });
  ui.btn.pause.addEventListener('click', () => {
    takeOver();
    paused = !paused;
  });
  for (const [k, d] of [['back', -0.5], ['fwd', 0.5]])
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      paused = true;
      s = wrap1(s + d / D);
    });
  const slider = (knobAt, apply) => {
    const [x0, y] = knobAt(0);
    const [x1] = knobAt(1);
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${x0 - 8}px`, top: `${y - 12}px`, width: `${x1 - x0 + 16}px`, height: '24px'});
    const move = (e) => {
      const [x] = toStage(e.clientX, e.clientY);
      apply(clamp((x - x0) / (x1 - x0), 0, 1));
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    ui.root.appendChild(d);
  };
  slider(ui.ativKnobAt, (k) => {
    paused = true;
    s = Math.min(k, 0.9999);
  });
  slider(ui.velKnobAt, (k) => (speedI = Math.round(k * (SPEEDS.length - 1))));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    const v = {1: 'geral', 2: 'reliquia', 3: 'nucleo', 4: 'cima'}[key];
    takeOver();
    if (v) setView(v);
    else if (key === ' ') paused = !paused;
    else if (key === 'h') hidden = !hidden;
    else if (key === 'e') exTarget = exTarget ? 0 : 1;
    else if (key === 'arrowleft') {
      paused = true;
      s = wrap1(s - 0.5 / D);
    } else if (key === 'arrowright') {
      paused = true;
      s = wrap1(s + 0.5 / D);
    } else return;
    e.preventDefault();
  });
  // órbita com um dedo/mouse, pinça com dois dedos
  const pts = new Map();
  let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    if (pts.size === 1) {
      off.az -= ((e.clientX - p.x) / scale) * 0.3;
      off.el = clamp(off.el + ((e.clientY - p.y) / scale) * 0.2, -25, 60);
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) off.k = clamp(off.k * (pinch / d), 0.35, 2.4);
      pinch = d;
    }
    lastInput = T;
  });
  const endDrag = (e) => {
    pts.delete(e.pointerId);
    pinch = 0;
    if (!pts.size) canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.4);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ o quadro
  startTour();
  // ?t=12.5 congela o tour num instante (para capturas)
  const fixed = new URLSearchParams(location.search).get('t');
  if (fixed !== null) AP.t0 = -Number(fixed);
  let last = performance.now();
  const perf = {n: 0, sum: 0, age: 0, slow: 0};
  const frame = (now) => {
    const dt = fixed !== null ? 0 : Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (tier < TIERS.length - 1 && fixed === null) {
      perf.age += dt;
      if (perf.age > 1) {
        perf.sum += dt;
        perf.n++;
        if (perf.n >= 30) {
          perf.slow = perf.sum / perf.n > 0.026 ? perf.slow + 1 : 0;
          perf.sum = 0;
          perf.n = 0;
          if (perf.slow >= 2) {
            tier++;
            applyTier();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }

    let tgt;
    let cursor;
    if (AP.on) {
      const c = (((T - AP.t0) % TOUR) + TOUR) % TOUR;
      s = wrap1(c / D);
      tour = tourAt(c, ui.spots);
      view = tour.view;
      iso = tour.iso;
      ex = tour.explode;
      names = true;
      tgt = viewAt(view, tour.since, ex, iso);
      cursor = tour.cursor;
    } else {
      if (T - lastInput > IDLE) startTour();
      if (!paused) s = wrap1(s + (dt / D) * SPEEDS[speedI]);
      ex += (exTarget - ex) * (1 - Math.exp(-dt / 0.3));
      tgt = viewAt(view, T - viewT, ex, iso);
      tgt.az += off.az;
      tgt.el = clamp(tgt.el + off.el, -15, 80);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    const k = fixed !== null ? 1 : 1 - Math.exp(-dt / (AP.on ? 0.35 : 0.3));
    cam.az += wrapDeg(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd']) cam[key] += (tgt[key] - cam[key]) * k;

    const S = stateAt(s);
    st.frame(S, {...cam, az: cam.az * D2R, el: cam.el * D2R}, {explode: ex, iso, close: view === 'reliquia' || view === 'nucleo'});
    ui.root.style.display = hidden ? 'none' : '';
    ui.update({
      S,
      view,
      iso,
      explode: ex,
      names,
      paused: !AP.on && paused,
      speedText: speedText(SPEEDS[speedI]),
      speedK: speedI / (SPEEDS.length - 1),
      cursor,
      project: st.project,
      anchors: st.world.anchors(),
    });
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>Tour automático · clique para assumir' : '▶ Voltar ao tour';
    }
    requestAnimationFrame(frame);
  };
  st.renderer.compileAsync(st.scene, st.camera).then(
    () => requestAnimationFrame(frame),
    () => requestAnimationFrame(frame),
  );
  window.LIVE = {st, cam, startTour, takeOver, get s() {
    return s;
  }, set s(v) {
    s = v;
  }};
}
