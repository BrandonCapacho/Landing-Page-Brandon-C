// Pointer Events: un solo camino de código para mouse y touch.

import * as THREE from 'three';
import { AJUSTES } from './config.js';

const UMBRAL_ARRASTRE = 6; // px antes de considerarlo arrastre y no toque
const DURACION_TOQUE = 350; // ms

export function conectarInteraccion({ canvas, camara, controles, constelacion, panel, pedirRender, esMovil }) {
  const raycaster = new THREE.Raycaster();
  // Los secundarios son un THREE.Points, no mallas: el "objetivo de
  // clic" de ese nivel es este umbral, un radio en unidades de mundo.
  // Crece y decrece con el tamaño visual del punto solo, que es justo
  // lo que se quiere para un objetivo táctil.
  raycaster.params.Points.threshold = esMovil ? AJUSTES.umbralPuntosMovil : AJUSTES.umbralPuntos;
  const ndc = new THREE.Vector2();
  const plano = new THREE.Plane();
  const desfase = new THREE.Vector3();
  const _punto = new THREE.Vector3();
  const _normal = new THREE.Vector3();
  const _ultima = new THREE.Vector3();

  let idActivo = null;
  let nodoActivo = null;
  let xInicio = 0, yInicio = 0, tInicio = 0, tUltima = 0;
  let movido = false;
  let nodoHover = null;

  function aNDC(e) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  // Dos pasadas: mallas invisibles para centro+principales, y el
  // Points de los secundarios. En un empate gana el principal — es el
  // objetivo grande y el que lleva la etiqueta siempre visible.
  function golpear(e) {
    aNDC(e);
    raycaster.setFromCamera(ndc, camara);
    const pri = raycaster.intersectObjects(constelacion.golpes, false)[0] || null;
    const sec = constelacion.puntos
      ? raycaster.intersectObject(constelacion.puntos, false)[0] || null
      : null;
    if (!pri) return sec ? constelacion.secundarios[sec.index] : null;
    if (!sec) return pri.object.userData.nodo;
    return pri.distance <= sec.distance + AJUSTES.sesgoPrincipal
      ? pri.object.userData.nodo
      : constelacion.secundarios[sec.index];
  }

  function terminarArrastre(nodo) {
    if (nodo && !nodo.esCentro) {
      nodo.arrastrando = false;
      nodo.resaltado = false;
      if (!nodo.esPrincipal) constelacion.establecerResaltado(null);
    }
    idActivo = null;
    nodoActivo = null;
    controles.enabled = true;
    canvas.style.cursor = 'default';
  }

  // Fase de captura: corre ANTES del listener que OrbitControls
  // registra sobre este mismo elemento, así podemos apagarlo antes
  // de que empiece a orbitar.
  function alBajar(e) {
    if (idActivo !== null) return; // un segundo dedo no secuestra el arrastre
    const nodo = golpear(e);
    if (!nodo) return; // no dio en un nodo: que orbite la cámara

    e.stopPropagation();
    controles.enabled = false;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch { /* algunos navegadores lo rechazan en punteros sintéticos */ }

    idActivo = e.pointerId;
    nodoActivo = nodo;
    xInicio = e.clientX;
    yInicio = e.clientY;
    tInicio = tUltima = performance.now();
    movido = false;

    if (!nodoActivo.esCentro) {
      nodoActivo.arrastrando = true;
      nodoActivo.resaltado = true;
      canvas.style.cursor = 'grabbing';
      // En móvil, arrastrar un secundario lo nombra con el globo sin
      // abrir el panel — el mismo camino de código sirve para el clic
      // sostenido en escritorio, porque Pointer Events unifica ambos.
      if (!nodoActivo.esPrincipal) constelacion.establecerResaltado(nodoActivo);

      // Plano paralelo a la pantalla que pasa por el nodo. Se construye
      // una sola vez aquí: recalcularlo mientras la cámara gira hace
      // que el nodo se deslice de lado.
      camara.getWorldDirection(_normal);
      plano.setFromNormalAndCoplanarPoint(_normal, nodoActivo.pos);

      // Desfase de agarre: el nodo no salta a centrarse bajo el cursor.
      if (raycaster.ray.intersectPlane(plano, _punto)) {
        desfase.subVectors(nodoActivo.pos, _punto);
      } else {
        desfase.set(0, 0, 0);
      }
      _ultima.copy(nodoActivo.pos);
    }
    pedirRender();
  }

  function alMover(e) {
    if (e.pointerId !== idActivo) {
      if (idActivo === null && !esMovil) actualizarHover(e);
      return;
    }
    if (!movido && Math.hypot(e.clientX - xInicio, e.clientY - yInicio) > UMBRAL_ARRASTRE) {
      movido = true;
      ocultarPista();
    }
    if (!nodoActivo || nodoActivo.esCentro) return;

    aNDC(e);
    raycaster.setFromCamera(ndc, camara);
    if (!raycaster.ray.intersectPlane(plano, _punto)) return; // rayo paralelo al plano

    _punto.add(desfase);
    _punto.clampLength(0, AJUSTES.radioMax);

    const ahora = performance.now();
    const dt = Math.max((ahora - tUltima) / 1000, 1 / 240);
    nodoActivo.vel.subVectors(_punto, _ultima).divideScalar(dt).clampLength(0, 12);
    nodoActivo.pos.copy(_punto);
    _ultima.copy(_punto);
    tUltima = ahora;
    pedirRender();
  }

  function alSubir(e) {
    if (e.pointerId !== idActivo) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch { /* ya liberado */ }

    const nodo = nodoActivo;
    const fueToque = !movido && performance.now() - tInicio < DURACION_TOQUE;

    if (nodo && fueToque) {
      if (nodo.vel) nodo.vel.set(0, 0, 0);
      panel.abrir(nodo.datos);
      ocultarPista();
    } else if (nodo && nodo.vel) {
      nodo.vel.multiplyScalar(0.6); // soltar con impulso amortiguado
    }
    terminarArrastre(nodo);
    pedirRender();
  }

  let tHover = 0;
  function actualizarHover(e) {
    // Un raycast por evento de movimiento es innecesario; 60 ms basta.
    // El golpe en dos pasadas (mallas + Points) sale en ~0.1-0.15 ms,
    // así que este mismo estrangulamiento sigue sobrando de sobra.
    const ahora = performance.now();
    if (ahora - tHover < 60) return;
    tHover = ahora;

    const nodo = golpear(e);
    if (nodo !== nodoHover) {
      if (nodoHover && !nodoHover.esCentro) nodoHover.resaltado = false;
      if (nodo && !nodo.esCentro) nodo.resaltado = true;
      if (nodoHover?.etiqueta) nodoHover.etiqueta.element.classList.remove('activa');
      if (nodo?.etiqueta) nodo.etiqueta.element.classList.add('activa');
      // El globo y el resaltador son solo para un secundario de verdad;
      // sobre un principal o el centro, que se apague si estaba prendido.
      constelacion.establecerResaltado(nodo && !nodo.esPrincipal && !nodo.esCentro ? nodo : null);
      nodoHover = nodo;
      pedirRender();
    }
    canvas.style.cursor = nodo ? 'grab' : 'default';
  }

  let pista = document.getElementById('pista');
  function ocultarPista() {
    if (pista) {
      pista.style.opacity = '0';
      pista = null;
    }
  }

  canvas.addEventListener('pointerdown', alBajar, { capture: true });
  canvas.addEventListener('pointermove', alMover);
  // Los tres son necesarios: si una llamada entrante cancela el toque y
  // solo escuchamos 'pointerup', controles.enabled se queda en false
  // para siempre y la cámara deja de responder.
  canvas.addEventListener('pointerup', alSubir);
  canvas.addEventListener('pointercancel', alSubir);
  canvas.addEventListener('lostpointercapture', alSubir);

  if (!esMovil) {
    canvas.addEventListener('pointerleave', () => {
      if (idActivo === null && nodoHover) {
        if (!nodoHover.esCentro) nodoHover.resaltado = false;
        nodoHover.etiqueta?.element.classList.remove('activa');
        if (!nodoHover.esPrincipal && !nodoHover.esCentro) constelacion.establecerResaltado(null);
        nodoHover = null;
        canvas.style.cursor = 'default';
      }
    });
  }
}

/** Panel del mensaje: DOM normal, no un objeto 3D. */
export function crearPanel() {
  const panel = document.getElementById('panel');
  const fondo = document.getElementById('fondo-panel');
  const titulo = document.getElementById('panel-titulo');
  const texto = document.getElementById('panel-texto');
  const cerrarBtn = document.getElementById('panel-cerrar');
  let ultimoFoco = null;
  let tAbierto = 0;

  function abrir(datos) {
    titulo.textContent = datos.titulo;
    texto.textContent = datos.texto;
    tAbierto = performance.now();
    ultimoFoco = document.activeElement;
    fondo.hidden = false;
    panel.hidden = false;
    // Un frame para que la transición de opacidad tenga de dónde partir.
    requestAnimationFrame(() => {
      fondo.classList.add('visible');
      panel.classList.add('visible');
      panel.focus();
    });
  }

  function cerrar() {
    if (panel.hidden) return;
    fondo.classList.remove('visible');
    panel.classList.remove('visible');
    const fin = () => {
      panel.hidden = true;
      fondo.hidden = true;
    };
    setTimeout(fin, 300);
    ultimoFoco?.focus?.();
  }

  cerrarBtn.addEventListener('click', cerrar);
  fondo.addEventListener('click', () => {
    // Al abrir con un toque, el navegador sintetiza un `click` sobre lo
    // que quedó debajo del dedo — que ahora es este fondo. Sin esta
    // guarda el panel se cerraría solo en el mismo gesto que lo abrió.
    if (performance.now() - tAbierto < 400) return;
    cerrar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrar();
  });

  return { abrir, cerrar, get abierto() { return !panel.hidden; } };
}
