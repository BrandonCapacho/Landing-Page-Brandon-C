# Constelación de razones

Una constelación interactiva en 3D que presenta 12 mensajes principales, cada uno con sus propias razones. Explora desde cero (12 puntos visibles) hasta los detalles de cada rama. Ver en línea: [brandoncapacho.github.io/Landing-Page-Brandon-C](https://brandoncapacho.github.io/Landing-Page-Brandon-C/)

## Cómo se recorre

1. **Al llegar** — ves solo los 12 nodos grandes, flotando en el espacio.
2. **Primer toque en un nodo** — la cámara se acerca a esa rama y se encienden sus razones (los puntos pequeños alrededor).
3. **Segundo toque** — se abre el mensaje completo de ese nodo.
4. **Pasar el cursor sobre una razón** — ves su frase completa en un rótulo flotante.
5. **Volver al conjunto** — toca el fondo del cielo, presiona Esc, o toca el nodo del centro.

## Cómo cambiar los textos

Todo vive en `js/config.js`. Solo hay tres cosas que editar:

### MENSAJES (los 12 nodos grandes)
Busca `export const MENSAJES` — es una lista de 12 objetos:
```javascript
{ titulo: "La calma", texto: "En un mundo de ruido..." }
```
- `titulo`: lo que flota en el nodo.
- `texto`: el mensaje que se abre al tocarlo.

### RAZONES (los 100 puntos pequeños)
Busca `export const RAZONES` — es una lista de 100 filas:
```javascript
["Respirar", "Soltar la prisa"]
```
- Primera parte: la etiqueta que aparece en el rótulo.
- Segunda parte: la frase completa.

**Importante:** se reparten **en orden** alrededor de los 12 mensajes, así que si dejas juntas las razones de un mismo tema, se agrupan automáticamente en la misma rama.

### CENTRO y TEXTOS
- `CENTRO`: el nombre y texto del nodo central (el botón de "volver").
- `TEXTOS`: el título de la página, subtítulo y firma.

### Avisos al editar
- Edita **solo lo que está entre comillas**; deja las comas igual.
- Si una frase lleva apóstrofo (`no lo cambiaría por 'esto'`), escápalo con barra invertida (`\'`) o usa comillas dobles alrededor: `"no lo cambiaría por 'esto'"`.
- Guarda el archivo en **UTF-8** para que los acentos y la ñ se vean correctamente.

### Flexibilidad
Puedes poner 10 razones, 100 o 300 — la constelación se reacomoda sola. Nada está codificado en piedra. Todo sale de `MENSAJES.length` y `RAZONES.length` (ver `limitesRacimo()` en `js/config.js`).

## Cómo verlo en tu computador

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta: `python3 -m http.server 8000`
3. Abre en el navegador: `http://localhost:8000`

**Nota:** no funciona hacer doble clic en `index.html`. Los navegadores bloquean los módulos de JavaScript en `file://`, así que necesitas un servidor (aunque sea local).

## Cómo se publica

Sube los cambios a la rama `main` y GitHub Pages los despliega en un par de minutos. No hay que compilar nada.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura HTML: canvas, panel, respaldo. |
| `css/styles.css` | Estilos: la interfaz, transiciones, colores. |
| `js/config.js` | Tus textos (MENSAJES, RAZONES, CENTRO, TEXTOS) y constantes de ajuste. |
| `js/main.js` | Arranque: detecta WebGL, monta la escena, lleva el bucle de render. |
| `js/constellation.js` | La constelación: nodos, razones, física de muelles, shaders. |
| `js/interaction.js` | Interacción: clicks, arrastres, encuadre de cámara. |
| `js/scene.js` | Escena Three.js: cámara, estrellas de fondo, materiales. |

**Constantes de ajuste:** de `AJUSTES` hacia abajo en `config.js` hay 96 valores de tamaños, colores y física. No hace falta tocar nada — cada uno lleva un comentario de por qué vale lo que vale, por si algo se descoloca y necesitas entender la conexión.

## Si no se ve la constelación

La página trae una versión de respaldo que lista los 12 mensajes y sus razones como texto simple. Aparece automáticamente si tu dispositivo no puede renderizar en 3D, o si el CDN falla. Así la declaración siempre se lee, con o sin gráficos.
