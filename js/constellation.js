// Los nodos, su física y las líneas que los unen.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MENSAJES, CENTRO, AJUSTES } from './config.js';

const CERO = new THREE.Vector3(0, 0, 0);

// Vectores de trabajo reutilizados: nada se asigna dentro del bucle.
const _f = new THREE.Vector3();
const _d = new THREE.Vector3();
const _tmp = new THREE.Vector3();

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
  constructor(texturaHalo, esMovil) {
    this.esMovil = esMovil;
    this.grupo = new THREE.Group();
    this.nodos = [];
    this.golpes = []; // esferas invisibles: el único blanco de clic
    this.marcoYaw = 0;
    this.reducido = false;

    const n = MENSAJES.length;
    const radioGolpe = esMovil ? AJUSTES.radioGolpeMovil : AJUSTES.radioGolpe;
    this.distEnlace = esMovil ? AJUSTES.distanciaEnlaceMovil : AJUSTES.distanciaEnlace;

    // ── Nodo central ────────────────────────────────────────
    this.centro = new THREE.Group();
    this.centroNucleo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 3),
      new THREE.MeshBasicMaterial({ color: AJUSTES.colorCentro })
    );
    this.centroHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texturaHalo,
        color: AJUSTES.colorHaloCentro,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.centroHalo.scale.setScalar(5.5);
    this.centroHalo.material.opacity = 0.8;
    this.centro.add(this.centroNucleo, this.centroHalo);

    const golpeCentro = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    const etiquetaCentro = crearEtiqueta(CENTRO.titulo, 'etiqueta centro');
    this.centro.add(golpeCentro, etiquetaCentro);
    this.grupo.add(this.centro);

    this.nodoCentral = {
      pos: CERO.clone(),
      datos: CENTRO,
      etiqueta: etiquetaCentro,
      esCentro: true,
    };
    golpeCentro.userData.nodo = this.nodoCentral;
    this.golpes.push(golpeCentro);

    // ── Satélites ───────────────────────────────────────────
    // Una sola geometría compartida por los 12 núcleos.
    const geoNucleo = new THREE.SphereGeometry(AJUSTES.radioNodo, 24, 16);
    const geoGolpe = new THREE.SphereGeometry(radioGolpe, 12, 8);
    const anguloDorado = Math.PI * (3 - Math.sqrt(5));
    const color = new THREE.Color();

    for (let i = 0; i < n; i++) {
      // Esfera de Fibonacci: reparto uniforme, sin solapes al nacer.
      const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = anguloDorado * i;
      const base = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r)
        .multiplyScalar(AJUSTES.radioHogar);
      // Achatada para encajar en la pantalla: ancha en escritorio, alta
      // en un móvil en vertical, y siempre poco profunda para que se lea.
      const a = esMovil ? AJUSTES.achatadoMovil : AJUSTES.achatado;
      base.x *= a.x;
      base.y *= a.y;
      base.z *= a.z;

      const tono = THREE.MathUtils.lerp(AJUSTES.tonoNodoMin, AJUSTES.tonoNodoMax, i / Math.max(1, n - 1));
      color.setHSL(tono, 0.85, 0.78);

      const objeto = new THREE.Group();
      const nucleo = new THREE.Mesh(geoNucleo, new THREE.MeshBasicMaterial({ color: color.clone() }));
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texturaHalo,
          color: color.clone(),
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.scale.setScalar(2.6);
      const golpe = new THREE.Mesh(geoGolpe, new THREE.MeshBasicMaterial({ visible: false }));
      const etiqueta = crearEtiqueta(MENSAJES[i].titulo, 'etiqueta');
      objeto.add(nucleo, halo, golpe, etiqueta);

      const nodo = {
        pos: base.clone().multiplyScalar(0.15), // nacen cerca del centro y florecen
        vel: new THREE.Vector3(),
        home: base.clone(),
        base, // dirección de reposo antes de rotar el marco
        fase: (i / n) * Math.PI * 2,
        arrastrando: false,
        resaltado: false,
        datos: MENSAJES[i],
        objeto,
        nucleo,
        halo,
        etiqueta,
        escalaHalo: 2.6,
      };
      objeto.position.copy(nodo.pos);
      golpe.userData.nodo = nodo;

      this.nodos.push(nodo);
      this.golpes.push(golpe);
      this.grupo.add(objeto);
    }

    // ── Líneas: un único LineSegments preasignado ───────────
    // Radios (centro↔satélite) + telaraña (satélite↔satélite).
    const maxSeg = n + (n * (n - 1)) / 2;
    this.posArr = new Float32Array(maxSeg * 2 * 3);
    this.colArr = new Float32Array(maxSeg * 2 * 3);

    const geo = new THREE.BufferGeometry();
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
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    // La geometría muta cada frame: una esfera envolvente vieja la haría desaparecer.
    this.enlaces.frustumCulled = false;
    this.grupo.add(this.enlaces);

    // Pares dentro del umbral, recogidos por el bucle de física.
    this.paresA = new Int16Array(maxSeg);
    this.paresB = new Int16Array(maxSeg);
    this.paresD = new Float32Array(maxSeg);
    this.numPares = 0;
  }

  /** Física: muelle al reposo, deriva, repulsión mutua y muro de contención. */
  fisica(t, dt) {
    const A = AJUSTES;
    const nodos = this.nodos;
    const n = nodos.length;
    const deriva = this.reducido ? 0 : A.deriva;

    if (!this.reducido) this.marcoYaw += A.rotacionMarco * dt;

    // El marco entero gira: la constelación deriva como un cuerpo.
    const cos = Math.cos(this.marcoYaw);
    const sin = Math.sin(this.marcoYaw);
    for (let i = 0; i < n; i++) {
      const b = nodos[i].base;
      nodos[i].home.set(b.x * cos + b.z * sin, b.y, -b.x * sin + b.z * cos);
    }

    // Un solo bucle de pares: calcula la repulsión y, de paso, apunta
    // qué pares están lo bastante cerca como para dibujar un enlace.
    this.numPares = 0;
    const umbral2 = this.distEnlace * this.distEnlace;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d2 = nodos[i].pos.distanceToSquared(nodos[j].pos);

        if (d2 < umbral2) {
          this.paresA[this.numPares] = i;
          this.paresB[this.numPares] = j;
          this.paresD[this.numPares] = Math.sqrt(d2);
          this.numPares++;
        }

        if (d2 < A.separacion * A.separacion && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          _d.subVectors(nodos[i].pos, nodos[j].pos).divideScalar(d);
          const empuje = (A.separacion - d) * A.kRepulsion;
          // El nodo arrastrado no se mueve, pero sí empuja a los demás.
          if (!nodos[i].arrastrando) nodos[i].vel.addScaledVector(_d, empuje * dt);
          if (!nodos[j].arrastrando) nodos[j].vel.addScaledVector(_d, -empuje * dt);
        }
      }
    }

    const factorAmortiguacion = Math.pow(A.amortiguacion, dt * 60);

    for (let i = 0; i < n; i++) {
      const nodo = nodos[i];
      if (nodo.arrastrando) {
        nodo.objeto.position.copy(nodo.pos);
        continue;
      }

      // Muelle hacia la posición de reposo.
      _f.subVectors(nodo.home, nodo.pos).multiplyScalar(A.kHogar);

      // Deriva: suma de senos, no ruido aleatorio. El ruido por frame
      // hace que el sistema divergiera por mucho que se amortigüe.
      if (deriva > 0) {
        const p = nodo.fase;
        _f.x += Math.sin(t * 0.31 + p) * deriva;
        _f.y += Math.sin(t * 0.27 + p * 2) * deriva;
        _f.z += Math.sin(t * 0.23 + p * 3) * deriva;
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
      nodo.objeto.position.copy(nodo.pos);
    }
  }

  /** Rellena el buffer de líneas y dibuja solo los segmentos usados. */
  actualizarEnlaces(t) {
    const nodos = this.nodos;
    const n = nodos.length;
    const pos = this.posArr;
    const col = this.colArr;
    const [cr, cg, cb] = AJUSTES.colorEnlace;
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

    // Radios hacia el centro: siempre presentes, más brillantes.
    for (let i = 0; i < n; i++) {
      const pulso = this.reducido ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.6 + nodos[i].fase);
      escribir(CERO, nodos[i].pos, 0.85 * pulso);
    }

    // Telaraña: los pares que ya identificó el bucle de física.
    const D = this.distEnlace;
    for (let k = 0; k < this.numPares; k++) {
      const a = nodos[this.paresA[k]];
      const b = nodos[this.paresB[k]];
      const caida = 1 - this.paresD[k] / D;
      const pulso = this.reducido ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.1 + a.fase + b.fase);
      escribir(a.pos, b.pos, 0.55 * caida * caida * pulso);
    }

    this.enlaces.geometry.setDrawRange(0, v);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  /** Latido del centro, halos y desvanecido de etiquetas por distancia. */
  actualizarVisual(t, camara) {
    if (!this.reducido) {
      const latido = 1 + 0.045 * Math.sin(t * 1.1);
      this.centroNucleo.scale.setScalar(latido);
      this.centroHalo.scale.setScalar(5.5 * (2 - latido));
      this.centroHalo.material.opacity = 0.7 + 0.2 * Math.sin(t * 1.1 + Math.PI);
    }

    const lejos = camara.position.length() + AJUSTES.radioHogar;
    for (const nodo of this.nodos) {
      const objetivo = nodo.escalaHalo * (nodo.resaltado ? 1.45 : 1);
      nodo.halo.scale.lerp(_tmp.setScalar(objetivo), 0.15);

      // Sin oclusión por profundidad en CSS2D: se compensa atenuando
      // las etiquetas que quedan detrás.
      const d = camara.position.distanceTo(nodo.pos);
      nodo.etiqueta.element.style.opacity = THREE.MathUtils.clamp(
        1.25 - d / lejos, 0.22, 1
      ).toFixed(2);
    }
  }

  actualizar(t, dt, camara) {
    this.fisica(t, dt);
    this.actualizarEnlaces(t);
    this.actualizarVisual(t, camara);
  }
}
