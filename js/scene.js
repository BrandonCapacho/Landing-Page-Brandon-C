// Cámara, fondo de estrellas y la textura de halo compartida.
// Nada de esto carga archivos: la textura se dibuja en un canvas
// en tiempo de ejecución, así que no hay rutas que se puedan romper.

import * as THREE from 'three';
import { AJUSTES } from './config.js';

/** Degradado radial blanco → transparente, 128×128, generado una sola vez. */
export function crearTexturaHalo() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Distancia de cámara que garantiza que la constelación entre completa.
 * Se calcula desde las dos dimensiones reales (la esfera está achatada),
 * y se queda con la más exigente. Así el retrato se resuelve solo.
 */
export function distanciaEncuadre(camara, esMovil) {
  const a = esMovil ? AJUSTES.achatadoMovil : AJUSTES.achatado;
  const m = esMovil ? AJUSTES.margenEncuadreMovil : AJUSTES.margenEncuadre;
  const semiAncho = AJUSTES.radioHogar * a.x + m.x;
  const semiAlto = AJUSTES.radioHogar * a.y + m.y;

  const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  const tanH = tanV * camara.aspect;
  return Math.max(semiAlto / tanV, semiAncho / tanH);
}

export function crearCamara(ancho, alto, esMovil) {
  const camara = new THREE.PerspectiveCamera(58, ancho / alto, 0.1, 200);
  camara.position.set(0, 0, distanciaEncuadre(camara, esMovil));
  camara.lookAt(0, 0, 0);
  return camara;
}

/** Campo de estrellas: un solo THREE.Points con colores por vértice. */
export function crearEstrellas(texturaHalo, esMovil) {
  const n = esMovil ? AJUSTES.estrellasMovil : AJUSTES.estrellas;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const azul = new THREE.Color(0x8fa8ff);
  const rosa = new THREE.Color(0xffc9e6);
  const c = new THREE.Color();
  const v = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    // Dirección uniforme sobre la esfera, radio en la cáscara [40, 90].
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    v.set(Math.cos(th) * r, u, Math.sin(th) * r).multiplyScalar(40 + Math.random() * 50);
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;

    c.copy(azul).lerp(rosa, Math.random());
    const brillo = 0.35 + Math.random() * 0.65;
    col[i * 3] = c.r * brillo;
    col[i * 3 + 1] = c.g * brillo;
    col[i * 3 + 2] = c.b * brillo;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const puntos = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.45,
      sizeAttenuation: true,
      map: texturaHalo,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })
  );

  const grupo = new THREE.Group();
  grupo.add(puntos);
  return grupo;
}
