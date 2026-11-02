// O estúdio do Cronolito: fundo claro em degradê, caixas de luz para o metal brilhar, uma sombra macia no chão.
// frame(state, cam, ops) posa o mundo e desenha um quadro. project(x, y, z) devolve o ponto na tela 1600×900.
import * as THREE from 'three';
import {buildWorld} from './reliquia.js';

const V3 = THREE.Vector3;
export const BG = {top: '#f4f3f1', mid: '#eae9e6', low: '#e2e1dd'};

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, BG.top);
    gr.addColorStop(0.55, BG.mid);
    gr.addColorStop(1, BG.low);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }
  // estúdio para os reflexos: uma caixa grande em cima, duas tiras laterais, um rebatedor quente
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#d8d7d4');
    const box = (w, h, pos, col, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(12, 12, new V3(0, 14, 2), '#ffffff', 2.6);
    box(3, 14, new V3(-12, 4, 6), '#ffffff', 3.2);
    box(3, 14, new V3(12, 4, -4), '#ffffff', 2.0);
    box(18, 2, new V3(0, 2, 14), '#ffe2bd', 1.5);
    const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: '#c6c5c1', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -2;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    pm.dispose();
  }
  const sun = new THREE.DirectionalLight('#ffffff', 2.1);
  sun.position.set(-1.4, 3.4, 1.9);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -0.95, right: 0.95, top: 0.95, bottom: -0.95, near: 1, far: 8});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.0015;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfcdc8', 0.75));

  const world = buildWorld();
  scene.add(world.root);

  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.02, 40);
  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  // cam: alvo (tx, ty, tz), azimute a partir de +z, elevação (rad), distância (m), deslocamento na tela sx/sy (px)
  const place = (cam) => {
    const {tx, ty, tz, az, el, d} = cam;
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
  };
  const frame = (S, cam, ops = {}) => {
    world.update(S, ops);
    place(cam);
    renderer.render(scene, camera);
  };
  const pv = new V3();
  const project = (p) => {
    pv.set(p[0], p[1], p[2]).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setShadow = (n) => {
    sun.shadow.mapSize.set(n, n);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  };
  return {renderer, scene, camera, world, resize, frame, project, size, setShadow};
}
