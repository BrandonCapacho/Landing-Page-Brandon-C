# Desarrollo de la constelación

Documentación técnica para desarrolladores que quieran entender o extender la constelación interactiva.

## Arquitectura

### Módulos

- **`main.js`** — Arranque y bucle de render. Detecta WebGL, carga módulos, inicializa Three.js, controla estado (corriendo/parado), interpola encuadre de cámara.
- **`constellation.js`** — Construcción y actualización de nodos. Define `Constelacion`, mallas (centro, principales, secundarios), física, racimos, shaders, etiquetas CSS.
- **`interaction.js`** — Manejo de eventos: raycast en dos pasadas (mallas + Points), dos pasos (zoom → panel), arrastre de nodos, Escape para salir.
- **`scene.js`** — Escena Three.js: cámara, estrellas de fondo, materiales, texturas (halo y puntos).
- **`config.js`** — Datos (MENSAJES, RAZONES, CENTRO, TEXTOS) y 96 constantes de ajuste.

### Flujo de datos

1. **Carga**: `config.js` → `constellation.js` (construye malla + geometría + shader)
2. **Renderizado**: bucle → `constelacion.actualizar()` → `pasoEncuadre()` → render
3. **Interacción**: raycast → `abrirOEntrar()` → `establecerFoco()` + `panel.abrir()`

## Nodos y racimos

### Topología
- **Centro**: nodo único (`CENTRO`), malla invisible, userData cargada, matriz propia.
- **Principales**: 12 nodos grandes (MENSAJES), mallas esféricas, userData con índice.
- **Secundarios**: 100 puntos pequeños (RAZONES), geometría única `Points` con índices de atributo.
- **Racimos**: cada principal lleva una `idxRacimo`; los secundarios se distribuyen en orden por `limitesRacimo()`.

### Distribución

`limitesRacimo(segmentos = RAZONES.length, grupos = MENSAJES.length)` calcula límites entre racimos:
```javascript
const limites = [];
for (let i = 0; i <= grupos; i++) {
  limites[i] = Math.round((i * segmentos) / grupos);
}
```

Así, 100 razones + 12 mensajes = [0, 8, 16, 25, 33, 41, 50, 58, 66, 75, 83, 91, 100].

## Física

### Muelles
Cada nodo (principal o secundario) tiene:
- `pos` (Vector3): posición actual
- `vel` (Vector3): velocidad para integración semiimplícita
- `posReposo` (Vector3): ancla del muelle

Cada frame (dt en segundos):
1. Aplicar fuerzas: repulsión vecinos, atracción muelle
2. Integración: `pos += vel * dt + aceleración * dt²`
3. Amortiguamiento: `vel *= 0.97` (sin fricción de aire, solo resorte)

### Posiciones de reposo
- **Centro**: (0, 0, 0)
- **Principales**: distribuidos en esfera de radio `extensionPri`
- **Secundarios**: distribuidos alrededor del principal de su racimo, en una nube según `alcanceRacimo`

## Shaders

### Punto secundario (apagable)
Archivo sin nombre, incrustado en `constellation.js`:
```glsl
varying vec3 vColor;
void main() {
  vec3 color = texture2D(texturaPunto, gl_PointCoord).rgb * vColor;
  if (color.r + color.g + color.b < 0.004) discard;
  gl_FragColor = vec4(color, 1.0);
}
```

Por qué `discard` y no alpha: evita acumulación de transparencia en canvas con fondo transparente, que haría puntos "apagados" visibles como negros.

### Resaltado por GPU
Atributo `aResalte` (valor 0–1) interpola desde el shader hacia un uniforme de resaltado global `uResaltado`. El fragmento final es `color = mix(base, resaltada, resalte * uResaltado)`.

## Etiquetas y separación

### Índice `--sep`
Cada etiqueta (elemento DOM flotante) recibe una variable CSS `--sep` calculada por `apartarEtiqueta()`:

```javascript
function apartarEtiqueta(nodo, index) {
  const { x, y } = nodo.pos.clone().project(camara);
  const r = renderer.domElement.getBoundingClientRect();
  const sx = r.left + (x + 1) / 2 * r.width;
  const sy = r.top + (-y + 1) / 2 * r.height;
  
  // Desplazamiento hacia afuera
  const angle = Math.atan2(sy - r.top - r.height/2, sx - r.left - r.width/2);
  const sepX = Math.cos(angle) * AJUSTES.sepNodo;
  const sepY = Math.sin(angle) * AJUSTES.sepNodo;
  
  nodo.etiqueta.element.style.setProperty('--sep', `${sepX}px ${sepY}px`);
}
```

### Evitar solapamiento
`_repartirEnPantalla()` evalúa dos restricciones:
1. **Círculo de discos**: cada disco (nodo renderizado) debe estar alejado `RN` pixels de otros.
2. **Elipse de etiquetas**: cada etiqueta desplazada debe alejarse `CX`/`RX`/`RY` pixels según su forma.

Si hay violación, aumenta `sepNodo` hasta que ambas restricciones pasen.

## Raycast y colisión

### Dos pasadas
`golpear(e)`:
1. Mallas invisibles (centro + principales): first intersection
2. `Points` de secundarios: only those in focused racemo

Sesgo (`sesgoCentro`, `sesgoPrincipal`): si una secondary está casi tan cerca como una malla, la malla gana por este umbral.

### Umbral de puntos
`raycaster.params.Points.threshold` = `umbralPuntos` (escritorio) o `umbralPuntosMovil`. Un radio en unidades de mundo que crece/decrece con el tamaño visual.

## Interacción: dos pasos

### Paso 1: Entrada a rama
Función `abrirOEntrar(nodo)`:
- Si es principal y no es el racimo enfocado: `establecerFoco(idxRacimo)` + `enfocarCamara(nodo)` + return.
- Si ya es el racimo enfocado o es secundario: continúa al paso 2.

### Paso 2: Abrir panel
`panel.abrir(nodo.datos)`:
- Carga `titulo` y `texto` en el DOM
- Anima entrada (opacidad, focus)
- Escape cierra

### Escape desde rama
Listener global en documento: si panel está cerrado y `racimoEnfocado !== null`, limpia foco y devuelve cámara.

## Encuadre de cámara

### Estados
- `racimoMirado = null` → mira al conjunto (centro 0,0,0)
- `racimoMirado = idx` → mira al centro del racimo idx

### Cálculo de distancia
- `distConjunto`: distancia al conjunto desde el aspecto y extensión medida
- `distRacimo`: distancia a un racimo desde su alcance local

### Interpolación
`pasoEncuadre(dtReal)` cada frame:
```javascript
const k = 1 - Math.pow(1 - AJUSTES.velocidadEncuadre, dtReal);
controles.target.lerp(metaMira, k);
camara.position.copy(controles.target).addScaledVector(dirección, nuevoRadio / antiguo);
```

Así la duración es independiente del framerate.

## Movimiento reducido

Si `prefers-reduced-motion: reduce`:
- `modoDemanda = true`: bucle entra en modo demanda (no gira)
- Solo corre cuando hay movimiento de física o interacción
- Cuenta 12 frames quietos consecutivos para parar
- `pedirRender()` reinicia la cuenta y arranca el bucle

## Respaldo (sin WebGL)

`mostrarRespaldo()` genera una lista `<ul>` con:
- Cada `<li>` = un mensaje (MENSAJES[i])
- Subitems `<ul>` = sus razones (RAZONES en el rango de `limites`)

Se muestra si:
- No hay WebGL
- Error en importación o error no capturado antes de `canvas.dataset.listo = '1'`
- Timeout de 10s sin listo (CDN colgado)

## Testing

Script de validación en `check_ramas.mjs`:
- Abre navegador (Playwright)
- Simula cinco pasos (llega, entra, abre, hover razón, sale)
- Verifica estado de cada etapa (cámara, nodos encendidos, panel visible)
- Testea móvil (390×844, touch)
- Testea movimiento reducido (sin frames en reposo)
- Captura pantallas

Ejecutar: `node check_ramas.mjs`

## Constantes críticas (en config.js, sección AJUSTES)

| Nombre | Efecto |
|---|---|
| `extensionPri` | Radio de la esfera de principales |
| `alcanceRacimo` | Nube de secundarios por eje (XYZ) |
| `velocidadEncuadre` | Interpolación de cámara (0–1, más lento = menor) |
| `radioMax` | Límite de arrastre de nodos en pantalla |
| `sepNodo` | Separación mínima de etiquetas |
| `umbralPuntos` | Raycast hitbox para secundarios (escritorio) |
| `umbralPuntosMovil` | Raycast hitbox para secundarios (móvil) |
| `distanciaEncuadre` | Multiplier de distancia al conjunto |
| `distanciaRacimo` | Multiplier de distancia a un racimo |

Cada una lleva comentario de por qué vale lo que vale.

## Notas de desarrollo

- **Three.js r185+**: usa `Timer` en lugar de `Clock` (Clock quedó obsoleto).
- **CSS2DRenderer**: no asigna `pointer-events: none`, hay que hacerlo manualmente.
- **devicePixelRatio**: se limita a 2 en escritorio, 1.5 en móvil (evita overhead en retina).
- **Pointer Events**: unifica mouse y touch en un solo listener con `capture: true` para poder frenar OrbitControls.
- **Profundidad de raycast**: dos pasadas en orden (mallas, luego Points visibles) con sesgo para dirimir empates.
