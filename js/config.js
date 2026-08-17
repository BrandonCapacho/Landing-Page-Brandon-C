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
      'Tu risa es lo primero que busco en cualquier lugar. No importa cómo venga el día: ' +
      'te escucho reír y algo dentro de mí se acomoda. Creo que podría reconocerla entre mil.',
  },
  {
    titulo: 'Tus ojos',
    texto:
      'Hay días en que te quedas mirándome sin decir nada y entiendo todo. ' +
      'Tus ojos hablan antes que tú, y nunca han sabido mentirme.',
  },
  {
    titulo: 'Tu voz',
    texto:
      'Me gusta cómo dices mi nombre. Suena distinto cuando lo dices tú, ' +
      'como si me lo estuvieras devolviendo mejor de como te lo di.',
  },
  {
    titulo: 'La calma',
    texto:
      'Contigo se me baja el ruido. Puedo estar callado y no sentirme incómodo, ' +
      'y eso no lo había tenido con nadie más. A tu lado no tengo que estar demostrando nada.',
  },
  {
    titulo: 'El primer día',
    texto:
      'Todavía me acuerdo del día en que empezó todo esto. En ese momento no sabía ' +
      'que iba a ser importante, y mírame ahora: construyendo esto para decírtelo.',
  },
  {
    titulo: 'Lo que aprendo',
    texto:
      'Eres la persona que me ha hecho querer ser mejor sin pedírmelo nunca. ' +
      'Aprendo de tu forma de tratar a la gente, de tu paciencia, de cómo no te rindes.',
  },
  {
    titulo: 'Tus manías',
    texto:
      'Me gustan hasta las cosas que tú crees que son defectos. Esas manías tuyas ' +
      'que sacas cuando estás cansada o distraída son mis partes favoritas.',
  },
  {
    titulo: 'La distancia',
    texto:
      'Los kilómetros y los horarios son un detalle logístico, no un final. ' +
      'Tú vales cada espera, cada mensaje a deshora, cada plan que hay que reacomodar.',
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
      'Te prometo escucharte de verdad, no solo esperar mi turno para hablar. ' +
      'Te prometo elegirte también los días difíciles, que son los que de verdad cuentan.',
  },
  {
    titulo: 'El futuro',
    texto:
      'Pienso en cosas pequeñas: un desayuno sin prisa, un viaje mal planeado, ' +
      'discutir por una tontería y arreglarlo a los diez minutos. Contigo, todo eso suena bien.',
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
