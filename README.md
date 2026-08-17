# Para Danika Jusara

Una constelación 3D interactiva: cada nodo guarda un mensaje. Se pueden
arrastrar con el mouse o con el dedo, y al tocarlos se abre lo que dicen.

Hecho con [three.js](https://threejs.org/) `0.185.1` cargado desde CDN.
No hay build, no hay `npm install`, no hay dependencias que instalar.

---

## Cambiar los mensajes

**Todo el texto vive en un solo archivo: [`js/config.js`](js/config.js).**
No hace falta tocar nada más.

Abre ese archivo y edita lo que está entre comillas:

```js
export const MENSAJES = [
  {
    titulo: 'Tu risa',                    // lo que flota en el nodo
    texto: 'Tu risa es lo primero que…',  // lo que aparece al tocarlo
  },
  // …
];
```

- `titulo`: corto, de una a tres palabras. Es lo que se ve flotando.
- `texto`: el mensaje completo. Puede ser tan largo como quieras; el panel
  hace scroll solo.
- Puedes **añadir o quitar nodos** libremente. La constelación se
  reacomoda sola: no hay ningún número escondido en otro archivo.
- `CENTRO` es el nodo del medio (el nombre y el mensaje de cierre).
- `TEXTOS` son el título de la página, la pista de uso y la firma.

Guarda siempre en **UTF-8** para que los acentos y la `ñ` se vean bien.
Cualquier editor moderno lo hace por defecto.

Más abajo en el mismo archivo está `AJUSTES`, con los números de la física
y los colores. No hace falta tocarlos, pero si quieres experimentar:
`radioHogar` cambia el tamaño de la constelación y `deriva` cuánto se
mueven los nodos.

---

## Verlo en tu computador

Los módulos ES no funcionan abriendo el archivo directamente (`file://`).
Hay que levantar un servidor, y con Python basta:

```bash
python3 -m http.server 8000
```

Luego abre <http://localhost:8000/>.

---

## Publicarlo

El repositorio ya está listo. Solo falta encender GitHub Pages:

1. En GitHub, ve a **Settings → Pages**.
2. En *Source*, elige **Deploy from a branch**.
3. Escoge la rama y la carpeta `/ (root)`. Guarda.

En un par de minutos queda en:

```
https://brandoncapacho.github.io/Landing-Page-Brandon-C/
```

El archivo `.nojekyll` está para que GitHub Pages no procese nada por su
cuenta. Todas las rutas son relativas (`./css/…`, `./js/…`), así que
funciona igual en la raíz de un dominio que en una subcarpeta.

---

## Detalles técnicos

- **Cero archivos binarios.** El brillo de los nodos y las estrellas se
  dibujan en un `<canvas>` al arrancar, así que no hay imágenes que se
  puedan romper ni que haya que descargar.
- **Respaldo.** Si el navegador no tiene WebGL, es muy viejo, o el CDN no
  responde, la página muestra los mensajes como una lista legible en vez
  de una pantalla en negro.
- **Accesibilidad.** El panel es un diálogo real con foco gestionado y
  cierre con `Esc`. Con `prefers-reduced-motion` la escena se aquieta y
  el bucle de render se apaga cuando no pasa nada.
- **Móvil.** Los objetivos táctiles son más grandes que los nodos
  visibles, el panel es una hoja inferior, y el pinch está desactivado
  para que un segundo dedo no arranque el nodo que estás arrastrando.

### Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura, importmap de three.js, panel y respaldo |
| `css/styles.css` | Estilos |
| `js/config.js` | **Los mensajes y los ajustes** |
| `js/main.js` | Arranque, bucle, resize, movimiento reducido |
| `js/scene.js` | Cámara, estrellas, textura de brillo |
| `js/constellation.js` | Nodos, física y líneas |
| `js/interaction.js` | Arrastre, toques y panel |

### Si el CDN alguna vez falla

Se pueden guardar las librerías dentro del repo. Hay que copiar **cuatro**
archivos (desde r167 el build de three.js viene partido en dos):

```
three.module.js  →  vendor/three.module.js
three.core.js    →  vendor/three.core.js        ← imprescindible
OrbitControls.js →  vendor/addons/controls/OrbitControls.js
CSS2DRenderer.js →  vendor/addons/renderers/CSS2DRenderer.js
```

Y cambiar el `importmap` de `index.html` para que apunte a `./vendor/…`
en vez de a jsdelivr. La barra final de `"three/addons/"` es obligatoria
en la clave y en el valor.
