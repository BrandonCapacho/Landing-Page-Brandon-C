// ══════════════════════════════════════════════════════════════════
//
//   MENSAJES  —  edita SOLO el texto que está entre comillas.
//
//   titulo : lo que se ve flotando en el nodo (corto, 1 a 3 palabras)
//   texto  : el mensaje completo que aparece al tocar el nodo
//
//   Puedes añadir o quitar nodos libremente: la constelación se
//   reacomoda sola. Guarda el archivo en UTF-8 para que los acentos
//   y la ñ se vean bien.
//
// ══════════════════════════════════════════════════════════════════

export const MENSAJES = [
  {
    titulo: 'Tu risa',
    texto:
      'Cuatro mil veces "jaja" en estos meses — las conté, literal. Tu risa es lo primero ' +
      'que busco en cualquier chat, en cualquier llamada. Podría reconocerla entre mil.',
  },
  {
    titulo: 'Tus ojos',
    texto:
      'Hay días en que te quedas mirándome en videollamada sin decir nada y entiendo todo. ' +
      'Tus ojos hablan antes que tú, y nunca han sabido mentirme.',
  },
  {
    titulo: 'Mi vida',
    texto:
      'Te digo "mi vida" tantas veces al día que perdí la cuenta hace rato. ' +
      'No es una frase hecha: es lo más parecido a la verdad que conozco.',
  },
  {
    titulo: 'La calma',
    texto:
      'Contigo se me baja el ruido. Puedo escribirte sin pensar cada palabra, ' +
      'y eso no lo había tenido con nadie más. A tu lado no tengo que estar demostrando nada.',
  },
  {
    titulo: 'Novios no oficiales',
    texto:
      'Nos pasamos semanas discutiendo si éramos novios o "novios no oficiales" — ' +
      'una tontería que ahora me da risa, porque desde el primer mes ya sabía la respuesta.',
  },
  {
    titulo: 'Lo que aprendo',
    texto:
      'Eres la persona que me ha hecho querer ser mejor sin pedírmelo nunca. ' +
      'Aprendo de tu forma de tratar a la gente, de tu paciencia, de cómo no te rindes.',
  },
  {
    titulo: 'Los stickers',
    texto:
      'Tienes un sticker para cada situación de la vida, sin excepción — casi dos mil ' +
      'en lo que llevamos. Es de las cosas más tuyas que existen, y espero que nunca cambie.',
  },
  {
    titulo: 'Princesa',
    texto:
      'Te digo "princesa", "reina", "hermosa" — y tú a veces me dices "gordi" y me muero de risa. ' +
      'Ese es nuestro idioma, y no lo cambiaría por hablar bien en ningún otro.',
  },
  {
    titulo: 'Cuando estás mal',
    texto:
      'Quiero ser el lugar donde puedas llegar rota y no tener que explicarte. ' +
      'No necesito que estés bien siempre. Solo quiero estar cuando no lo estés.',
  },
  {
    titulo: 'Mi promesa',
    texto:
      'Nos hemos pedido perdón muchas veces, y los dos elegimos seguir. ' +
      'Te prometo seguir eligiéndote también en los días en que cueste — esos son los que cuentan.',
  },
  {
    titulo: 'Las Lajas',
    texto:
      'Hablamos en broma de casarnos en Las Lajas, de los anillos, de quién va y quién no. ' +
      'Ojalá en unos años sea broma solo la mitad, y la otra mitad ya esté pasando.',
  },
  {
    titulo: 'Te amo',
    texto:
      'Danika Jusara: te amo. Sin condiciones, sin pruebas pendientes, sin letra pequeña. ' +
      'Lo escribo aquí para que quede, y para que sepas que no me da miedo decirlo.',
  },
];

// El nodo del centro: su nombre y el mensaje de cierre.
export const CENTRO = {
  titulo: 'Danika Jusara',
  texto:
    'Todo lo que ves alrededor sale de aquí, de ti. ' +
    'Cada nodo es una razón, y todavía me faltan muchas por escribir. — Brandon',
};

// Texto de la interfaz (título de la página, pistas, pie).
export const TEXTOS = {
  tituloPagina: 'Para Danika Jusara',
  subtitulo: 'Una constelación de razones',
  pistaEscritorio: 'Arrastra los nodos · haz clic para leer · gira la escena con el fondo',
  pistaMovil: 'Arrastra los nodos · tócalos para leer',
  firma: 'Hecho a mano por Brandon',
  cerrar: 'Cerrar',
};

// ══════════════════════════════════════════════════════════════════
//   AJUSTES TÉCNICOS — no hace falta tocar nada de aquí para abajo.
// ══════════════════════════════════════════════════════════════════

export const AJUSTES = {
  radioHogar: 6, // radio de reposo de la constelación
  radioMax: 9, // muro: ningún nodo puede pasar de aquí

  // La esfera de reposo se achata para adaptarse a la pantalla: ancha
  // y baja en escritorio, alta y estrecha en un móvil en vertical.
  achatado: { x: 1, y: 0.82, z: 0.7 },
  achatadoMovil: { x: 0.6, y: 1, z: 0.7 },
  // Espacio libre alrededor. El vertical es mayor en escritorio porque
  // ahí el título y la firma se comen los bordes de la pantalla.
  margenEncuadre: { x: 1.5, y: 2.4 },
  margenEncuadreMovil: { x: 1.4, y: 1.5 },
  // Desplazamiento del centro de la escena: en móvil sube para dejar
  // sitio a la hoja inferior; en escritorio baja para librar el título.
  desvioY: 0.35,
  desvioYMovil: -0.9,

  distanciaEnlace: 5.5, // los nodos se conectan bajo esta distancia
  distanciaEnlaceMovil: 4.8,

  radioNodo: 0.4, // tamaño visible del nodo
  radioGolpe: 0.4, // objetivo de clic (invisible, escritorio)
  radioGolpeMovil: 0.85, // objetivo táctil, más grande a propósito

  // Física
  kHogar: 3.4, // fuerza del muelle hacia la posición de reposo
  deriva: 1.5, // amplitud del vaivén
  separacion: 1.9, // distancia mínima cómoda entre nodos
  kRepulsion: 8,
  kMuro: 4,
  amortiguacion: 0.9, // por cada 1/60 s
  velocidadMax: 8,
  rotacionMarco: 0.05, // rad/s a los que gira la constelación entera

  // Estrellas
  estrellas: 1200,
  estrellasMovil: 450,

  // Colores
  colorCentro: 0xffe3ee,
  colorHaloCentro: 0xff6fae,
  colorEnlace: [1.0, 0.42, 0.68],
  tonoNodoMin: 0.82, // matiz HSL: 0.82 violeta → 0.96 rosa
  tonoNodoMax: 0.96,
};
