// Arranque: detecta WebGL, monta la escena y lleva el bucle.

import { MENSAJES, CENTRO, TEXTOS, AJUSTES, SECUNDARIOS, limitesRacimo } from './config.js';

const esMovil = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
// Comprobado aquí, una sola vez: si ya se entra con movimiento
// reducido, los nodos nacen directo en su sitio y se salta el
// florecer-desde-el-centro decorativo por completo.
const prefiereMovimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Textos de la interfaz ───────────────────────────────────
document.getElementById('titulo').textContent = TEXTOS.tituloPagina;
document.getElementById('subtitulo').textContent = TEXTOS.subtitulo;
document.getElementById('pista').textContent = esMovil ? TEXTOS.pistaMovil : TEXTOS.pistaEscritorio;
document.getElementById('firma').textContent = TEXTOS.firma;
document.getElementById('panel-cerrar').setAttribute('aria-label', TEXTOS.cerrar);

// ── Respaldo: la declaración se lee igual sin 3D ────────────
let respaldoMostrado = false;
function mostrarRespaldo() {
  if (respaldoMostrado) return;
  respaldoMostrado = true;

  const seccion = document.getElementById('respaldo');
  document.getElementById('respaldo-titulo').textContent = TEXTOS.tituloPagina;
  document.getElementById('respaldo-firma').textContent = `${CENTRO.texto}`;

  // Sin 3D no hay racimos que explorar con el cursor, así que las
  // razones de cada principal van anidadas debajo de su mensaje: la
  // declaración se lee completa igual, solo que de arriba a abajo.
  const limites = limitesRacimo();
  const lista = document.getElementById('respaldo-lista');
  lista.innerHTML = '';
  MENSAJES.forEach((m, i) => {
    const li = document.createElement('li');
    const t = document.createElement('strong');
    t.textContent = m.titulo;
    li.append(t, document.createTextNode(m.texto));

    const razones = SECUNDARIOS.slice(limites[i], limites[i + 1]);
    if (razones.length) {
      const sub = document.createElement('ul');
      for (const r of razones) {
        const sli = document.createElement('li');
        const st = document.createElement('strong');
        st.textContent = r.titulo;
        sli.append(st, document.createTextNode(r.texto));
        sub.appendChild(sli);
      }
      li.appendChild(sub);
    }
    lista.appendChild(li);
  });

  seccion.hidden = false;
  document.getElementById('canvas').hidden = true;
  for (const id of ['encabezado', 'pista', 'firma']) document.getElementById(id).hidden = true;
}

function tieneWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

// Si el CDN se cae o un módulo revienta ANTES de montar la escena,
// degradamos en vez de dejar una pantalla negra. Los dos oyentes se
// frenan en seco una vez `canvas.dataset.listo` queda en '1': sin esa
// guarda, cualquier rechazo de promesa sin relación (una extensión del
// navegador, un script de terceros) tumbaría una constelación que ya
// estaba funcionando bien, mucho después de haber arrancado.
window.addEventListener('error', () => {
  if (!document.getElementById('canvas').dataset.listo) mostrarRespaldo();
});
window.addEventListener('unhandledrejection', () => {
  if (!document.getElementById('canvas').dataset.listo) mostrarRespaldo();
});

// Red de seguridad: si algo se queda colgado sin llegar a lanzar un
// error ni a montar la escena (un fetch del CDN que nunca resuelve ni
// rechaza, por ejemplo), no dejamos la página en blanco para siempre.
setTimeout(() => {
  if (!document.getElementById('canvas').dataset.listo) mostrarRespaldo();
}, 10000);

if (!tieneWebGL()) {
  mostrarRespaldo();
} else {
  try {
    await iniciar();
  } catch (err) {
    console.error(err);
    mostrarRespaldo();
  }
}

async function iniciar() {
  // Se importan aquí, no arriba, para no descargar ~700 KB en un
  // dispositivo que ya sabemos que no puede renderizar.
  const [THREE, { OrbitControls }, { CSS2DRenderer }, escena, constelacionMod, interaccion] =
    await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/renderers/CSS2DRenderer.js'),
      import('./scene.js'),
      import('./constellation.js'),
      import('./interaction.js'),
    ]);

  const canvas = document.getElementById('canvas');
  const ancho = () => window.innerWidth;
  const alto = () => window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !esMovil,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(ancho(), alto(), false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, esMovil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.dataset.listo = '1';

  // CSS2DRenderer no asigna pointer-events a su contenedor, y ese
  // contenedor cubre todo el viewport por encima del canvas. Sin esto
  // se traga cada clic y el arrastre muere en silencio.
  const rendererEtiquetas = new CSS2DRenderer();
  rendererEtiquetas.setSize(ancho(), alto());
  const capa = rendererEtiquetas.domElement;
  capa.id = 'capa-etiquetas';
  capa.style.position = 'fixed';
  capa.style.top = '0';
  capa.style.left = '0';
  capa.style.pointerEvents = 'none';
  document.body.appendChild(capa);

  const scene = new THREE.Scene();
  const desvioY = esMovil ? AJUSTES.desvioYMovil : AJUSTES.desvioY;

  const texturaHalo = escena.crearTexturaHalo();
  const texturaPunto = escena.crearTexturaPunto();
  const estrellas = escena.crearEstrellas(texturaHalo, esMovil);
  scene.add(estrellas);

  // La Constelacion se construye ANTES de la cámara: con racimos, el
  // encuadre necesita la extensión real ya generada, no un radio
  // adivinado — así que ya no hay un orden "cámara primero" posible.
  const constelacion = new constelacionMod.Constelacion(
    texturaHalo, texturaPunto, esMovil, prefiereMovimientoReducido
  );
  scene.add(constelacion.grupo);

  const camara = escena.crearCamara(ancho(), alto(), esMovil, constelacion.extension);
  camara.position.y = desvioY;

  // ── Órbita ────────────────────────────────────────────────
  const controles = new OrbitControls(camara, canvas);
  controles.target.set(0, desvioY, 0);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.enablePan = false;
  controles.rotateSpeed = esMovil ? 0.45 : 0.75;
  // Sin esto es fácil perderse mirando la constelación desde arriba.
  controles.minPolarAngle = Math.PI / 2 - 0.6;
  controles.maxPolarAngle = Math.PI / 2 + 0.6;
  if (esMovil) {
    // Con touch-action:none, el pinch haría dolly a un punto del que no
    // se vuelve, y es la forma clásica de arrancar un nodo a mitad de
    // arrastre con el segundo dedo.
    controles.enableZoom = false;
    controles.touches.TWO = null;
  } else {
    controles.enableZoom = true;
  }
  aplicarEncuadre();
  controles.update();

  // ── Panel e interacción ───────────────────────────────────
  const panel = interaccion.crearPanel();
  interaccion.conectarInteraccion({
    canvas, camara, controles, constelacion, panel, pedirRender, esMovil,
  });

  // ── Bucle ─────────────────────────────────────────────────
  const reloj = new THREE.Timer(); // Clock quedó obsoleto en r185
  let tiempo = 0;
  let necesitaRender = true;
  let corriendo = false;
  let modoDemanda = false;

  function pedirRender() {
    necesitaRender = true;
    if (!corriendo) arrancar();
  }

  function arrancar() {
    if (corriendo) return;
    corriendo = true;
    reloj.reset(); // descarta el delta acumulado mientras estuvo parado
    renderer.setAnimationLoop(tick);
  }

  function parar() {
    corriendo = false;
    renderer.setAnimationLoop(null);
  }

  function enReposo() {
    // Con 112 nodos (antes 12) siempre hay alguno con un resto minúsculo
    // de velocidad; el umbral se afloja o el bucle nunca llega a aparcar.
    for (const nodo of constelacion.todos) {
      if (nodo.arrastrando || nodo.vel.lengthSq() > 4e-3) return false;
      if (nodo.pos.distanceToSquared(nodo.home) > 4e-3) return false;
    }
    return true;
  }

  function tick() {
    // Acotado: al volver de una pestaña oculta, un dt enorme mandaría
    // todos los nodos contra el muro de un solo frame.
    reloj.update();
    const dt = Math.min(reloj.getDelta(), 1 / 30);
    tiempo += dt;

    if (!modoDemanda) estrellas.rotation.y += 0.00015;

    constelacion.actualizar(tiempo, dt, camara);
    const camaraMovio = controles.update();

    renderer.render(scene, camara);
    rendererEtiquetas.render(scene, camara);

    // En movimiento reducido no dejamos el bucle girando por gusto:
    // se para cuando la escena se aquieta y se despierta al interactuar.
    if (modoDemanda) {
      if (!camaraMovio && !necesitaRender && enReposo()) parar();
      necesitaRender = false;
    }
  }

  // ── Movimiento reducido ───────────────────────────────────
  const mqMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
  function aplicarMovimiento() {
    modoDemanda = mqMovimiento.matches;
    constelacion.reducido = modoDemanda;
    pedirRender();
  }
  mqMovimiento.addEventListener('change', aplicarMovimiento);
  aplicarMovimiento();

  arrancar();

  // ── Encuadre y resize ─────────────────────────────────────
  function aplicarEncuadre() {
    const z = escena.distanciaEncuadre(camara, esMovil, constelacion.extension);
    // Se conserva la dirección de la órbita y solo se ajusta la distancia.
    const dir = camara.position.clone().sub(controles.target);
    const largo = dir.length() || 1;
    camara.position.copy(controles.target).add(dir.multiplyScalar(z / largo));
    if (controles.enableZoom) {
      controles.minDistance = z * 0.6;
      controles.maxDistance = z * 1.6;
    }
  }

  let pendiente = false;
  function alRedimensionar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const w = ancho(), h = alto();
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
      aplicarEncuadre();
      // El devicePixelRatio cambia al mover la ventana entre monitores.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, esMovil ? 1.5 : 2));
      renderer.setSize(w, h, false);
      rendererEtiquetas.setSize(w, h);
      pedirRender();
    });
  }
  window.addEventListener('resize', alRedimensionar);
  window.visualViewport?.addEventListener('resize', alRedimensionar);

  // ── Pausa con la pestaña oculta ───────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar();
    else arrancar();
  });

  // Expuesto solo para depurar desde la consola.
  window.__constelacion = { scene, camara, renderer, constelacion, controles, AJUSTES };
}
