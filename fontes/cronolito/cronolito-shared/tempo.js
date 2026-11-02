// A matemática do Cronolito. Uma entrada só: a ativação s (0..1) de um ciclo de D segundos.
// Daqui saem a velocidade do tempo, a carga do cristal, a trava dos anéis, o raio da onda, os relógios locais
// de cada coisa ao redor e a conta da física (dilatação gravitacional). Sem three.js aqui.

export const D = 16; // segundos de um ciclo completo
export const RDEV = 0.09; // raio da gaiola (m) — a relíquia tem 18 cm
export const RMAX = 0.68; // alcance máximo da onda (m)
export const KMIN = 0.001; // dentro do campo o tempo anda a 0,1%
export const PLINTH = 0.2; // altura do pedestal (m)
export const CENTER = [0, PLINTH + 0.112, 0]; // centro da relíquia no mundo (m)

export const PHASES = [
  {k: 'repouso', nome: 'Repouso', a: 0, b: 0.08, txt: 'O escapamento marca o tempo normal: 2 tiques por segundo.'},
  {k: 'carga', nome: 'Carga', a: 0.08, b: 0.34, txt: 'Os três anéis aceleram e o cristal acumula a carga.'},
  {k: 'trava', nome: 'Trava', a: 0.34, b: 0.42, txt: 'Os anéis se alinham num plano só: a trava de cardã. O tempo para.'},
  {k: 'onda', nome: 'Onda', a: 0.42, b: 0.66, txt: 'A onda de estase se espalha e vira em pedra tudo o que toca.'},
  {k: 'estase', nome: 'Estase', a: 0.66, b: 0.86, txt: 'Dentro do campo nada se move: gota, areia, asa, pétala.'},
  {k: 'retorno', nome: 'Retorno', a: 0.86, b: 1, txt: 'A onda recua e a pedra volta a ser o que era.'},
];

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const sm = (a, b, x) => {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
export const wrap1 = (s) => ((s % 1) + 1) % 1;

export const phaseAt = (s) => PHASES.findIndex((p) => s >= p.a && s < p.b + (p.b === 1 ? 1e-9 : 0));

// carga do cristal (0..1): sobe na carga, segura até a estase, descarrega no retorno
export const charge = (s) => sm(0.08, 0.34, s) * (1 - sm(0.66, 0.9, s));
// trava de cardã (0..1): os anéis vão para o mesmo plano
export const lock = (s) => sm(0.34, 0.41, s) * (1 - sm(0.88, 0.97, s));
// raio da onda (m)
export const waveR = (s) => RMAX * Math.min(easeOut((s - 0.42) / 0.24), 1 - sm(0.86, 0.98, s));
// velocidade do tempo dentro da relíquia (1 = normal)
export const kDev = (s) => 1 - (1 - KMIN) * lock(s);
// quanto um ponto a distância d do centro está congelado (0..1)
export const frozenAt = (d, s) => {
  const R = waveR(s);
  if (R <= 1e-4) return 0;
  return 1 - sm(R - 0.04, R, d);
};

// as quatro coisas ao redor, com a distância do centro da relíquia até elas
export const SUBJ = [
  {k: 'borboleta', nome: 'Borboleta', pos: [-0.17, 0.42, 0.33]},
  {k: 'flor', nome: 'Flor no vaso', pos: [-0.4, 0.15, 0.02]},
  {k: 'ampulheta', nome: 'Ampulheta', pos: [0.3, 0.08, 0.3]},
  {k: 'gotas', nome: 'Gotas d’água', pos: [0.36, 0.2, -0.32]},
];
for (const o of SUBJ) o.d = Math.hypot(o.pos[0] - CENTER[0], o.pos[1] - CENTER[1], o.pos[2] - CENTER[2]);

// ------------------------------------------------------------ relógios locais (tabelados uma vez)
// O tempo vivido por cada coisa é a integral da sua velocidade do tempo ao longo do ciclo: τ(s) = D·∫ k ds.
const N = 4000;
const table = (rate) => {
  const a = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const s0 = (i - 1) / N;
    const s1 = i / N;
    a[i] = a[i - 1] + ((rate(s0) + rate(s1)) / 2) * (D / N);
  }
  return a;
};
const read = (a, s) => {
  const x = clamp(s, 0, 1) * N;
  const i = Math.min(N - 1, Math.floor(x));
  return a[i] + (a[i + 1] - a[i]) * (x - i);
};
const devTab = table(kDev);
export const devClock = (s) => read(devTab, s); // segundos vividos pela relíquia
export const DEV_TOTAL = devTab[N];
const subjTab = SUBJ.map((o) => table((s) => 1 - (1 - KMIN) * frozenAt(o.d, s)));
export const subjClock = (j, s) => read(subjTab[j], s);
export const SUBJ_TOTAL = subjTab.map((a) => a[N]);
// uma frequência que fecha um número inteiro de voltas no ciclo, para o laço não dar pulo
export const loopFreq = (f, total) => Math.max(1, Math.round(f * total)) / total;

// ------------------------------------------------------------ anéis do cardã
// velocidade de giro (voltas/s) de cada anel: devagar no repouso, 8× na carga, zero na trava
const spin = (base) => (s) => base * (1 + 7 * sm(0.08, 0.32, s) * (1 - sm(0.66, 0.95, s))) * (1 - lock(s));
const RING_BASE = [0.18, -0.27, 0.41];
const ringTab = RING_BASE.map((b) => table(spin(b)));
const ringScale = ringTab.map((a) => {
  const turns = a[N];
  return Math.round(turns) / turns || 1;
});
const wrapPi = (x) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
// ângulo de cada anel (rad): o giro integrado, puxado para 0 pela trava
export const ringAngle = (i, s) => wrapPi(2 * Math.PI * read(ringTab[i], s) * ringScale[i]) * (1 - lock(s));
export const ringRate = (i, s) => Math.abs(spin(RING_BASE[i])(s) * ringScale[i]) * 60; // rpm

// ------------------------------------------------------------ escapamento (relógio interno)
export const TICK_HZ = loopFreq(2, DEV_TOTAL); // ≈ 2 tiques por segundo
export const ESC_TEETH = 15;
export const GEAR = {m: 0.0012, z: [15, 40, 24]};
// a roda de escape anda aos saltos: um dente a cada tique
export const escAngle = (s) => {
  const x = devClock(s) * TICK_HZ;
  const n = Math.floor(x);
  const f = x - n;
  return -((n + sm(0, 0.18, f)) * 2 * Math.PI) / ESC_TEETH / 2;
};
// a âncora balança de um lado para o outro a cada tique
export const anchorAngle = (s) => 0.22 * Math.cos(Math.PI * devClock(s) * TICK_HZ);

// ------------------------------------------------------------ a conta de verdade
// Dilatação do tempo pela gravidade (Schwarzschild): dτ/dt = √(1 − rs/r), rs = 2GM/c².
// Para o tempo andar a k a uma distância r do centro: rs = r(1 − k²), M = rs·c²/(2G).
export const G = 6.674e-11;
export const Cl = 2.998e8;
export const M_TERRA = 5.972e24;
export const massFor = (k, r = RDEV) => (r * (1 - k * k) * Cl * Cl) / (2 * G);
export const M_PARAR = massFor(KMIN); // ≈ 6,7·10²⁵ kg
export const RELIC_MASS = 1.4; // kg, a peça na mão

// tudo que o quadro mostra num instante
export function stateAt(s) {
  s = wrap1(s);
  const k = kDev(s);
  const R = waveR(s);
  const subj = SUBJ.map((o, j) => ({...o, frozen: frozenAt(o.d, s), clock: subjClock(j, s)}));
  return {
    s,
    k,
    R,
    phase: phaseAt(s),
    charge: charge(s),
    lock: lock(s),
    mass: massFor(k),
    devClock: devClock(s),
    subj,
    stone: subj.filter((o) => o.frozen > 0.5).length,
    rings: [0, 1, 2].map((i) => ringAngle(i, s)),
    rpm: ringRate(2, s),
    esc: escAngle(s),
    anchor: anchorAngle(s),
  };
}
