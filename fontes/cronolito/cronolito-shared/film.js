// O roteiro do tour automático: dois ciclos de 16 s. No primeiro a gente vê de longe a onda petrificar tudo; no
// segundo a relíquia abre (explodida), e cada sistema é isolado no momento em que trabalha. tourAt(c) é uma função
// pura do tempo do tour: vista, peça isolada, explosão e o cursor que aperta os botões.
import {CENTER, D} from './tempo.js';

const D2R = Math.PI / 180;
const CY = CENTER[1];
export const TOUR = 2 * D;

// vistas: alvo, azimute e elevação em graus, distância em metros; drift = graus por segundo de órbita lenta
export const VIEWS = {
  geral: {tx: 0.03, ty: 0.19, tz: 0.0, az: 24, el: 19, d: 2.2, drift: 1.2},
  reliquia: {tx: 0, ty: CY + 0.0, tz: 0, az: 32, el: 14, d: 1.0, drift: 4},
  nucleo: {tx: 0, ty: CY, tz: 0, az: 14, el: 9, d: 0.42, drift: 5},
  cima: {tx: 0.02, ty: 0.12, tz: 0, az: 18, el: 58, d: 2.35, drift: 1.5},
};
export function viewAt(view, since, explode = 0, iso = null) {
  const v = VIEWS[view] || VIEWS.geral;
  const close = view === 'reliquia' || view === 'nucleo';
  const ex = close ? explode : 0;
  const t = {tx: v.tx, ty: v.ty, tz: v.tz, az: v.az + v.drift * since, el: v.el, d: v.d};
  if (!close) return t;
  t.az += 10 * ex;
  const who = iso || (view === 'nucleo' ? 'nucleo' : null);
  if (who === 'nucleo') Object.assign(t, {tx: 0, ty: CY, tz: 0.34 * ex, d: 0.4});
  else if (who === 'aneis') Object.assign(t, {tx: 0, ty: CY, tz: 0.2 * ex, d: 0.72 * (1 + 0.35 * ex)});
  else if (who === 'escape') Object.assign(t, {tx: 0, ty: CY - 0.085 + 0.03 * ex, tz: 0.07, el: v.el + 24, d: 0.36});
  else if (who === 'gaiola') Object.assign(t, {tx: 0, ty: CY + 0.06 * ex, tz: 0, d: 0.9 * (1 + 0.3 * ex)});
  else Object.assign(t, {ty: v.ty + 0.03 * ex, tz: 0.12 * ex, d: v.d * (1 + 0.35 * ex)});
  return t;
}

export const SCRIPT = [
  {t: 3.2, btn: 'v_reliquia', view: 'reliquia'},
  {t: 6.9, btn: 'v_geral', view: 'geral'},
  {t: 11.4, btn: 'v_cima', view: 'cima'},
  {t: 14.4, btn: 'v_geral', view: 'geral'},
  {t: 16.8, btn: 'v_reliquia', view: 'reliquia'},
  {t: 18.2, btn: 'explode', explode: 1},
  {t: 20.0, btn: 'p_aneis', iso: 'aneis'},
  {t: 22.6, btn: 'p_nucleo', iso: 'nucleo', view: 'nucleo'},
  {t: 24.8, btn: 'p_escape', iso: 'escape', view: 'reliquia'},
  {t: 27.0, btn: 'p_tudo', iso: null},
  {t: 28.4, btn: 'explode', explode: 0},
  {t: 30.4, btn: 'v_geral', view: 'geral'},
];

const ease = (u) => {
  const x = Math.min(1, Math.max(0, u));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// estado do tour no instante c (0..TOUR)
export function tourAt(c, spots) {
  let view = 'geral';
  let vt = -6;
  let iso = null;
  let ex = 0;
  let exFrom = 0;
  let exT = -9;
  for (const e of SCRIPT) {
    if (e.t > c) break;
    if (e.view) {
      view = e.view;
      vt = e.t;
    }
    if ('iso' in e) iso = e.iso;
    if ('explode' in e) {
      exFrom = exFrom + (ex - exFrom) * ease((e.t - exT) / 0.9);
      ex = e.explode;
      exT = e.t;
    }
  }
  const explode = exFrom + (ex - exFrom) * ease((c - exT) / 0.9);
  // cursor: vai de um botão ao próximo, aperta, mostra o anel do clique
  let cursor = {x: 1190, y: 690, press: false, ring: 0};
  const evs = SCRIPT.filter((e) => e.btn);
  let prev = [1190, 690];
  for (const e of evs) {
    const p = spots[e.btn];
    if (c < e.t - 0.95) {
      cursor = {x: prev[0], y: prev[1], press: false, ring: 0};
      break;
    }
    if (c < e.t) {
      const k = ease((c - (e.t - 0.95)) / 0.8);
      cursor = {x: prev[0] + (p[0] - prev[0]) * k, y: prev[1] + (p[1] - prev[1]) * k, press: c > e.t - 0.12, ring: 0};
      break;
    }
    const rk = Math.max(0, 1 - (c - e.t) / 0.55);
    cursor = {x: p[0], y: p[1], press: c - e.t < 0.08, ring: rk, ringX: p[0], ringY: p[1]};
    prev = p;
  }
  return {view, since: c - vt, iso, explode, cursor, names: true};
}
export {D2R};
