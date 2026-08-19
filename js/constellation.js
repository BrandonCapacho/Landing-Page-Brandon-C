// Los nodos, su física, su topología de enlaces fija y el punto de
// resalte compartido de los secundarios.
//
// Dos niveles: "principales" (los 12 mensajes grandes, cada uno con su
// propia malla + halo + etiqueta) y "secundarios" (las ~100 razones,
// todas juntas en un único THREE.Points). Cada principal es el centro
// de un racimo que reparte sus secundarios en un abanico propio.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MENSAJES, CENTRO, SECUNDARIOS, AJUSTES, limitesRacimo } from './config.js';
import { FOV } from './scene.js';

const CERO = new THREE.Vector3(0, 0, 0);
const ARRIBA = new THREE.Vector3(0, 1, 0);
const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5));

// Vectores de trabajo reutilizados: nada se asigna dentro de un bucle
// caliente. Es seguro compartirlos porque actualizar() los consume en
// un orden estrictamente secuencial (física → enlaces → visual).
const _f = new THREE.Vector3();
const _d = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _color = new THREE.Color();

// CSS2DRenderer escribe su propio `transform` inline en el elemento
// para centrarlo sobre el nodo, y eso pisa cualquier transform que
// venga de la hoja de estilos. Por eso el desplazamiento vertical va
// en un <span> interior, que el renderer no toca.
function crearEtiqueta(texto, clase) {
  const div = document.createElement('div');
  div.className = clase;
  const span = document.createElement('span');
  span.textContent = texto;
  div.appendChild(span);
  return new CSS2DObject(div);
}

/**
 * El globo de una razón: el título, visible mientras su racimo está
 * enfocado, y el texto completo, que solo aparece en la señalada. Los
 * dos se alternan con una clase CSS, no reescribiendo el DOM — cambiar
 * textContent en cada movimiento del cursor forzaría un reflujo de la
 * capa de etiquetas entera, 100 veces por paseo.
 */
function crearGlobo() {
  const div = document.createElement('div');
  div.className = 'etiqueta globo';
  const span = document.createElement('span');
  const titulo = document.createElement('b');
  const detalle = document.createElement('i');
  span.append(titulo, detalle);
  div.appendChild(span);
  const obj = new CSS2DObject(div);
  obj.visible = false;
  obj.renderOrder = 10;
  return { obj, titulo, detalle, nodo: null };
}

/**
 * Aparta la etiqueta de `nodo` justo por encima de su disco. `radio` va
 * en unidades de mundo y `escala` es (alto/2)/tan(fov/2), así que el
 * radio aparente en píxeles es radio·escala/distancia — la misma ley que
 * usa sizeAttenuation para los puntos.
 *
 * Se escribe solo cuando cambia de un píxel para arriba: son 21 etiquetas
 * y esto corre en cada frame, y una escritura de estilo que no cambia
 * nada sigue costando una invalidación.
 */
function apartarEtiqueta(nodo, elemento, radio, escala, distancia, hueco) {
  const sep = Math.round((radio * escala) / Math.max(distancia, 0.001) + hueco);
  if (nodo._sep === sep) return;
  nodo._sep = sep;
  elemento.style.setProperty('--sep', `${sep}px`);
}

/** Un paso de interpolación que aterriza exacto en vez de asintótico. */
function acercar(actual, objetivo, mezcla) {
  return Math.abs(objetivo - actual) < 1e-3 ? objetivo : actual + (objetivo - actual) * mezcla;
}

/**
 * PointsMaterial parcheado en vez de un ShaderMaterial desde cero, y a
 * propósito: así three sigue manteniendo por su cuenta el uniforme
 * `scale` (que depende del alto del búfer de dibujo y del
 * devicePixelRatio, y habría que rehacer a mano en cada resize) y toda
 * la gestión de color y tonemapping del final del fragmento. Lo único
 * que se inyecta es lo que PointsMaterial no sabe hacer:
 *
 *   - tamaño por punto (`size` es un uniforme único para los 100),
 *   - respiración lenta desfasada,
 *   - y el resalte del punto señalado, que crece y se aviva.
 *
 * Con `size` puesto a 1/tan(fov/2), el atributo aTamano queda
 * directamente en unidades de mundo, que es como se puede razonar.
 */
function parchearMaterialPuntos(material, uniformes) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `attribute float aTamano;
         attribute float aFase;
         attribute float aResalte;
         uniform float uTiempo;
         uniform float uQuieto;
         uniform float uLatido;
         uniform float uResalteTam;
         varying float vResalte;
         void main() {`
      )
      .replace(
        'gl_PointSize = size;',
        `vResalte = aResalte;
         // Con uQuieto = 1 (movimiento reducido) el factor vale
         // exactamente 1: el tamaño deja de depender del tiempo y el
         // bucle de render puede aparcar de verdad.
         float latido = 1.0 + uLatido * sin(uTiempo * 0.9 + aFase) * (1.0 - uQuieto);
         gl_PointSize = size * aTamano * latido * (1.0 + uResalteTam * aResalte);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform float uResalteBrillo;
         varying float vResalte;
         void main() {`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         diffuseColor.rgb *= 1.0 + uResalteBrillo * vResalte;
         // Una razón apagada NO se dibuja, y no basta con dejarla en
         // negro: la mezcla aditiva no suma color, pero sí acumula
         // alpha, y sobre un lienzo transparente eso tapa el degradado
         // de la página — cien discos negros repartidos por la pantalla.
         if (diffuseColor.r + diffuseColor.g + diffuseColor.b < 0.004) discard;`
      );
  };
  return material;
}

export class Constelacion {
  constructor(texturaHalo, texturaPunto, esMovil, sinFloreo = false) {
    this.esMovil = esMovil;
    // El florero desde el centro es puramente decorativo. Con 112
    // nodos arrancando amontonados en el origen, la tormenta de
    // repulsión inicial tarda mucho más que con 12 en disiparse —
    // con movimiento reducido de entrada, mejor nacer ya en el sitio.
    const floreo = sinFloreo ? 1 : 0.15;
    this.grupo = new THREE.Group();
    this.principales = [];
    this.secundarios = [];
    this.golpes = []; // centro + principales: mallas invisibles, único blanco de clic de ese nivel
    this.marcoYaw = 0;
    this.reducido = false;
    this.resaltadoActual = null; // nodo secundario bajo el cursor o siendo arrastrado
    this.racimoEnfocado = null; // índice del principal cuyo racimo está abierto

    const nPri = MENSAJES.length;
    const nSec = SECUNDARIOS.length;
    const A = AJUSTES;
    const radioGolpe = esMovil ? A.radioGolpeMovil : A.radioGolpe;
    const achat = esMovil ? A.achatadoMovil : A.achatado;
    const TANG = esMovil ? A.clusterTangencialMovil : A.clusterTangencial;
    const RADIAL = esMovil ? A.clusterRadialMovil : A.clusterRadial;
    const escalaPunto = esMovil ? A.escalaPuntoMovil : A.escalaPunto;
    const ANCHO = esMovil ? A.clusterAnchoMovil : A.clusterAncho;
    const ALTO = esMovil ? A.clusterAltoMovil : A.clusterAlto;

    // ── Nodo central ────────────────────────────────────────
    this.centro = new THREE.Group();
    // transparent + depthWrite:false porque la penumbra del foco se hace
    // BAJANDO LA OPACIDAD, no oscureciendo el color: un disco opaco al
    // que se le baja el color no se apaga, se vuelve gris — 0.26 en
    // lineal sale a ~0.55 en sRGB, o sea un gris medio bien visible.
    this.centroNucleo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(A.radioNucleoCentro, 3),
      new THREE.MeshBasicMaterial({
        color: A.colorCentro,
        transparent: true,
        depthWrite: false,
      })
    );
    this.centroHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texturaHalo,
        color: A.colorHaloCentro,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.centroHalo.scale.setScalar(A.escalaHaloCentro);
    this.centroHalo.material.opacity = A.opacidadHaloCentro;
    this.centro.add(this.centroNucleo, this.centroHalo);

    const golpeCentro = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    const etiquetaCentro = crearEtiqueta(CENTRO.titulo, 'etiqueta centro');
    etiquetaCentro.renderOrder = 1;
    this.centro.add(golpeCentro, etiquetaCentro);
    this.grupo.add(this.centro);

    this.atenCentro = 1;
    this.nodoCentral = { pos: CERO.clone(), datos: CENTRO, etiqueta: etiquetaCentro, esCentro: true };
    golpeCentro.userData.nodo = this.nodoCentral;
    this.golpes.push(golpeCentro);

    // ── Racimos: cada principal + su abanico de secundarios ──
    // Los tamaños de racimo se equilibran a ±1 trocenado RAZONES en
    // orden — así el número de razones no tiene que ser múltiplo de 12.
    const limites = limitesRacimo();

    const geoNucleo = new THREE.SphereGeometry(A.radioNodo, 24, 16);
    const geoGolpe = new THREE.SphereGeometry(radioGolpe, 8, 6);

    // Buffers de los secundarios: un único Points para los 100.
    // aTamano y aFase se llenan una vez y no se vuelven a tocar;
    // aResalte y el color se mueven con el foco y con el cursor.
    this.puntosPos = new Float32Array(Math.max(nSec, 1) * 3);
    this.puntosCol = new Float32Array(Math.max(nSec, 1) * 3);
    this.puntosTam = new Float32Array(Math.max(nSec, 1));
    this.puntosFase = new Float32Array(Math.max(nSec, 1));
    this.puntosRes = new Float32Array(Math.max(nSec, 1));

    // Esfera de Fibonacci desplazada: evita los polos exactos, que se
    // achatan mal y rompen la base tangente de más abajo. Se generan
    // las doce de golpe porque el reparto en pantalla necesita verlas
    // todas a la vez antes de que se construya nada.
    const direcciones = [];
    for (let c = 0; c < nPri; c++) {
      const y = 1 - (2 * c + 1) / nPri;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = ANGULO_DORADO * c;
      direcciones.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
    }
    this._repartirEnPantalla(direcciones, achat);

    for (let c = 0; c < nPri; c++) {
      const u = direcciones[c];

      // Base tangente en la dirección del principal. e2 apunta "hacia
      // abajo" tal como se ve en pantalla — la cámara nunca se aleja
      // mucho del ecuador, así que -Y siempre se lee como abajo — y el
      // abanico de secundarios cuelga ahí, dejando libre la banda de
      // encima donde va la etiqueta del principal.
      const e2 = new THREE.Vector3().copy(ARRIBA).addScaledVector(u, -u.y).normalize().negate();
      const e1 = new THREE.Vector3().crossVectors(u, e2).normalize();

      const tono = THREE.MathUtils.lerp(A.tonoNodoMin, A.tonoNodoMax, c / Math.max(1, nPri - 1));

      // — el principal —
      const basePri = u.clone().multiplyScalar(A.radioHogar);
      basePri.x *= achat.x;
      basePri.y *= achat.y;
      basePri.z *= achat.z;

      _color.setHSL(tono, A.satPri, A.luzPri);
      const objeto = new THREE.Group();
      const nucleo = new THREE.Mesh(
        geoNucleo,
        new THREE.MeshBasicMaterial({
          color: _color.clone(),
          transparent: true,
          depthWrite: false,
        })
      );
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texturaHalo,
          color: _color.clone(),
          transparent: true,
          opacity: A.opacidadHaloPri,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.scale.setScalar(A.escalaHaloPri);
      const golpe = new THREE.Mesh(geoGolpe, new THREE.MeshBasicMaterial({ visible: false }));
      const etiqueta = crearEtiqueta(MENSAJES[c].titulo, 'etiqueta');
      objeto.add(nucleo, halo, golpe, etiqueta);

      const principal = {
        pos: basePri.clone().multiplyScalar(floreo),
        vel: new THREE.Vector3(),
        home: basePri.clone(),
        base: basePri,
        fase: (c / nPri) * Math.PI * 2,
        sep: A.sepPri,
        kHogar: A.kHogarPri,
        deriva: A.derivaPri,
        arrastrando: false,
        resaltado: false,
        esPrincipal: true,
        idxPri: c, // qué racimo enfocar cuando se le señala
        datos: MENSAJES[c],
        objeto,
        nucleo,
        halo,
        etiqueta,
        escalaHalo: A.escalaHaloPri,
        aten: 1, // opacidad actual del núcleo, la mueve el foco
      };
      objeto.position.copy(principal.pos);
      golpe.userData.nodo = principal;

      this.principales.push(principal);
      this.golpes.push(golpe);
      this.grupo.add(objeto);

      // — sus secundarios: girasol de ángulo dorado sobre un anillo —
      const inicio = limites[c];
      const fin = limites[c + 1];
      const m = fin - inicio;
      _color.setHSL(tono, A.satSec, A.luzSec);

      for (let j = 0; j < m; j++) {
        const t = (j + 0.5) / m;
        // El anillo empieza en 0.59·TANG: ningún secundario nace a
        // menos de esa distancia de su principal — ese hueco es la
        // holgura para la etiqueta del principal.
        const rho = TANG * Math.sqrt(0.35 + 0.65 * t);
        const phi = ANGULO_DORADO * j + A.clusterGiro * c;
        const rad = A.radioHogar + RADIAL * (t - 0.35);

        const baseSec = u
          .clone()
          .multiplyScalar(rad)
          .addScaledVector(e1, ANCHO * rho * Math.cos(phi))
          .addScaledVector(e2, ALTO * (rho * Math.sin(phi) + A.clusterSesgoAbajo * TANG));
        baseSec.x *= achat.x;
        baseSec.y *= achat.y;
        baseSec.z *= achat.z;

        // En ciertos ángulos, el sesgo hacia abajo casi cancela el
        // desplazamiento tangencial y el punto nace más cerca de su
        // principal que su propio radio de confort — quedaría en
        // repulsión permanente y el reposo nunca se aquietaría. Se
        // corrige en el espacio ya achatado, que es donde de verdad
        // se mide la física.
        const pisoDistancia = A.sepPri + A.sepSec + 0.25;
        const distPri = baseSec.distanceTo(basePri);
        if (distPri < pisoDistancia && distPri > 1e-6) {
          baseSec.sub(basePri).multiplyScalar(pisoDistancia / distPri).add(basePri);
        }

        const idx = inicio + j;
        const fase = (idx / nSec) * Math.PI * 2;
        const secundario = {
          pos: baseSec.clone().multiplyScalar(floreo),
          vel: new THREE.Vector3(),
          home: baseSec.clone(),
          base: baseSec,
          fase,
          sep: A.sepSec,
          kHogar: A.kHogarSec,
          deriva: A.derivaSec,
          arrastrando: false,
          resaltado: false,
          esPrincipal: false,
          racimo: c, // a qué principal pertenece: lo usa el foco
          datos: SECUNDARIOS[idx],
          idx,
          colorBase: _color.clone(),
          res: 0, // resalte actual y su objetivo, interpolados por frame
          resObj: 0,
          // Se nace apagado, no encendido: al llegar no hay rama abierta.
          aten: A.atenuadoSec,
          atenObj: A.atenuadoSec,
        };
        this.secundarios.push(secundario);

        this.puntosPos[idx * 3] = secundario.pos.x;
        this.puntosPos[idx * 3 + 1] = secundario.pos.y;
        this.puntosPos[idx * 3 + 2] = secundario.pos.z;
        this.puntosCol[idx * 3] = _color.r * A.atenuadoSec;
        this.puntosCol[idx * 3 + 1] = _color.g * A.atenuadoSec;
        this.puntosCol[idx * 3 + 2] = _color.b * A.atenuadoSec;

        // Variedad de tamaño estable — derivada del índice, no de
        // Math.random(), para que la constelación se vea idéntica en
        // cada carga. Cien puntos exactamente iguales se leen como un
        // moteado de trama; con esta dispersión se leen como estrellas.
        const revuelto = Math.sin(idx * 127.1 + 43.7) * 0.5 + 0.5;
        this.puntosTam[idx] =
          escalaPunto * (1 - A.variacionPunto + 2 * A.variacionPunto * revuelto);
        this.puntosFase[idx] = fase;
      }
    }

    this.todos = [...this.principales, ...this.secundarios];

    // La extensión real en reposo, medida en vez de adivinada: con
    // racimos, un radio analítico ya no significa nada.
    //
    // Dos medidas, y la diferencia importa. `extension` cubre los 112
    // nodos y sirve para el desvanecido de etiquetas y la esfera
    // envolvente. `extensionPri` cubre solo los doce, y es la que
    // encuadra la vista de llegada: allí las razones están apagadas, así
    // que encuadrar sobre ellas dejaría los doce mensajes pequeños en
    // medio de un montón de cielo vacío.
    const medir = (nodos) => {
      let x = 0, y = 0, r = 0;
      for (const nodo of nodos) {
        x = Math.max(x, Math.abs(nodo.base.x));
        y = Math.max(y, Math.abs(nodo.base.y));
        r = Math.max(r, nodo.base.length());
      }
      return { x, y, r };
    };
    this.extension = medir(this.todos);
    this.extensionPri = medir(this.principales);
    this.alcanceRacimo = this._medirAlcanceRacimo(nPri);

    // ── Secundarios: un único THREE.Points ──────────────────
    // Uniformes propios del material parcheado. Se crean aquí y se le
    // pasan los MISMOS objetos al shader, así que mover
    // `unifPuntos.uTiempo.value` llega a la GPU sin más trámite.
    this.unifPuntos = {
      uTiempo: { value: 0 },
      uQuieto: { value: 0 },
      uLatido: { value: A.latidoPunto },
      uResalteTam: { value: A.resalteTam },
      uResalteBrillo: { value: A.resalteBrillo },
    };

    if (nSec > 0) {
      const geoPuntos = new THREE.BufferGeometry();
      this.pAttr = new THREE.BufferAttribute(this.puntosPos, 3).setUsage(THREE.DynamicDrawUsage);
      this.cAttr = new THREE.BufferAttribute(this.puntosCol, 3).setUsage(THREE.DynamicDrawUsage);
      this.rAttr = new THREE.BufferAttribute(this.puntosRes, 1).setUsage(THREE.DynamicDrawUsage);
      geoPuntos.setAttribute('position', this.pAttr);
      geoPuntos.setAttribute('color', this.cAttr);
      geoPuntos.setAttribute('aResalte', this.rAttr);
      geoPuntos.setAttribute('aTamano', new THREE.BufferAttribute(this.puntosTam, 1));
      geoPuntos.setAttribute('aFase', new THREE.BufferAttribute(this.puntosFase, 1));
      // Fija y generosa a propósito: Points.raycast solo la recalcula
      // si es null, así que con los puntos en movimiento esto es
      // correcto y no cuesta nada por frame.
      geoPuntos.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), A.radioMax + 1);

      // `size` a 1/tan(fov/2) para que aTamano quede en unidades de
      // mundo: gl_PointSize no es una escala de sprite, es píxeles, y
      // el factor que a three se le queda fuera es justo ese.
      const tanMedioFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      this.puntos = new THREE.Points(
        geoPuntos,
        parchearMaterialPuntos(
          new THREE.PointsMaterial({
            size: 1 / tanMedioFov,
            sizeAttenuation: true,
            map: texturaPunto,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
          this.unifPuntos
        )
      );
      this.grupo.add(this.puntos);
    } else {
      this.puntos = null;
    }

    // ── Globos de las razones ────────────────────────────────
    // Los secundarios son vértices de un buffer, no Object3D: no
    // pueden llevar su propio CSS2DObject. Reparentar uno existente
    // tampoco vale — su manejador `removed` desmontaría el DOM en cada
    // cambio — así que hay una reserva fija que se reposiciona y se
    // reetiqueta. Le caben el racimo más grande y uno de propina, que
    // es todo lo que puede necesitar etiqueta a la vez.
    let maxRacimo = 0;
    for (let c = 0; c < nPri; c++) maxRacimo = Math.max(maxRacimo, limites[c + 1] - limites[c]);
    this.globos = [];
    for (let k = 0; k < maxRacimo + 1; k++) {
      const g = crearGlobo();
      this.globos.push(g);
      this.grupo.add(g.obj);
    }

    // ── Topología de enlaces: fija, calculada una sola vez ───
    this.construirAristas(limites);

    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(this.numAristas * 2 * 3);
    this.colArr = new Float32Array(this.numAristas * 2 * 3);
    this.posAttr = new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.colArr, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    geo.setDrawRange(0, 0);

    this.enlaces = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: A.opacidadEnlace,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    // La geometría muta cada frame: una esfera envolvente vieja la haría desaparecer.
    this.enlaces.frustumCulled = false;
    this.grupo.add(this.enlaces);
  }

  /**
   * Medio ancho y medio alto del racimo más grande YA DESPLEGADO,
   * medidos desde su propio centro. Es lo que la cámara tiene que
   * encuadrar al acercarse a uno.
   *
   * Por eje y no como un radio único, que era el primer intento: una
   * pantalla de móvil es alta y estrecha, y con un solo radio el
   * encuadre siempre lo decidía el ancho — la cámara se quedaba lejos
   * y el acercamiento no se notaba. Se mide sobre las posiciones de
   * reposo ya expandidas, que es como se verá cuando llegue.
   */
  _medirAlcanceRacimo(nPri) {
    const e = AJUSTES.expansionFoco;
    const centro = new THREE.Vector3();
    const q = new THREE.Vector3();
    // Posición de reposo de un secundario con su racimo abierto.
    const abierto = (s, bp) => q.copy(s.base).sub(bp).multiplyScalar(e).add(bp);
    let ax = 0;
    let ay = 0;
    const anotar = (p) => {
      ax = Math.max(ax, Math.abs(p.x - centro.x));
      ay = Math.max(ay, Math.abs(p.y - centro.y));
    };

    for (let c = 0; c < nPri; c++) {
      const bp = this.principales[c].base;
      const miembros = this.secundarios.filter((s) => s.racimo === c);
      centro.copy(bp);
      for (const s of miembros) centro.add(abierto(s, bp));
      centro.divideScalar(miembros.length + 1);

      anotar(bp);
      for (const s of miembros) anotar(abierto(s, bp));
    }
    return { x: ax, y: ay };
  }

  /**
   * Centro del racimo `c` en el marco de ESTE frame, escrito en
   * `salida`. Se calcula sobre `home`, no sobre `base`, así que ya trae
   * dentro tanto la rotación del marco como el despliegue del foco: la
   * cámara sigue al racimo sin tener que enterarse de ninguna de las
   * dos cosas.
   */
  centroRacimo(c, salida) {
    salida.copy(this.principales[c].home);
    let n = 1;
    for (const s of this.secundarios) {
      if (s.racimo !== c) continue;
      salida.add(s.home);
      n++;
    }
    return salida.divideScalar(n);
  }

  /**
   * Reparte las direcciones de los principales en el PLANO DE LA
   * PANTALLA, modificándolas en su sitio. En la esfera están bien
   * repartidas por Fibonacci, pero en proyección un par de ellas se
   * solapan — y una etiqueta pisando a otra es el único solape que se
   * nota, porque la profundidad no se ve.
   *
   * La repulsión usa una métrica ELÍPTICA, no un círculo: una etiqueta
   * es ancha y baja, así que separar dos en vertical sale mucho más
   * barato que en horizontal. Con un radio de confort redondo lo
   * bastante grande para librar dos etiquetas lado a lado, doce puntos
   * solo caben en un anillo y la composición se vuelve un reloj de doce
   * horas; con la elipse el reparto sigue pareciendo orgánico.
   *
   * De cada dirección se conserva el SIGNO de z y se le recalcula el
   * módulo, así que siguen siendo unitarias y cada racimo hereda la
   * corrección de su principal sin que haya que tocar nada más.
   */
  _repartirEnPantalla(dirs, achat) {
    const A = AJUSTES;
    const {
      sepEtiquetaX: RX, sepEtiquetaY: RY, sepNodo: RN,
      sepCentroX: CX, sepCentroY: CY, desfaseCentroY: CDY,
    } = A;
    const D = A.distanciaEstimada;
    const TOPE = 0.97; // deja algo de esfera para la z
    const n = dirs.length;

    // Estado libre: solo el x,y de cada dirección. La z se recalcula de
    // ellos en cada pasada, porque la dirección tiene que seguir siendo
    // unitaria, y su SIGNO se conserva del reparto de Fibonacci.
    const ux = dirs.map((u) => u.x);
    const uy = dirs.map((u) => u.y);
    const signoZ = dirs.map((u) => Math.sign(u.z) || 1);
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    const zDe = (i) => signoZ[i] * Math.sqrt(Math.max(0, 1 - ux[i] ** 2 - uy[i] ** 2));

    const sx = new Float64Array(n);
    const sy = new Float64Array(n);
    const kPersp = new Float64Array(n);

    for (let paso = 0; paso < 200; paso++) {
      // Posición en PANTALLA: achatada y con la división perspectiva.
      // Esta última es imprescindible: sin ella dos nodos con x,y
      // distintas pero z muy distinta terminan en el mismo píxel, que
      // es exactamente el solape que se está intentando evitar.
      for (let i = 0; i < n; i++) {
        const k = D / (D - zDe(i) * achat.z);
        kPersp[i] = k;
        sx[i] = ux[i] * achat.x * k;
        sy[i] = uy[i] * achat.y * k;
      }

      dx.fill(0);
      dy.fill(0);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          // Dos exigencias por pareja: la elipse ancha y baja de las
          // etiquetas, y el círculo pequeño de los discos. Se resuelve
          // la que esté más violada de las dos.
          const px = sx[i] - sx[j];
          const py = sy[i] - sy[j];
          const dEtiqueta = Math.hypot(px / RX, py / RY);
          const dNodo = Math.hypot(px / RN, py / RN);
          const usaEtiqueta = dEtiqueta <= dNodo;
          const escalaX = usaEtiqueta ? RX : RN;
          const escalaY = usaEtiqueta ? RY : RN;
          const d = usaEtiqueta ? dEtiqueta : dNodo;
          if (d >= 1) continue;
          // Dos exactamente encima: se desempata en vertical, que es
          // la dirección en la que separarlas cuesta menos.
          const ex = d < 1e-6 ? 0 : px / (escalaX * d);
          const ey = d < 1e-6 ? 1 : py / (escalaY * d);
          const empuje = (1 - d) * 0.22;
          dx[i] += ex * escalaX * empuje;
          dy[i] += ey * escalaY * empuje;
          dx[j] -= ex * escalaX * empuje;
          dy[j] -= ey * escalaY * empuje;
        }
      }

      // El nodo central juega igual que los demás, solo que no se
      // mueve: es una repulsión más, con su elipse propia y más ancha.
      for (let i = 0; i < n; i++) {
        const ax = sx[i] / CX;
        const ay = (sy[i] - CDY) / CY;
        const d = Math.hypot(ax, ay);
        if (d >= 1) continue;
        const ex = d < 1e-6 ? 1 : ax / d;
        const ey = d < 1e-6 ? 0 : ay / d;
        const empuje = (1 - d) * 0.3;
        dx[i] += ex * CX * empuje;
        dy[i] += ey * CY * empuje;
      }

      // El empujón se calculó en pantalla: se le deshace la perspectiva
      // y el achatado para devolverlo a la dirección. El único límite
      // duro es caber en la esfera unidad; el resto se resuelve
      // empujando, que es lo que deja que los nodos se deslicen unos
      // alrededor de otros en vez de quedarse trabados.
      for (let i = 0; i < n; i++) {
        ux[i] += dx[i] / (kPersp[i] * achat.x);
        uy[i] += dy[i] / (kPersp[i] * achat.y);
        const q = Math.hypot(ux[i], uy[i]);
        if (q > TOPE) {
          const k = TOPE / q;
          ux[i] *= k;
          uy[i] *= k;
        }
      }
    }

    for (let i = 0; i < n; i++) dirs[i].set(ux[i], uy[i], zDe(i)).normalize();
  }

  /**
   * Construye la lista fija de aristas a partir de las posiciones de
   * reposo (`base`). Cuatro tipos — ver AJUSTES.brilloEnlace en el
   * mismo orden: radio (centro→principal), anillo (principal↔sus
   * vecinos), peciolo (secundario→su principal) y red (secundario↔sus
   * vecinos del mismo racimo). Nada de secundario↔centro ni
   * secundario↔principal ajeno: eso es lo que a 112 nodos convertiría
   * la constelación en una malla blanca. Solo el brillo es dinámico;
   * calcularla por distancia en cada frame parpadearía sin parar.
   */
  construirAristas(limites) {
    const A = AJUSTES;
    const todos = this.todos;
    const nPri = this.principales.length;

    const aArr = [], bArr = [], tArr = [], d0Arr = [], cArr = [];
    const push = (a, b, tipo, racimo) => {
      aArr.push(a);
      bArr.push(b);
      tArr.push(tipo);
      cArr.push(racimo);
      const posA = a < 0 ? CERO : todos[a].base;
      d0Arr.push(posA.distanceTo(todos[b].base));
    };
    const vecinosCercanos = (i, candidatos, k, umbral2 = Infinity) =>
      candidatos
        .filter((j) => j !== i && todos[i].base.distanceToSquared(todos[j].base) < umbral2)
        .sort(
          (p, q) =>
            todos[i].base.distanceToSquared(todos[p].base) - todos[i].base.distanceToSquared(todos[q].base)
        )
        .slice(0, k);

    const vistos = new Set();
    const unaVez = (i, j, tipo, racimo) => {
      const clave = i < j ? i * 1000 + j : j * 1000 + i;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        push(i, j, tipo, racimo);
      }
    };

    const indicesPri = [];
    for (let i = 0; i < nPri; i++) indicesPri.push(i);

    // radio: centro → cada principal
    for (let i = 0; i < nPri; i++) push(-1, i, 0, i);

    // anillo: principal ↔ sus vecinos más cercanos entre principales.
    // Racimo -1: une dos racimos, así que no es de ninguno; el foco
    // los resuelve mirando si alguno de sus extremos es el enfocado.
    for (let i = 0; i < nPri; i++) {
      for (const j of vecinosCercanos(i, indicesPri, A.enlaceVecinosPri)) unaVez(i, j, 1, -1);
    }

    // peciolo + red: por racimo
    for (let c = 0; c < nPri; c++) {
      const inicio = nPri + limites[c];
      const fin = nPri + limites[c + 1];
      const indicesRacimo = [];
      for (let g = inicio; g < fin; g++) {
        push(c, g, 2, c);
        indicesRacimo.push(g);
      }
      const umbral2 = A.distanciaEnlaceSec * A.distanciaEnlaceSec;
      for (const g of indicesRacimo) {
        for (const h of vecinosCercanos(g, indicesRacimo, A.enlaceVecinosSec, umbral2)) {
          unaVez(g, h, 3, c);
        }
      }
    }

    this.arA = Int16Array.from(aArr);
    this.arB = Int16Array.from(bArr);
    this.arT = Uint8Array.from(tArr);
    this.arC = Int8Array.from(cArr);
    this.arD0 = Float32Array.from(d0Arr);
    this.numAristas = aArr.length;
  }

  /** Señala una razón concreta: crece, se aviva y abre su texto entero. */
  establecerResaltado(nodo) {
    const nuevo = nodo && !nodo.esPrincipal && !nodo.esCentro ? nodo : null;
    if (this.resaltadoActual === nuevo) return;
    if (this.resaltadoActual) this.resaltadoActual.resObj = 0;
    this.resaltadoActual = nuevo;
    if (nuevo) nuevo.resObj = 1;
    this._sincronizarGlobos();
  }

  /**
   * Abre un racimo: enciende sus razones con etiqueta y deja el resto
   * de la escena en penumbra. Es la pieza que hace legibles 100
   * razones — de una en una, con el cursor, nadie las leería.
   * `c` es el índice de un principal, o null para volver al conjunto.
   */
  establecerFoco(c) {
    if (this.racimoEnfocado === c) return;
    this.racimoEnfocado = c;
    // Sin excepción para c === null: en la vista de conjunto no hay
    // ninguna rama abierta, así que NINGUNA razón está encendida. Solo
    // se ven los doce mensajes y la red que los une.
    const apagado = AJUSTES.atenuadoSec;
    for (const s of this.secundarios) s.atenObj = s.racimo === c ? 1 : apagado;
    this._sincronizarGlobos();
  }

  /**
   * Reparte la reserva de globos entre las razones que ahora mismo
   * necesitan etiqueta. El orden de la lista es el de los índices, así
   * que mientras el racimo no cambie cada globo sigue tocándole al
   * mismo nodo y no se reescribe ni un textContent.
   */
  _sincronizarGlobos() {
    const foco = this.racimoEnfocado;
    const activo = this.resaltadoActual;

    const lista = [];
    if (foco !== null) {
      for (const s of this.secundarios) if (s.racimo === foco) lista.push(s);
    }
    if (activo && !lista.includes(activo)) lista.push(activo);

    for (let k = 0; k < this.globos.length; k++) {
      const g = this.globos[k];
      const nodo = lista[k] || null;
      if (g.nodo !== nodo) {
        g.nodo = nodo;
        if (nodo) {
          g.titulo.textContent = nodo.datos.titulo;
          g.detalle.textContent = nodo.datos.texto;
        }
        g.obj.visible = !!nodo;
      }
      if (nodo) g.obj.element.classList.toggle('activa', nodo === activo);
    }
  }

  /** Física: muelle al reposo, deriva, repulsión mutua y muro de contención. */
  fisica(t, dt) {
    const A = AJUSTES;
    const todos = this.todos;
    const n = todos.length;
    const reducido = this.reducido;

    if (!reducido) this.marcoYaw += A.rotacionMarco * dt;

    // El marco entero gira: la constelación deriva como un cuerpo. Al
    // ser una rotación rígida, no distorsiona ningún racimo.
    const cos = Math.cos(this.marcoYaw);
    const sin = Math.sin(this.marcoYaw);
    const foco = this.racimoEnfocado;
    const basePri = foco === null ? null : this.principales[foco].base;

    for (let i = 0; i < n; i++) {
      const nodo = todos[i];
      let bx = nodo.base.x, by = nodo.base.y, bz = nodo.base.z;

      // El racimo abierto se despliega separándose de su principal.
      // Mover el destino del muelle es toda la animación que hace
      // falta: la física la resuelve sola, con su misma inercia.
      if (basePri && !nodo.esPrincipal && nodo.racimo === foco) {
        const e = A.expansionFoco;
        bx = basePri.x + (bx - basePri.x) * e;
        by = basePri.y + (by - basePri.y) * e;
        bz = basePri.z + (bz - basePri.z) * e;
      }

      nodo.home.set(bx * cos + bz * sin, by, -bx * sin + bz * cos);
    }

    // Repulsión O(n²): a 112 nodos son 6216 pares, ~0.1-0.5 ms sin
    // asignaciones — no vale la pena una rejilla espacial por eso.
    // El descarte previo por eje evita la raíz para la gran mayoría.
    for (let i = 0; i < n; i++) {
      const ni = todos[i];
      const pi = ni.pos;
      for (let j = i + 1; j < n; j++) {
        const nj = todos[j];
        const pj = nj.pos;
        const sep = ni.sep + nj.sep;
        const dx = pi.x - pj.x;
        if (dx * dx > sep * sep) continue;
        const dy = pi.y - pj.y;
        if (dy * dy > sep * sep) continue;
        const dz = pi.z - pj.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= sep * sep || d2 < 1e-8) continue;

        const d = Math.sqrt(d2);
        _d.set(dx, dy, dz).divideScalar(d);
        const empuje = (sep - d) * A.kRepulsion;
        if (!ni.arrastrando) ni.vel.addScaledVector(_d, empuje * dt);
        if (!nj.arrastrando) nj.vel.addScaledVector(_d, -empuje * dt);
      }
    }

    const factorAmortiguacion = Math.pow(A.amortiguacion, dt * 60);

    for (let i = 0; i < n; i++) {
      const nodo = todos[i];
      if (nodo.arrastrando) {
        if (nodo.objeto) nodo.objeto.position.copy(nodo.pos);
        continue;
      }

      // Muelle hacia la posición de reposo, con fuerza propia del nivel.
      _f.subVectors(nodo.home, nodo.pos).multiplyScalar(nodo.kHogar);

      // Deriva: suma de senos, no ruido aleatorio. El ruido por frame
      // hace que el sistema divergiera por mucho que se amortigüe.
      if (!reducido && nodo.deriva > 0) {
        const p = nodo.fase;
        _f.x += Math.sin(t * 0.31 + p) * nodo.deriva;
        _f.y += Math.sin(t * 0.27 + p * 2) * nodo.deriva;
        _f.z += Math.sin(t * 0.23 + p * 3) * nodo.deriva;
      }

      // Muro: nada puede salirse del mundo, pase lo que pase.
      const dist = nodo.pos.length();
      if (dist > A.radioMax) {
        _f.addScaledVector(_tmp.copy(nodo.pos).divideScalar(dist), -(dist - A.radioMax) * A.kMuro);
      }

      // Euler semi-implícito. La amortiguación va elevada a dt·60 para
      // que a 120 Hz se sienta igual que a 60 Hz.
      nodo.vel.addScaledVector(_f, dt);
      nodo.vel.multiplyScalar(factorAmortiguacion);
      nodo.vel.clampLength(0, A.velocidadMax);
      nodo.pos.addScaledVector(nodo.vel, dt);
      if (nodo.objeto) nodo.objeto.position.copy(nodo.pos);
    }
  }

  /**
   * Vuelca al Points la posición de cada secundario y hace avanzar sus
   * dos interpolaciones: el resalte del señalado y la atenuación por
   * foco. Con movimiento reducido las dos se resuelven de un salto, o
   * el bucle aparcaría a mitad de transición y se quedaría el efecto
   * congelado por el camino.
   */
  volcarPuntos() {
    if (!this.puntos) return;
    const p = this.puntosPos;
    const col = this.puntosCol;
    const secs = this.secundarios;
    const mezcla = this.reducido ? 1 : 0.2;
    let cambioRes = false;
    let cambioCol = false;

    for (let k = 0; k < secs.length; k++) {
      const s = secs[k];
      const i = k * 3;
      p[i] = s.pos.x;
      p[i + 1] = s.pos.y;
      p[i + 2] = s.pos.z;

      const res = acercar(s.res, s.resObj, mezcla);
      if (res !== s.res) {
        s.res = res;
        this.puntosRes[k] = res;
        cambioRes = true;
      }

      const aten = acercar(s.aten, s.atenObj, mezcla);
      if (aten !== s.aten) {
        s.aten = aten;
        const c = s.colorBase;
        col[i] = c.r * aten;
        col[i + 1] = c.g * aten;
        col[i + 2] = c.b * aten;
        cambioCol = true;
      }
    }

    this.pAttr.needsUpdate = true;
    if (cambioRes) this.rAttr.needsUpdate = true;
    if (cambioCol) this.cAttr.needsUpdate = true;
  }

  /** ¿Queda alguna transición de resalte o de foco a medias? */
  transicionActiva() {
    const A = AJUSTES;
    const foco = this.racimoEnfocado;
    for (const s of this.secundarios) {
      if (s.res !== s.resObj || s.aten !== s.atenObj) return true;
    }
    if (this.atenCentro !== (foco === null ? 1 : A.atenuadoCentro)) return true;
    for (const p of this.principales) {
      if (p.aten !== (foco === null || foco === p.idxPri ? 1 : A.atenuadoNucleoPri)) return true;
    }
    return false;
  }

  /** Rellena el buffer de líneas y dibuja solo los segmentos usados. */
  actualizarEnlaces(t) {
    const A = AJUSTES;
    const todos = this.todos;
    const pos = this.posArr;
    const col = this.colArr;
    const [cr, cg, cb] = A.colorEnlace;
    const foco = this.racimoEnfocado;
    let v = 0;

    // Bajo AdditiveBlending, un color oscuro es invisible: así se
    // consigue fundido por segmento con un solo draw call, que es
    // algo que LineBasicMaterial no permite con alpha por vértice.
    const escribir = (a, b, brillo) => {
      const i = v * 3;
      pos[i] = a.x; pos[i + 1] = a.y; pos[i + 2] = a.z;
      pos[i + 3] = b.x; pos[i + 4] = b.y; pos[i + 5] = b.z;
      const r = cr * brillo, g = cg * brillo, bl = cb * brillo;
      col[i] = r; col[i + 1] = g; col[i + 2] = bl;
      col[i + 3] = r; col[i + 4] = g; col[i + 5] = bl;
      v += 2;
    };

    for (let k = 0; k < this.numAristas; k++) {
      const ia = this.arA[k];
      const ib = this.arB[k];
      const tipo = this.arT[k];
      const nodoB = todos[ib];
      // Los radios no arrancan en el punto exacto del centro: 12
      // líneas convergiendo en un píxel son media culpa del lavado.
      const pa = ia < 0 ? _tmp.copy(nodoB.pos).setLength(A.arranqueRadio) : todos[ia].pos;
      const pb = nodoB.pos;
      const d = pa.distanceTo(pb);

      let brillo = A.brilloEnlace[tipo];

      if (tipo >= 2) {
        // Peciolo y red son enlaces DE UN RACIMO: cuelgan de razones
        // que están apagadas mientras su rama no esté abierta, así que
        // dibujarlos sería tender líneas hacia puntos invisibles.
        if (this.arC[k] !== foco) continue;
        brillo *= A.brilloEnlaceFoco;
      } else if (foco !== null) {
        // Radio y anillo son la red de los doce, y esa se ve siempre;
        // solo se retira a la penumbra la parte que no toca la rama
        // abierta. En el radio, `ia` es el centro (-1) y `ib` el
        // principal, así que basta mirar los extremos.
        brillo *= ia === foco || ib === foco ? 1 : A.atenuadoEnlace;
      }

      const exceso = d / this.arD0[k] - 1;
      if (exceso > 0) {
        // Una arista se apaga al estirarse — la misma sensación que
        // daba el viejo umbral por distancia, sin recorrer 6216 pares
        // cada frame. Los radios nunca llegan a apagarse del todo:
        // son el anclaje visual del centro.
        const piso = tipo === 0 ? 0.35 : 0;
        brillo *= Math.max(piso, 1 - exceso / (A.estiron - 1));
      }
      if (brillo < 0.02) continue;

      if (!this.reducido) {
        const faseA = ia < 0 ? 0 : todos[ia].fase;
        brillo *= 0.62 + 0.38 * Math.sin(t * (tipo === 0 ? 1.6 : 1.1) + faseA + nodoB.fase);
      } else {
        brillo *= 0.7;
      }
      escribir(pa, pb, brillo);
    }

    this.enlaces.geometry.setDrawRange(0, v);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  /** Latido del centro, halos, resalte activo y desvanecido de etiquetas. */
  actualizarVisual(t, camara) {
    const A = AJUSTES;
    const foco = this.racimoEnfocado;
    const mezcla = this.reducido ? 1 : 0.15;

    // El nodo central también se retira cuando hay un racimo abierto:
    // es el objeto más luminoso de la escena y de cerca su resplandor
    // se le mete encima a las razones que se están leyendo.
    this.atenCentro = acercar(this.atenCentro, foco === null ? 1 : A.atenuadoCentro, mezcla);
    this.centroNucleo.material.opacity = this.atenCentro;
    this.nodoCentral.etiqueta.element.style.opacity = this.atenCentro.toFixed(2);

    if (!this.reducido) {
      const latido = 1 + 0.045 * Math.sin(t * 1.1);
      this.centroNucleo.scale.setScalar(latido);
      this.centroHalo.scale.setScalar(A.escalaHaloCentro * (2 - latido));
      this.centroHalo.material.opacity =
        (A.opacidadHaloCentro + 0.12 * Math.sin(t * 1.1 + Math.PI)) * this.atenCentro;
    } else {
      this.centroHalo.material.opacity = A.opacidadHaloCentro * this.atenCentro;
    }

    const lejos = camara.position.length() + this.extension.r;
    const distCamara = camara.position.length();
    // Píxeles por unidad de mundo a un metro de la cámara. De aquí sale
    // el tamaño aparente de cada disco, que es lo que decide cuánto hay
    // que apartar su etiqueta para que no se la coma.
    const escalaPx =
      (window.innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);

    apartarEtiqueta(
      this.nodoCentral, this.nodoCentral.etiqueta.element,
      A.radioNucleoCentro, escalaPx, distCamara, 10
    );

    for (const nodo of this.principales) {
      const esFoco = foco === null || foco === nodo.idxPri;

      // Un racimo abierto se queda con la escena y los otros once se
      // van a la penumbra: halo, núcleo y etiqueta. Se apaga también el
      // núcleo — en la primera versión no, para no perder el mapa de los
      // demás mensajes, pero de cerca esos núcleos son discos grandes
      // que compiten de tú a tú con las razones. El mapa se recupera
      // tocando el fondo, que es un gesto más barato que leer con ruido.
      nodo.aten = acercar(nodo.aten, esFoco ? 1 : A.atenuadoNucleoPri, mezcla);
      nodo.nucleo.material.opacity = nodo.aten;

      const objetivo = nodo.escalaHalo * (nodo.resaltado ? 1.45 : 1) * (esFoco ? 1 : 0.72);
      nodo.halo.scale.lerp(_tmp.setScalar(objetivo), 0.15);
      const opHalo = esFoco ? A.opacidadHaloPri : A.opacidadHaloPriApagado;
      nodo.halo.material.opacity = acercar(nodo.halo.material.opacity, opHalo, mezcla);

      // Sin oclusión por profundidad en CSS2D: se compensa atenuando
      // las etiquetas que quedan lejos, y en móvil ocultando de plano
      // las del hemisferio trasero — la mayor ganancia de legibilidad
      // en una pantalla chica con 12 etiquetas fijas compitiendo.
      const d = camara.position.distanceTo(nodo.pos);
      let op = THREE.MathUtils.clamp(1.35 - d / lejos, 0.3, 1);
      if (this.esMovil && A.soloFrenteMovil && d > distCamara) op = 0;
      if (!esFoco) op *= A.atenuadoEtiquetaPri;
      nodo.etiqueta.element.style.opacity = op.toFixed(2);
      apartarEtiqueta(nodo, nodo.etiqueta.element, A.radioNodo, escalaPx, d, 8);
    }

    // Los globos siguen a su razón. Aquí no se aplica el corte de
    // hemisferio del móvil: si alguien abrió un racimo que quedó
    // detrás, dejarlo sin ninguna etiqueta sería peor que el desorden.
    for (const g of this.globos) {
      if (!g.nodo) continue;
      g.obj.position.copy(g.nodo.pos);
      const d = camara.position.distanceTo(g.nodo.pos);
      g.obj.element.style.opacity = THREE.MathUtils.clamp(1.45 - d / lejos, 0.45, 1).toFixed(2);
      // Se usa el radio del NÚCLEO visible, no el del sprite: aTamano es
      // la extensión completa del punto, pero la textura solo es opaca en
      // el 24 % central y el resto es resplandor. Apartando el chip el
      // radio entero quedaba flotando muy por encima de su punto y se
      // perdía a qué se refería.
      apartarEtiqueta(g.nodo, g.obj.element, this.puntosTam[g.nodo.idx] * 0.22, escalaPx, d, 6);
    }
  }

  actualizar(t, dt, camara) {
    this.unifPuntos.uTiempo.value = t;
    this.unifPuntos.uQuieto.value = this.reducido ? 1 : 0;
    this.fisica(t, dt);
    this.actualizarEnlaces(t);
    this.volcarPuntos();
    this.actualizarVisual(t, camara);
  }
}
