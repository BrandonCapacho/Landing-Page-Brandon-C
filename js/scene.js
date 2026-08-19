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
 * Núcleo nítido y caída rápida: una razón tiene que leerse como una
 * lucecita, con borde. El perfil es apenas más ancho que el original y
 * MUCHO más estrecho que el segundo intento: ensanchar el resplandor
 * para hacerlas más visibles fue un error, porque con mezcla aditiva
 * el halo de cien puntos se suma y lo que se consigue es una niebla
 * lila en la que ya no se distingue nada. Lo que las hace visibles es
 * el color y el contraste con el fondo, no el área.
 */
export function crearTexturaPunto() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.11, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.24, 'rgba(255,255,255,0.3)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.06)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const FOV = 58;

/**
 * Distancia de cámara que garantiza que la constelación entre completa.
 * `extension` es la mitad-ancho/alto/radio REAL medida por Constelacion
 * tras generar los racimos — con racimos, un radio analítico ya no
 * significa nada, así que ya no se adivina.
 */
export function distanciaEncuadre(camara, esMovil, extension) {
  const m = esMovil ? AJUSTES.margenEncuadreMovil : AJUSTES.margenEncuadre;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  const tanH = tanV * camara.aspect;
  return Math.max((extension.y + m.y) / tanV, (extension.x + m.x) / tanH);
}

/**
 * Distancia a la que UN racimo llena la pantalla. `alcance` es el medio
 * ancho y medio alto del racimo ya desplegado, medidos desde su centro
 * por Constelacion al construirse.
 */
export function distanciaRacimo(camara, esMovil, alcance) {
  const m = esMovil ? AJUSTES.margenRacimoMovil : AJUSTES.margenRacimo;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  const tanH = tanV * camara.aspect;
  return Math.max((alcance.y + m.y) / tanV, (alcance.x + m.x) / tanH);
}

export function crearCamara(ancho, alto, esMovil, extension) {
  const camara = new THREE.PerspectiveCamera(FOV, ancho / alto, 0.1, 200);
  camara.position.set(0, 0, distanciaEncuadre(camara, esMovil, extension));
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
    const brillo =
      AJUSTES.estrellaBrilloMin +
      Math.random() * (AJUSTES.estrellaBrilloMax - AJUSTES.estrellaBrilloMin);
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
      size: AJUSTES.estrellaTam,
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
