// A geometria do Cronolito, toda gerada por código: a gaiola geodésica, os três anéis do cardã, o núcleo de cristal,
// o escapamento de relógio na base, o pedestal, as quatro coisas ao redor (flor, borboleta, ampulheta, gotas) e a
// onda de estase. update(state, ops) posa tudo a partir do estado do instante (tempo.js).
import * as THREE from 'three';
import {CENTER, ESC_TEETH, GEAR, PLINTH, RDEV, RMAX, SUBJ, SUBJ_TOTAL, clamp, loopFreq, sm, subjClock} from './tempo.js';

export const ACC = '#e2801a';
const V3 = THREE.Vector3;
const PI = Math.PI;

// ------------------------------------------------------------ material que vira pedra
// Um ponto do mundo a distância d do centro vira pedra quando a onda (raio uR) já passou por ele. Na frente da onda
// fica uma borda acesa. O ruído da pedra e as rachaduras saem da posição no mundo, então a pedra "cresce" na peça.
const PU = {uR: {value: 0}, uC: {value: new V3(...CENTER)}, uAcc: {value: new THREE.Color(ACC)}};
const NOISE = `
float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm(vec3 p){ return 0.55*vn(p)+0.3*vn(p*2.1)+0.15*vn(p*4.3); }
`;
function petrify(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, PU);
    sh.vertexShader =
      'varying vec3 vPW;\n' +
      sh.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 pw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          pw = instanceMatrix * pw;
        #endif
        vPW = (modelMatrix * pw).xyz;`,
      );
    sh.fragmentShader =
      'uniform float uR; uniform vec3 uC; uniform vec3 uAcc; varying vec3 vPW;\n' +
      NOISE +
      sh.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float pd = distance(vPW, uC);
          float pet = uR > 0.0001 ? 1.0 - smoothstep(uR - 0.03, uR, pd) : 0.0;
          float edge = uR > 0.0001 ? 1.0 - smoothstep(0.0, 0.01, abs(pd - uR + 0.012)) : 0.0;
          float nz = fbm(vPW * 38.0);
          float cr = fbm(vPW * 70.0 + 3.1);
          float crack = smoothstep(0.46, 0.5, cr) * (1.0 - smoothstep(0.5, 0.54, cr));
          vec3 stone = vec3(0.53, 0.52, 0.5) * (0.74 + 0.42 * nz) * (1.0 - 0.5 * crack);
          diffuseColor.rgb = mix(diffuseColor.rgb, stone, pet);
          diffuseColor.a = mix(diffuseColor.a, 1.0, pet);`,
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.93, pet);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, pet);')
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance = totalEmissiveRadiance * (1.0 - pet) + uAcc * edge * 1.2;',
        );
  };
  mat.customProgramCacheKey = () => 'petrify';
  return mat;
}
const std = (o) => new THREE.MeshStandardMaterial(o);
const pstd = (o) => petrify(std(o));

// ------------------------------------------------------------ helpers de geometria
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// anel chato (faixa) no plano XY, normal +Z
function band(r, t, w, seg = 128) {
  const g = lathe([[r - t, -w], [r + t, -w], [r + t, w], [r - t, w], [r - t, -w]], seg);
  g.rotateX(PI / 2);
  g.computeVertexNormals();
  return g;
}
// pino entre dois pontos
function rod(a, b, r, mat) {
  const A = new V3(...a);
  const B = new V3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 16), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
// engrenagem de dentes trapezoidais, deitada (eixo Y), espessura th para cima
function gearGeo(z, m, th, windows = 0) {
  const rp = (m * z) / 2;
  const ra = rp + m;
  const rf = rp - 1.25 * m;
  const P = (2 * PI) / z;
  const sh = new THREE.Shape();
  for (let i = 0; i < z; i++) {
    const a = i * P;
    const pts = [[rf, a - 0.5 * P], [rf, a - 0.27 * P], [ra, a - 0.13 * P], [ra, a + 0.13 * P], [rf, a + 0.27 * P]];
    pts.forEach(([r, q], j) => (i === 0 && j === 0 ? sh.moveTo(r * Math.cos(q), r * Math.sin(q)) : sh.lineTo(r * Math.cos(q), r * Math.sin(q))));
  }
  sh.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.max(0.0012, rf * 0.14), 0, 2 * PI, true);
  sh.holes.push(hole);
  for (let i = 0; i < windows; i++) {
    const a0 = (i / windows) * 2 * PI + 0.25;
    const a1 = a0 + (2 * PI) / windows - 0.5;
    const w = new THREE.Path();
    w.absarc(0, 0, rf * 0.78, a0, a1, false);
    w.absarc(0, 0, rf * 0.34, a1, a0, true);
    w.closePath();
    sh.holes.push(w);
  }
  const g = new THREE.ExtrudeGeometry(sh, {depth: th, bevelEnabled: false, curveSegments: 12});
  g.rotateX(-PI / 2);
  return g;
}

export function buildWorld() {
  const root = new THREE.Group();
  const sys = {nucleo: [], aneis: [], escape: [], gaiola: []};
  const tag = (k, o) => {
    o.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        sys[k].push(n);
      }
    });
    return o;
  };

  // ---------------------------------------------------------- materiais da relíquia (não viram pedra: ela é a fonte)
  const obsid = std({color: '#24262c', metalness: 0.55, roughness: 0.4, envMapIntensity: 0.9});
  const gold = std({color: '#b98a3e', metalness: 1, roughness: 0.36, envMapIntensity: 0.8});
  const tickMat = std({color: '#d4a24c', metalness: 1, roughness: 0.3, emissive: ACC, emissiveIntensity: 0});
  const strut = std({color: '#4b3b2a', metalness: 0.8, roughness: 0.45});
  const brass = std({color: '#c9a04a', metalness: 1, roughness: 0.38});
  const walnut = std({color: '#3a2c24', metalness: 0.1, roughness: 0.55});
  const glass = std({color: '#ffffff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4});
  const crystal = std({color: '#ffcf86', metalness: 0, roughness: 0.18, emissive: ACC, emissiveIntensity: 0.3, flatShading: true});

  const relic = new THREE.Group();
  relic.position.set(...CENTER);
  root.add(relic);

  // ---------------------------------------------------------- gaiola geodésica (duas metades) + alça de relógio de bolso
  const cageTop = new THREE.Group();
  const cageBot = new THREE.Group();
  relic.add(cageTop, cageBot);
  {
    const ico = new THREE.IcosahedronGeometry(RDEV, 1);
    ico.rotateZ(0.32);
    const pos = ico.getAttribute('position');
    const keyOf = (v) => v.toArray().map((x) => x.toFixed(4)).join(',');
    const verts = new Map();
    const edges = new Map();
    for (let f = 0; f < pos.count; f += 3) {
      const tri = [0, 1, 2].map((k) => new V3().fromBufferAttribute(pos, f + k));
      tri.forEach((v) => verts.set(keyOf(v), v));
      for (let k = 0; k < 3; k++) {
        const a = tri[k];
        const b = tri[(k + 1) % 3];
        const ka = keyOf(a);
        const kb = keyOf(b);
        edges.set(ka < kb ? ka + '|' + kb : kb + '|' + ka, [a, b]);
      }
    }
    const geo = new THREE.CylinderGeometry(0.0019, 0.0019, 1, 8);
    const halves = [[], []];
    for (const [a, b] of edges.values()) {
      if (Math.abs((a.y + b.y) / 2) > RDEV * 0.86) continue; // abre o topo e a base para os eixos
      halves[(a.y + b.y) / 2 > 0 ? 0 : 1].push([a, b]);
    }
    const q = new THREE.Quaternion();
    const M = new THREE.Matrix4();
    halves.forEach((list, h) => {
      const im = new THREE.InstancedMesh(geo, strut, list.length);
      list.forEach(([a, b], i) => {
        q.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize());
        M.compose(a.clone().add(b).multiplyScalar(0.5), q, new V3(1, a.distanceTo(b), 1));
        im.setMatrixAt(i, M);
      });
      (h ? cageBot : cageTop).add(im);
    });
    const nodes = [...verts.values()].filter((v) => Math.abs(v.y) <= RDEV * 0.93);
    const ng = new THREE.SphereGeometry(0.0042, 12, 8);
    for (const h of [0, 1]) {
      const list = nodes.filter((v) => (h ? v.y <= 0 : v.y > 0));
      const im = new THREE.InstancedMesh(ng, gold, list.length);
      list.forEach((v, i) => {
        M.makeTranslation(v.x, v.y, v.z);
        im.setMatrixAt(i, M);
      });
      (h ? cageBot : cageTop).add(im);
    }
    // anéis de fechamento no topo e na base da gaiola
    for (const [y, g] of [[RDEV * 0.86, cageTop], [-RDEV * 0.86, cageBot]]) {
      const r = Math.sqrt(RDEV * RDEV - y * y);
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0026, 10, 64), gold);
      t.rotation.x = PI / 2;
      t.position.y = y;
      g.add(t);
    }
    // botão e alça no topo
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.014, 32), gold);
    boss.position.y = RDEV * 0.86 + 0.007;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 24), gold);
    crown.position.y = RDEV * 0.86 + 0.02;
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0028, 12, 48), gold);
    bow.position.y = RDEV * 0.86 + 0.042;
    cageTop.add(boss, crown, bow);
    // braços que ligam a gaiola à base
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 2 * PI + PI / 4;
      const p0 = [Math.cos(a) * 0.044, -RDEV * 0.86, Math.sin(a) * 0.044];
      const p1 = [Math.cos(a) * 0.06, -0.088, Math.sin(a) * 0.06];
      cageBot.add(rod(p0, p1, 0.0024, gold));
    }
  }
  tag('gaiola', cageTop);
  tag('gaiola', cageBot);

  // ---------------------------------------------------------- base (coroa) e escapamento
  const base = new THREE.Group();
  relic.add(base);
  {
    const body = new THREE.Mesh(lathe([[0, -0.112], [0.112, -0.112], [0.114, -0.106], [0.108, -0.09], [0.104, -0.088], [0, -0.088]], 96), walnut);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1105, 0.0018, 8, 96), gold);
    rim.rotation.x = PI / 2;
    rim.position.y = -0.1;
    base.add(body, rim);
    // 12 marcas de hora na borda
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * PI;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.009, 0.0024), gold);
      m.position.set(Math.cos(a) * 0.1125, -0.1, Math.sin(a) * 0.1125);
      m.rotation.y = -a;
      base.add(m);
    }
  }
  tag('gaiola', base);

  const gears = new THREE.Group();
  relic.add(gears);
  const G = GEAR;
  const rp = G.z.map((z) => (G.m * z) / 2);
  const gy = -0.088;
  const gpos = [];
  {
    // roda do meio (40) na frente; a de escape (15) à direita; a de 24 dentes à esquerda
    const c2 = [0, 0.07];
    const c1 = [c2[0] + rp[0] + rp[1], c2[1]];
    const c3 = [c2[0] - (rp[1] + rp[2]), c2[1]];
    gpos.push(c1, c2, c3);
    const geos = [gearGeo(15, G.m, 0.0028, 0), gearGeo(40, G.m, 0.0028, 5), gearGeo(24, G.m, 0.0028, 4)];
    gpos.forEach(([x, z], i) => {
      const g = new THREE.Mesh(geos[i], brass);
      g.position.set(x, gy + 0.0035, z);
      gears.add(g);
      const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.012, 12), gold);
      ax.position.set(x, gy + 0.005, z);
      gears.add(ax);
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0035, 16), gold);
      bridge.position.set(x, gy + 0.0012, z);
      gears.add(bridge);
    });
    // âncora: uma barra com duas paletas, pivô atrás da roda de escape
    const anchor = new THREE.Group();
    const ap = [c1[0] + 0.004, c1[1] + rp[0] + 0.009];
    anchor.position.set(ap[0], gy + 0.0045, ap[1]);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.0022, 0.0028), gold);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0022, 0.012), gold);
    stem.position.z = 0.006;
    const pal1 = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0022, 0.006), tickMat);
    pal1.position.set(-0.0105, 0, -0.003);
    const pal2 = pal1.clone();
    pal2.position.x = 0.0105;
    const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.008, 12), gold);
    anchor.add(bar, stem, pal1, pal2, piv);
    gears.add(anchor);
    gears.userData = {geo: gears.children.filter((n) => n.geometry && n.geometry.type === 'ExtrudeGeometry'), anchor, c: gpos};
  }
  tag('escape', gears);

  // ---------------------------------------------------------- os três anéis do cardã
  const R_O = 0.078;
  const R_M = 0.064;
  const R_I = 0.05;
  const R_C = 0.034;
  const T = 0.00225;
  const W = 0.0052;
  const pivO = new THREE.Group();
  const pivM = new THREE.Group();
  const pivI = new THREE.Group();
  const coreG = new THREE.Group();
  relic.add(pivO);
  pivO.add(pivM);
  pivM.add(pivI);
  pivI.add(coreG);
  const ticks = (r, n, long, grp) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI;
      const big = i % long === 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.0034 : 0.0018, 0.0016, big ? 0.008 : 0.0055), tickMat);
      m.position.set(Math.cos(a) * (r + T + 0.0006), Math.sin(a) * (r + T + 0.0006), 0);
      m.rotation.z = a;
      grp.add(m);
    }
  };
  pivO.add(new THREE.Mesh(band(R_O, T, W), obsid));
  ticks(R_O, 60, 5, pivO);
  pivO.add(rod([R_M + T, 0, 0], [R_O - T, 0, 0], 0.0017, gold), rod([-(R_M + T), 0, 0], [-(R_O - T), 0, 0], 0.0017, gold));
  pivM.add(new THREE.Mesh(band(R_M, T, W * 0.92), obsid));
  ticks(R_M, 24, 6, pivM);
  pivM.add(rod([0, R_I + T, 0], [0, R_M - T, 0], 0.0016, gold), rod([0, -(R_I + T), 0], [0, -(R_M - T), 0], 0.0016, gold));
  pivI.add(new THREE.Mesh(band(R_I, T, W * 0.85), obsid));
  ticks(R_I, 12, 3, pivI);
  pivI.add(rod([R_C, 0, 0], [R_I - T, 0, 0], 0.0015, gold), rod([-R_C, 0, 0], [-(R_I - T), 0, 0], 0.0015, gold));
  // eixos fixos da gaiola até o anel externo (em cima e embaixo)
  const axles = new THREE.Group();
  axles.add(rod([0, R_O + T, 0], [0, RDEV * 0.86 + 0.002, 0], 0.0019, gold), rod([0, -(R_O + T), 0], [0, -0.088, 0], 0.0019, gold));
  relic.add(axles);
  tag('aneis', pivO);
  tag('gaiola', axles);

  // ---------------------------------------------------------- núcleo: esfera de vidro + cristal bipiramidal
  {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(R_C, 48, 32), glass);
    sph.castShadow = false;
    sph.renderOrder = 2;
    const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.024, 6), crystal);
    const tipU = new THREE.Mesh(new THREE.ConeGeometry(0.0105, 0.016, 6), crystal);
    tipU.position.y = 0.02;
    const tipD = tipU.clone();
    tipD.rotation.x = PI;
    tipD.position.y = -0.02;
    const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.004, 16), gold);
    cap1.rotation.z = PI / 2;
    cap1.position.x = R_C;
    const cap2 = cap1.clone();
    cap2.position.x = -R_C;
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0012, 8, 48), gold);
    cradle.rotation.x = PI / 2;
    coreG.add(prism, tipU, tipD, cap1, cap2, cradle, sph);
  }
  tag('nucleo', coreG);
  coreG.traverse((n) => n.isMesh && n.material === glass && (n.castShadow = false));
  sys.nucleo.forEach((m) => {
    const i = sys.aneis.indexOf(m);
    if (i >= 0) sys.aneis.splice(i, 1);
  });
  const coreLight = new THREE.PointLight(ACC, 0, 0.6, 2);
  relic.add(coreLight);

  // ---------------------------------------------------------- palco: chão redondo e pedestal (viram pedra)
  const stage = new THREE.Group();
  root.add(stage);
  {
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.012, 128), pstd({color: '#dddad3', roughness: 0.75, metalness: 0}));
    floor.position.y = -0.006;
    floor.receiveShadow = true;
    const plinth = new THREE.Mesh(lathe([[0, 0], [0.125, 0], [0.125, 0.012], [0.112, 0.02], [0.105, PLINTH - 0.016], [0.128, PLINTH - 0.008], [0.128, PLINTH], [0, PLINTH]], 96), pstd({color: '#e8e4dc', roughness: 0.55, metalness: 0}));
    plinth.castShadow = plinth.receiveShadow = true;
    stage.add(floor, plinth);
  }

  // ---------------------------------------------------------- 1. flor no vaso
  const flor = new THREE.Group();
  flor.position.set(-0.4, 0, 0.02);
  root.add(flor);
  const florHead = new THREE.Group();
  const florStem = new THREE.Group();
  {
    const pot = new THREE.Mesh(lathe([[0, 0], [0.036, 0], [0.046, 0.075], [0.052, 0.078], [0.052, 0.09], [0.044, 0.09], [0.04, 0.08]], 48), pstd({color: '#c4683f', roughness: 0.7}));
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.042, 32), pstd({color: '#4a3528', roughness: 1}));
    soil.rotation.x = -PI / 2;
    soil.position.y = 0.081;
    flor.add(pot, soil);
    florStem.position.y = 0.081;
    flor.add(florStem);
    const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0.006, 0.06, 0.004), new V3(-0.004, 0.12, 0.01), new V3(0.004, 0.17, 0.018)]);
    const green = pstd({color: '#4f8a3a', roughness: 0.6});
    florStem.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.0032, 8), green));
    for (const [y, a, s] of [[0.05, 0.5, 1], [0.09, -2.4, 0.85]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 10), green);
      leaf.scale.set(1, 0.18, 0.42);
      leaf.position.set(Math.cos(a) * 0.022 * s, y, Math.sin(a) * 0.022 * s);
      leaf.rotation.set(0, -a, 0.5);
      florStem.add(leaf);
    }
    florHead.position.copy(curve.getPoint(1));
    florHead.rotation.set(0.85, 0.5, 0);
    florStem.add(florHead);
    const petal = pstd({color: '#d8508a', roughness: 0.55});
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 2 * PI;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10), petal);
      p.scale.set(1, 0.16, 0.42);
      p.position.set(Math.cos(a) * 0.019, 0, Math.sin(a) * 0.019);
      p.rotation.set(0, -a, 0.22);
      florHead.add(p);
    }
    const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 10), pstd({color: '#f2c234', roughness: 0.8}));
    ctr.scale.y = 0.6;
    ctr.position.y = 0.003;
    florHead.add(ctr);
  }

  // ---------------------------------------------------------- 2. borboleta
  const bfly = new THREE.Group();
  root.add(bfly);
  const wings = [];
  {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.026, 4, 10), pstd({color: '#2b2622', roughness: 0.6}));
    body.rotation.x = PI / 2;
    bfly.add(body);
    const wingShape = (w, h, off) => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(w * 0.3, h * 0.9 + off, w * 1.05, h * 1.0 + off, w, h * 0.35 + off);
      s.bezierCurveTo(w * 0.95, off * 0.4, w * 0.4, -h * 0.05, 0, 0);
      return new THREE.ShapeGeometry(s, 16);
    };
    const up = pstd({color: '#2a9d9a', roughness: 0.5, side: THREE.DoubleSide});
    const lo = pstd({color: '#f08a24', roughness: 0.5, side: THREE.DoubleSide});
    for (const side of [1, -1]) {
      const hinge = new THREE.Group();
      const g1 = wingShape(0.034, 0.03, 0.002);
      const g2 = wingShape(0.024, -0.022, -0.002);
      const w1 = new THREE.Mesh(g1, up);
      const w2 = new THREE.Mesh(g2, lo);
      for (const w of [w1, w2]) {
        w.rotation.x = -PI / 2;
        w.scale.x = side;
        hinge.add(w);
      }
      hinge.userData.side = side;
      bfly.add(hinge);
      wings.push(hinge);
    }
    for (const side of [1, -1]) {
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.014, 4), pstd({color: '#2b2622'}));
      an.position.set(side * 0.003, 0.004, -0.019);
      an.rotation.set(-0.9, 0, side * 0.35);
      bfly.add(an);
    }
  }

  // ---------------------------------------------------------- 3. ampulheta
  const amp = new THREE.Group();
  amp.position.set(0.3, 0.08, 0.3);
  root.add(amp);
  const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.029, 0.05, 32), pstd({color: '#e3c27a', roughness: 0.9}));
  const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.045, 32), pstd({color: '#e3c27a', roughness: 0.9}));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), pstd({color: '#d9b56a', roughness: 0.9}));
  {
    const wood = pstd({color: '#7a5233', roughness: 0.6});
    for (const y of [0.075, -0.075]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.01, 40), wood);
      d.position.y = y;
      amp.add(d);
    }
    for (let i = 0; i < 3; i++) {
      const a = PI / 2 + (i / 3) * 2 * PI;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.14, 12), wood);
      p.position.set(Math.cos(a) * 0.038, 0, Math.sin(a) * 0.038);
      amp.add(p);
    }
    const prof = [];
    for (let i = 0; i <= 40; i++) {
      const y = -0.07 + (i / 40) * 0.14;
      const u = Math.abs(y) / 0.07;
      const r = 0.0042 + 0.03 * Math.sin(Math.min(1, u * 1.08) * PI * 0.62) - 0.012 * Math.max(0, u - 0.85) / 0.15;
      prof.push([Math.max(0.004, r), y]);
    }
    const gl = new THREE.Mesh(lathe(prof, 48), pstd({color: '#ffffff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false}));
    gl.renderOrder = 2;
    amp.add(sandTop, sandBot, stream, gl);
    sandTop.rotation.x = PI;
  }

  // ---------------------------------------------------------- 4. gotas: torneira de bronze e bacia
  const GT = {x: 0.36, z: -0.32, y0: 0.398, y1: 0.036};
  const dropsG = new THREE.Group();
  root.add(dropsG);
  const drops = [];
  const ripples = [];
  {
    const bronze = pstd({color: '#9c6a3a', metalness: 0.9, roughness: 0.35});
    dropsG.add(rod([GT.x, 0, GT.z - 0.08], [GT.x, 0.43, GT.z - 0.08], 0.006, bronze));
    dropsG.add(rod([GT.x, 0.425, GT.z - 0.08], [GT.x, 0.425, GT.z], 0.0045, bronze));
    dropsG.add(rod([GT.x, 0.428, GT.z], [GT.x, 0.4, GT.z], 0.004, bronze));
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 6), bronze);
    knob.position.set(GT.x, 0.433, GT.z - 0.04);
    dropsG.add(knob);
    const footing = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.008, 32), bronze);
    footing.position.set(GT.x, 0.004, GT.z - 0.08);
    dropsG.add(footing);
    const bowl = new THREE.Mesh(lathe([[0, 0], [0.04, 0], [0.068, 0.03], [0.074, 0.046], [0.07, 0.046], [0.062, 0.032], [0.036, 0.006], [0, 0.006]], 64), pstd({color: '#dfe6ea', roughness: 0.35}));
    bowl.position.set(GT.x, 0, GT.z);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.066, 48), pstd({color: '#7fb3d4', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85}));
    water.rotation.x = -PI / 2;
    water.position.set(GT.x, GT.y1, GT.z);
    dropsG.add(bowl, water);
    const dm = pstd({color: '#86bde0', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.9});
    for (let i = 0; i < 4; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 14, 10), dm);
      d.castShadow = true;
      dropsG.add(d);
      drops.push(d);
    }
    const rm = new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false});
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), rm.clone());
      r.rotation.x = -PI / 2;
      r.position.set(GT.x, GT.y1 + 0.0008, GT.z);
      dropsG.add(r);
      ripples.push(r);
    }
  }
  for (const g of [flor, bfly, amp, dropsG]) g.traverse((n) => n.isMesh && n.material.type !== 'MeshBasicMaterial' && ((n.castShadow = true), (n.receiveShadow = true)));

  // ---------------------------------------------------------- a onda de estase
  const waveMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {uCol: {value: new THREE.Color(ACC)}, uA: {value: 0}},
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vP = wp.xyz; vN = normalize(mat3(modelMatrix)*normal);
      vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = pow(clamp(1.0-abs(dot(vN,vV)),0.0,1.0), 2.4);
      float b = 0.5+0.5*sin(vP.y*150.0);
      float a = uA*(0.05 + 0.6*f)*(0.7+0.3*b);
      gl_FragColor = vec4(uCol, a); }`,
  });
  const wave = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), waveMat);
  wave.position.set(...CENTER);
  wave.renderOrder = 3;
  root.add(wave);
  const ringMat = new THREE.MeshBasicMaterial({color: ACC, transparent: true, opacity: 0, depthWrite: false});
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), ringMat);
  floorRing.rotation.x = -PI / 2;
  floorRing.position.y = 0.0012;
  root.add(floorRing);

  // ---------------------------------------------------------- frequências que fecham o laço
  const jF = SUBJ.findIndex((o) => o.k === 'flor');
  const jB = SUBJ.findIndex((o) => o.k === 'borboleta');
  const jA = SUBJ.findIndex((o) => o.k === 'ampulheta');
  const jG = SUBJ.findIndex((o) => o.k === 'gotas');
  const fSway = loopFreq(0.35, SUBJ_TOTAL[jF]);
  const fFlap = loopFreq(6, SUBJ_TOTAL[jB]);
  const fFly = loopFreq(0.22, SUBJ_TOTAL[jB]);
  const DRIP = SUBJ_TOTAL[jG] / Math.round(SUBJ_TOTAL[jG] / 0.17);
  const TFALL = Math.sqrt((2 * (GT.y0 - GT.y1)) / 9.81);
  const ampStart = subjClock(jA, 0.06);
  const ampSpan = SUBJ_TOTAL[jA] - ampStart;

  const E = {cageTop, cageBot, base, gears, pivM, pivI, coreG};
  const dir = new V3();

  // ---------------------------------------------------------- pose de um instante
  function update(S, ops = {}) {
    const ex = ops.explode ?? 0;
    const s = S.s;
    // relíquia
    pivO.rotation.y = S.rings[0];
    pivM.rotation.x = S.rings[1];
    pivI.rotation.y = S.rings[2];
    // explosão: a base fica, as rodas sobem, a tampa da gaiola sobe, os anéis e o núcleo saem para a frente
    E.cageTop.position.y = 0.14 * ex;
    E.cageBot.position.y = 0;
    axles.visible = ex < 0.05;
    E.base.position.y = 0;
    E.gears.position.y = 0.03 * ex;
    pivO.position.z = 0.13 * ex;
    E.pivM.position.z = 0.07 * ex;
    E.pivI.position.z = 0.07 * ex;
    E.coreG.position.z = 0.07 * ex;
    const [g1, g2, g3] = gears.userData.geo;
    const c = gears.userData.c;
    const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    const th1 = S.esc;
    const P2 = (2 * PI) / GEAR.z[1];
    const P3 = (2 * PI) / GEAR.z[2];
    const th2 = -(GEAR.z[0] / GEAR.z[1]) * (th1 - ang(c[0], c[1])) + ang(c[1], c[0]) - P2 / 2;
    const th3 = -(GEAR.z[1] / GEAR.z[2]) * (th2 - ang(c[1], c[2])) + ang(c[2], c[1]) - P3 / 2;
    g1.rotation.y = th1;
    g2.rotation.y = th2;
    g3.rotation.y = th3;
    gears.userData.anchor.rotation.y = S.anchor;
    // acento: o cristal na carga, as marcas na trava
    crystal.emissiveIntensity = 0.25 + 1.4 * S.charge;
    coreLight.intensity = 0.06 * S.charge;
    tickMat.emissiveIntensity = 0.85 * S.lock;

    // onda
    const R = S.R;
    PU.uR.value = R;
    wave.visible = R > 0.004 && !ops.iso;
    wave.scale.setScalar(Math.max(0.001, R));
    const inOnda = s > 0.42 && s < 0.66;
    waveMat.uniforms.uA.value = (inOnda ? 0.6 : 0.25) * clamp(R / 0.05, 0, 1);
    const fr = R > CENTER[1] ? Math.sqrt(R * R - CENTER[1] * CENTER[1]) : 0;
    floorRing.visible = fr > 0.005 && !ops.iso;
    floorRing.scale.setScalar(Math.max(0.001, fr));
    ringMat.opacity = (inOnda ? 0.85 : 0.35) * clamp(fr / 0.05, 0, 1);

    // flor
    const tF = subjClock(jF, s);
    florStem.rotation.z = 0.07 * Math.sin(2 * PI * fSway * tF);
    florStem.rotation.x = 0.04 * Math.sin(2 * PI * fSway * tF * 2 + 1);
    florHead.rotation.y = 0.5 + 0.12 * Math.sin(2 * PI * fSway * tF);
    // borboleta
    const tB = subjClock(jB, s);
    const pb = SUBJ[jB].pos;
    const q = 2 * PI * fFly * tB;
    bfly.position.set(pb[0] + 0.055 * Math.cos(q), pb[1] + 0.018 * Math.sin(2 * q), pb[2] + 0.035 * Math.sin(q));
    dir.set(-0.055 * Math.sin(q), 0.036 * Math.cos(2 * q), 0.035 * Math.cos(q)).normalize();
    bfly.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0);
    bfly.rotateX(-0.25 - dir.y * 0.6);
    const flap = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(2 * PI * fFlap * tB));
    for (const w of wings) w.rotation.z = w.userData.side * (-0.1 + flap * 1.1);
    // ampulheta
    let fallen;
    if (s < 0.06) {
      amp.rotation.z = PI * sm(0, 0.06, s);
      fallen = 1;
    } else {
      amp.rotation.z = 0;
      fallen = clamp((subjClock(jA, s) - ampStart) / ampSpan, 0, 1);
    }
    const a = Math.cbrt(Math.max(0.0001, 1 - fallen));
    const b = Math.cbrt(Math.max(0.0001, fallen));
    sandTop.scale.set(a, a, a);
    sandTop.position.y = 0.0045 + 0.025 * a;
    sandTop.visible = fallen < 0.999;
    sandBot.scale.set(b, b, b);
    sandBot.position.y = -0.068 + 0.0225 * b;
    sandBot.visible = fallen > 0.001;
    const pile = -0.068 + 0.045 * b;
    stream.visible = s >= 0.06 && fallen > 0.002 && fallen < 0.998;
    stream.scale.y = Math.max(0.001, 0.004 - pile);
    stream.position.y = (0.004 + pile) / 2;
    // gotas
    const tG = subjClock(jG, s);
    const k0 = Math.floor(tG / DRIP);
    drops.forEach((d, i) => {
      const age = tG - (k0 - i) * DRIP;
      if (age >= 0 && age < TFALL) {
        const v = 9.81 * age;
        d.visible = true;
        d.position.set(GT.x, GT.y0 - 0.5 * 9.81 * age * age, GT.z);
        d.scale.set(1, 1 + Math.min(1.3, v * 0.35), 1);
      } else d.visible = false;
    });
    ripples.forEach((r, i) => {
      const age = tG - (k0 - i) * DRIP - TFALL;
      const life = 0.5;
      if (age >= 0 && age < life) {
        r.visible = true;
        r.scale.setScalar(0.006 + 0.05 * (age / life));
        r.material.opacity = 0.7 * (1 - age / life);
      } else r.visible = false;
    });

    // isolar um sistema
    const iso = ops.iso || null;
    for (const k of Object.keys(sys)) for (const m of sys[k]) m.visible = !iso || k === iso;
    if (iso) axles.visible = false;
    stage.visible = !iso;
    for (const g of [flor, bfly, amp, dropsG]) g.visible = !iso && !ops.close;
    coreLight.visible = !iso || iso === 'nucleo';
  }

  // pontos do mundo para as legendas
  const tmp = new V3();
  const anchors = () => {
    const at = (obj, x, y, z) => obj.localToWorld(tmp.set(x, y, z)).toArray();
    return {
      nucleo: at(coreG, 0.0, 0.02, 0),
      aneis: at(pivO, Math.cos(0.7) * (R_O + 0.003), Math.sin(0.7) * (R_O + 0.003), 0),
      escape: at(gears, gpos[0][0], -0.084, gpos[0][1]),
      gaiola: at(cageTop, -0.06, 0.055, 0.035),
      flor: at(florHead, 0, 0.01, 0),
      borboleta: bfly.position.toArray(),
      ampulheta: at(amp, 0, 0.08, 0),
      gotas: [GT.x, 0.3, GT.z],
    };
  };
  return {root, update, anchors, sys};
}
