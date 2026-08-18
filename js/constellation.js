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

    const nPri = MENSAJES.length;
    const nSec = SECUNDARIOS.length;
    const A = AJUSTES;
    const radioGolpe = esMovil ? A.radioGolpeMovil : A.radioGolpe;
    const achat = esMovil ? A.achatadoMovil : A.achatado;
    const TANG = esMovil ? A.clusterTangencialMovil : A.clusterTangencial;
    const RADIAL = esMovil ? A.clusterRadialMovil : A.clusterRadial;

    // ── Nodo central ────────────────────────────────────────
    this.centro = new THREE.Group();
    this.centroNucleo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(A.radioNucleoCentro, 3),
      new THREE.MeshBasicMaterial({ color: A.colorCentro })
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

    this.nodoCentral = { pos: CERO.clone(), datos: CENTRO, etiqueta: etiquetaCentro, esCentro: true };
    golpeCentro.userData.nodo = this.nodoCentral;
    this.golpes.push(golpeCentro);

    // ── Racimos: cada principal + su abanico de secundarios ──
    // Los tamaños de racimo se equilibran a ±1 trocenado RAZONES en
    // orden — así el número de razones no tiene que ser múltiplo de 12.
    const limites = limitesRacimo();

    const geoNucleo = new THREE.SphereGeometry(A.radioNodo, 24, 16);
    const geoGolpe = new THREE.SphereGeometry(radioGolpe, 8, 6);

    // Buffer de posiciones/colores de los secundarios: un único Points.
    this.puntosPos = new Float32Array(Math.max(nSec, 1) * 3);
    this.puntosCol = new Float32Array(Math.max(nSec, 1) * 3);

    for (let c = 0; c < nPri; c++) {
      // Esfera de Fibonacci desplazada: evita los polos exactos, que
      // se achatan mal y rompen la base tangente de más abajo.
      const y = 1 - (2 * c + 1) / nPri;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = ANGULO_DORADO * c;
      const u = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);

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

      _color.setHSL(tono, 0.85, 0.78);
      const objeto = new THREE.Group();
      const nucleo = new THREE.Mesh(geoNucleo, new THREE.MeshBasicMaterial({ color: _color.clone() }));
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texturaHalo,
          color: _color.clone(),
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.scale.setScalar(2.6);
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
        datos: MENSAJES[c],
        objeto,
        nucleo,
        halo,
        etiqueta,
        escalaHalo: 2.6,
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
          .addScaledVector(e1, rho * Math.cos(phi))
          .addScaledVector(e2, rho * Math.sin(phi) + A.clusterSesgoAbajo * TANG);
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
        const secundario = {
          pos: baseSec.clone().multiplyScalar(floreo),
          vel: new THREE.Vector3(),
          home: baseSec.clone(),
          base: baseSec,
          fase: (idx / nSec) * Math.PI * 2,
          sep: A.sepSec,
          kHogar: A.kHogarSec,
          deriva: A.derivaSec,
          arrastrando: false,
          resaltado: false,
          esPrincipal: false,
          datos: SECUNDARIOS[idx],
          idx,
          colorBase: _color.clone(),
        };
        this.secundarios.push(secundario);

        this.puntosPos[idx * 3] = secundario.pos.x;
        this.puntosPos[idx * 3 + 1] = secundario.pos.y;
        this.puntosPos[idx * 3 + 2] = secundario.pos.z;
        this.puntosCol[idx * 3] = _color.r;
        this.puntosCol[idx * 3 + 1] = _color.g;
        this.puntosCol[idx * 3 + 2] = _color.b;
      }
    }

    this.todos = [...this.principales, ...this.secundarios];

    // La extensión real de la constelación en reposo: la cámara se
    // encuadra a partir de esto, no de un radio adivinado — con
    // racimos, un radio analítico ya no significa nada.
    let maxX = 0, maxY = 0, maxR = 0;
    for (const nodo of this.todos) {
      maxX = Math.max(maxX, Math.abs(nodo.base.x));
      maxY = Math.max(maxY, Math.abs(nodo.base.y));
      maxR = Math.max(maxR, nodo.base.length());
    }
    this.extension = { x: maxX, y: maxY, r: maxR };

    // ── Secundarios: un único THREE.Points ──────────────────
    if (nSec > 0) {
      const geoPuntos = new THREE.BufferGeometry();
      this.pAttr = new THREE.BufferAttribute(this.puntosPos, 3).setUsage(THREE.DynamicDrawUsage);
      this.cAttr = new THREE.BufferAttribute(this.puntosCol, 3).setUsage(THREE.DynamicDrawUsage);
      geoPuntos.setAttribute('position', this.pAttr);
      geoPuntos.setAttribute('color', this.cAttr);
      // Fija y generosa a propósito: Points.raycast solo la recalcula
      // si es null, así que con los puntos en movimiento esto es
      // correcto y no cuesta nada por frame.
      geoPuntos.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), A.radioMax + 1);

      // El tamaño de un Points es un uniforme, no una escala de sprite:
      // world = extensión / tan(fov/2). Equivocarlo hace los puntos
      // ~45 % más chicos de lo debido si se usa una escala de sprite.
      const extension = esMovil ? A.escalaPuntoMovil : A.escalaPunto;
      const tanMedioFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      this.puntos = new THREE.Points(
        geoPuntos,
        new THREE.PointsMaterial({
          size: extension / tanMedioFov,
          sizeAttenuation: true,
          map: texturaPunto,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      this.grupo.add(this.puntos);
    } else {
      this.puntos = null;
    }

    // ── Globo y resaltador compartidos (un secundario a la vez) ──
    // Los secundarios son vértices de un buffer, no Object3D: no
    // pueden llevar su propio CSS2DObject. Reparentar uno existente
    // tampoco vale — su manejador `removed` desmontaría el DOM en
    // cada cambio de hover — así que hay uno solo que se reposiciona.
    this.globo = crearEtiqueta('', 'etiqueta globo');
    this.globo.visible = false;
    this.globo.renderOrder = 10;
    this.grupo.add(this.globo);
    this._globoTexto = '';

    this.resaltador = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texturaHalo,
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.resaltador.scale.setScalar(1.3);
    this.resaltador.visible = false;
    this.grupo.add(this.resaltador);

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

    const aArr = [], bArr = [], tArr = [], d0Arr = [];
    const push = (a, b, tipo) => {
      aArr.push(a);
      bArr.push(b);
      tArr.push(tipo);
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
    const unaVez = (i, j, tipo) => {
      const clave = i < j ? i * 1000 + j : j * 1000 + i;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        push(i, j, tipo);
      }
    };

    const indicesPri = [];
    for (let i = 0; i < nPri; i++) indicesPri.push(i);

    // radio: centro → cada principal
    for (let i = 0; i < nPri; i++) push(-1, i, 0);

    // anillo: principal ↔ sus vecinos más cercanos entre principales
    for (let i = 0; i < nPri; i++) {
      for (const j of vecinosCercanos(i, indicesPri, A.enlaceVecinosPri)) unaVez(i, j, 1);
    }

    // peciolo + red: por racimo
    for (let c = 0; c < nPri; c++) {
      const inicio = nPri + limites[c];
      const fin = nPri + limites[c + 1];
      const indicesRacimo = [];
      for (let g = inicio; g < fin; g++) {
        push(c, g, 2);
        indicesRacimo.push(g);
      }
      const umbral2 = A.distanciaEnlaceSec * A.distanciaEnlaceSec;
      for (const g of indicesRacimo) {
        for (const h of vecinosCercanos(g, indicesRacimo, A.enlaceVecinosSec, umbral2)) unaVez(g, h, 3);
      }
    }

    this.arA = Int16Array.from(aArr);
    this.arB = Int16Array.from(bArr);
    this.arT = Uint8Array.from(tArr);
    this.arD0 = Float32Array.from(d0Arr);
    this.numAristas = aArr.length;
  }

  /** Muestra u oculta el globo + resaltador compartidos para un secundario. */
  establecerResaltado(nodo) {
    if (this.resaltadoActual === nodo) return;

    const anterior = this.resaltadoActual;
    if (anterior && !anterior.esPrincipal) this._pintarSecundario(anterior, false);

    this.resaltadoActual = nodo;

    if (nodo && !nodo.esPrincipal) {
      this._pintarSecundario(nodo, true);
      if (this._globoTexto !== nodo.datos.titulo) {
        this.globo.element.firstChild.textContent = nodo.datos.titulo;
        this._globoTexto = nodo.datos.titulo;
      }
      this.globo.position.copy(nodo.pos);
      this.resaltador.position.copy(nodo.pos);
      this.globo.visible = true;
      this.resaltador.visible = true;
    } else {
      this.globo.visible = false;
      this.resaltador.visible = false;
    }
  }

  _pintarSecundario(nodo, activo) {
    if (!this.puntos) return;
    const c = nodo.colorBase;
    const boost = activo ? 2.1 : 1;
    const i = nodo.idx * 3;
    this.puntosCol[i] = c.r * boost;
    this.puntosCol[i + 1] = c.g * boost;
    this.puntosCol[i + 2] = c.b * boost;
    this.cAttr.needsUpdate = true;
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
    for (let i = 0; i < n; i++) {
      const b = todos[i].base;
      todos[i].home.set(b.x * cos + b.z * sin, b.y, -b.x * sin + b.z * cos);
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

  /** Copia la posición de cada secundario al buffer del Points. */
  volcarPuntos() {
    if (!this.puntos) return;
    const p = this.puntosPos;
    const secs = this.secundarios;
    for (let k = 0; k < secs.length; k++) {
      const q = secs[k].pos;
      const i = k * 3;
      p[i] = q.x;
      p[i + 1] = q.y;
      p[i + 2] = q.z;
    }
    this.pAttr.needsUpdate = true;
  }

  /** Rellena el buffer de líneas y dibuja solo los segmentos usados. */
  actualizarEnlaces(t) {
    const A = AJUSTES;
    const todos = this.todos;
    const pos = this.posArr;
    const col = this.colArr;
    const [cr, cg, cb] = A.colorEnlace;
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
    if (!this.reducido) {
      const latido = 1 + 0.045 * Math.sin(t * 1.1);
      this.centroNucleo.scale.setScalar(latido);
      this.centroHalo.scale.setScalar(A.escalaHaloCentro * (2 - latido));
      this.centroHalo.material.opacity = A.opacidadHaloCentro + 0.12 * Math.sin(t * 1.1 + Math.PI);
    }

    const lejos = camara.position.length() + this.extension.r;
    const distCamara = camara.position.length();
    for (const nodo of this.principales) {
      const objetivo = nodo.escalaHalo * (nodo.resaltado ? 1.45 : 1);
      nodo.halo.scale.lerp(_tmp.setScalar(objetivo), 0.15);

      // Sin oclusión por profundidad en CSS2D: se compensa atenuando
      // las etiquetas que quedan lejos, y en móvil ocultando de plano
      // las del hemisferio trasero — la mayor ganancia de legibilidad
      // en una pantalla chica con 12 etiquetas fijas compitiendo.
      const d = camara.position.distanceTo(nodo.pos);
      let op = THREE.MathUtils.clamp(1.35 - d / lejos, 0.3, 1);
      if (this.esMovil && A.soloFrenteMovil && d > distCamara) op = 0;
      nodo.etiqueta.element.style.opacity = op.toFixed(2);
    }

    if (this.resaltadoActual && !this.resaltadoActual.esPrincipal) {
      this.globo.position.copy(this.resaltadoActual.pos);
      this.resaltador.position.copy(this.resaltadoActual.pos);
    }
  }

  actualizar(t, dt, camara) {
    this.fisica(t, dt);
    this.actualizarEnlaces(t);
    this.volcarPuntos();
    this.actualizarVisual(t, camara);
  }
}
