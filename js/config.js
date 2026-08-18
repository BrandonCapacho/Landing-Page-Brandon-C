// ══════════════════════════════════════════════════════════════════
//
//   MENSAJES  —  edita SOLO el texto que está entre comillas.
//
//   Estos 12 son los nodos grandes: su título se ve siempre.
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

// ══════════════════════════════════════════════════════════════════
//
//   RAZONES  —  los puntos pequeños que rodean cada mensaje grande.
//
//   Cada fila es ['etiqueta', 'frase']:
//   'etiqueta' : 1 a 3 palabras; solo se ve al pasar por encima o al
//                arrastrar el punto — va en una píldora pequeña.
//   'frase'    : la línea que se abre en el panel al hacer clic.
//
//   Puedes poner las que quieras (10, 100, 300): se reparten solas
//   alrededor de los 12 mensajes de arriba, EN ORDEN — las primeras
//   razones orbitan el primer mensaje, las siguientes el segundo, y
//   así. Si quieres que un grupo tenga tema propio, deja sus razones
//   juntas aquí. Guarda en UTF-8 para que los acentos y la ñ salgan
//   bien.
//
// ══════════════════════════════════════════════════════════════════

export const RAZONES = [
  // — junto a "Tu risa" —
  ['Buenos días', 'Lo primero que hago cada mañana es escribirte buenos días, aunque sea con los ojos cerrados.'],
  ['Chistes malos', 'Me río de tus chistes malos igual que de los buenos. Los dos me gustan por igual.'],
  ['Sin importancia', 'Te cuento cosas sin importancia solo porque sé que te van a hacer reír.'],
  ['Reírnos después', 'Sabemos reírnos de nuestras propias peleas tontas al día siguiente.'],
  ['La carcajada', 'Cuando te da la risa de verdad, la de no poder hablar, es mi sonido favorito del mundo.'],
  ['A deshoras', 'Te mando memes a las horas más raras solo para verte reaccionar.'],
  ['El mismo humor', 'Tenemos el mismo humor de tonto, y no lo cambiaría por uno más serio.'],
  ['Mensajes viejos', 'A veces me río solo viendo tus mensajes viejos.'],

  // — junto a "Tus ojos" —
  ['Videollamada', 'Prefiero verte por videollamada haciendo nada que hacer algo interesante sin ti.'],
  ['Quedarte dormida', 'Me gusta quedarme viéndote mientras te duermes en la llamada.'],
  ['Sin arreglarte', 'Me gustas más recién despierta, sin arreglarte, que en cualquier foto.'],
  ['Antes de decirlo', 'Se te nota en la cara cuando estás pensando algo antes de decirlo.'],
  ['Leerte la cara', 'Sé leerte la cara aunque me digas que estás bien.'],
  ['De por medio', 'Una pantalla de por medio y aun así me sigues pareciendo la persona más linda que conozco.'],
  ['Entre mil', 'Te reconocería entre mil por cómo frunces la nariz cuando algo no te gusta.'],
  ['La foto que odias', 'Tengo una foto tuya de las que tú odias que es mi favorita de todas.'],

  // — junto a "Mi vida" —
  ['Corazón', 'Corazón es la palabra que más se repite en este chat, sin competencia.'],
  ['Bebe', 'Me dices bebe y ya es un nombre que siento más mío que el real.'],
  ['Preciosa', 'Preciosa te queda bien hasta en los días en que estás de mal genio.'],
  ['Apodo nuevo', 'Cada semana se nos ocurre un apodo nuevo, y siempre se queda pegado.'],
  ['Delante de todos', 'Uso tu apodo hasta delante de la gente, y no me importa que se rían.'],
  ['Según el humor', 'Cambias de apodo según el humor del día, y ya aprendí a distinguir cuál viene.'],
  ['Nombres inventados', 'Nos hemos inventado más nombres el uno para el otro que los que de verdad tenemos.'],
  ['Perder la cuenta', 'Si contara cuántas veces te he dicho algo bonito en este chat, perdería la cuenta enseguida.'],
  ['Mi persona', '"Mi persona" es otra forma en la que a veces te digo mi vida, y me gusta tanto como la original.'],

  // — junto a "La calma" —
  ['Desde que despierto', 'Te escribo desde que me despierto hasta que me duermo, y nunca se me acaba de qué hablarte.'],
  ['Buenas noches', 'Lo último que hago antes de dormir es mandarte buenas noches, sin excepción.'],
  ['Audio mal grabado', 'Prefiero mandarte una nota de voz mal grabada que un mensaje bien escrito.'],
  ['Sin nada que decir', 'Hay días que no tengo nada que decir y te escribo igual, solo para estar.'],
  ['Cien mil mensajes', 'Tenemos más de cien mil mensajes y todavía se me quedan cosas por contarte.'],
  ['Silencio cómodo', 'Podemos estar en llamada sin hablar y no se siente raro.'],
  ['El día completo', 'Te cuento el día completo aunque no haya pasado nada importante.'],
  ['Cómo estás', 'Te pregunto cómo estás más veces de las que puedo contar, y siempre quiero la respuesta de verdad.'],

  // — junto a "Novios no oficiales" —
  ['Por una tontería', 'Podemos discutir media hora por una tontería y reírnos de eso al día siguiente.'],
  ['Chiste interno', 'Tenemos chistes que no le explicaría a nadie más porque no tendrían sentido.'],
  ['En serio', 'Cuando te digo Danika en vez de un apodo, sabes que hablo en serio.'],
  ['Pelea de mentira', 'Nos peleamos por cosas absurdas solo para hacer las paces después.'],
  ['Reglas propias', 'Nos inventamos reglas de pareja antes de siquiera serlo oficialmente.'],
  ['Las mismas historias', 'Me sé tus historias de memoria y te las pido que me las cuentes otra vez de todos modos.'],
  ['Ya nos daban por hecho', 'Hasta la gente que nos rodea ya nos daba por hecho antes que nosotros mismos.'],
  ['Teclas mal puestas', 'Te escribo entre risas con las teclas mal puestas cuando algo me hace demasiada gracia.'],

  // — junto a "Lo que aprendo" —
  ['Tu paciencia', 'Tienes una paciencia conmigo que yo no tendría ni conmigo mismo.'],
  ['Con quien no te ve', 'Veo cómo tratas a la gente que no te puede devolver nada, y ahí se nota quién eres de verdad.'],
  ['No rendirte', 'Nunca te he visto rendirte con algo que de verdad te importa.'],
  ['Escuchar de verdad', 'Sabes escuchar sin estar pensando en qué vas a responder.'],
  ['Tu honestidad', 'Prefieres decirme la verdad incómoda que una mentira que me haga sentir bien un rato.'],
  ['Sin guardar cuentas', 'Sabes perdonar sin guardar cuentas después, y eso no es tan común.'],
  ['Días difíciles', 'Sigues intentando incluso en los días en que todo te sale mal.'],
  ['Sin llevar la cuenta', 'Haces cosas por mí sin esperar que yo lleve la cuenta.'],
  ['Ser mejor', 'Contigo se me quitan las ganas de ser mediocre en las cosas que de verdad importan.'],

  // — junto a "Los stickers" —
  ['Audios de tres minutos', 'Me mandas audios de tres minutos contándome algo que en texto serían dos líneas, y los oigo completos siempre.'],
  ['Sin molestarme', 'Sé que estás ocupada por cómo tardas en contestar, y aun así espero sin molestarme.'],
  ['Fotos sin explicación', 'Me mandas fotos de cosas random del día sin explicación, y esa es tu forma de decir "aquí estoy".'],
  ['Letras al revés', 'Escribes con las letras al revés cuando te emocionas, y ya sé traducirlo sin pensar.'],
  ['Ya te cuento', 'Cuando dices "ya te cuento" sé que viene una historia larga, y ya me estoy preparando.'],
  ['Puntos suspensivos', 'Tus mensajes con puntos suspensivos significan cosas distintas según el día, y ya aprendí el código.'],
  ['Un rato para mí', 'Aunque estés ocupada, siempre encuentras un rato para contestar, y eso no se me pasa por alto.'],
  ['El "aja"', 'Un simple "aja" tuyo puede significar mil cosas distintas, y siempre le entiendo el tono.'],

  // — junto a "Princesa" —
  ['Tu forma de hablar', 'Tienes una forma de hablar que reconocería en medio de un cuarto lleno de gente.'],
  ['Cuando te emocionas', 'Hablas más rápido cuando algo te emociona, y se te nota antes de que lo digas.'],
  ['Tus manos', 'Me gusta cómo se ven tus manos hasta en las fotos donde no es lo importante.'],
  ['De espaldas', 'Reconocería tu forma de caminar aunque estuvieras lejos y de espaldas.'],
  ['Recién levantada', 'Te ves bien arreglada, pero mejor todavía recién levantada sin haber hecho nada.'],
  ['Tu perfume', 'Hay un perfume que ya asocio contigo para siempre, aunque lo use otra persona.'],
  ['Tu letra', 'Tienes una letra torcida que me gusta más que cualquier letra bonita.'],
  ['Risa en los ojos', 'Se te nota la risa en los ojos antes de que se te note en la boca.'],

  // — junto a "Cuando estás mal" —
  ['Sin insistir', 'Sé cuándo no quieres hablar de algo y me quedo cerca sin insistir.'],
  ['Días grises', 'En los días en que todo te sale mal, sigo queriendo saber cómo estás, no solo esperar que pase.'],
  ['Sin explicaciones', 'No necesito que me expliques por qué estás mal para quedarme.'],
  ['Tus dudas', 'Cuando dudas de ti misma, yo no dudo ni un segundo.'],
  ['Con mal genio', 'Hasta con mal genio sigues siendo la persona con la que quiero hablar primero.'],
  ['Sin fingir', 'Quiero ser de las pocas personas con las que no tienes que fingir que estás bien.'],
  ['Mientras pasa', 'No sé arreglar todo lo que te hace llorar, pero sé quedarme mientras pasa.'],
  ['Contar hasta diez', 'Cuando te enojas contigo misma, te ayudo a contar hasta diez en vez de dejarte sola con eso.'],
  ['Volver a estar bien', 'Después de un mal día siempre encontramos la forma de volver a estar bien.'],

  // — junto a "Mi promesa" —
  ['No una costumbre', 'Cada día que sigo aquí es una elección, no una costumbre.'],
  ['A la primera', 'Prometo no rendirme con esto la primera vez que se complique.'],
  ['En vez de adivinar', 'Prometo decirte las cosas en vez de esperar que las adivines.'],
  ['Aunque sea largo el día', 'Prometo estar presente aunque el día haya sido largo y solo quiera dormir.'],
  ['Sin comparar', 'Prometo no medirte con nadie que haya conocido antes de ti.'],
  ['Como si fueran míos', 'Prometo alegrarme por tus logros como si fueran míos, porque en cierta forma lo son.'],
  ['Lugar seguro', 'Prometo que este va a seguir siendo un lugar seguro para ti, pase lo que pase.'],
  ['Una decisión', 'Prometo que esto para mí no es un sentimiento, es una decisión que renuevo todos los días.'],

  // — junto a "Las Lajas" —
  ['Lugares nuevos', 'Quiero conocer contigo lugares que ninguno de los dos ha visto todavía.'],
  ['Vivir juntos', 'Ya bromeamos con vivir juntos, y cada vez la broma se siente menos broma.'],
  ['De vieja', 'Quiero verte de vieja y seguir pensando que fue buena idea quedarme.'],
  ['Nuestra casa', 'Imagino una casa con las dos cosas que nos gustan mezcladas sin pelear por el espacio.'],
  ['En el fondo', 'A veces hablamos en broma de cómo serían nuestros hijos, y en el fondo no suena tan lejano.'],
  ['Sin planear nada', 'Quiero hacer contigo viajes de fin de semana sin planear nada.'],
  ['El día que te gradúes', 'Quiero estar ahí el día que te gradúes, aplaudiendo más fuerte que nadie.'],
  ['Presentarte', 'Quiero seguir presentándote como mi persona, sin importar cuántas veces lo repita.'],

  // — junto a "Te amo" —
  ['Sin miedo', 'Ya no me da miedo decir que te amo primero.'],
  ['Un poco más', 'Te amo un poco más cada semana, aunque ya pensaba que no se podía.'],
  ['En cualquier idioma', 'Te amo en español, y en cualquier idioma que se me ocurra intentar.'],
  ['Sin condiciones', 'Te sigo escogiendo incluso en las versiones de ti que menos te gustan de ti misma.'],
  ['Cien veces más', 'Podría escribir tu nombre cien veces más y no me cansaría.'],
  ['La única', 'De todas las conversaciones que he tenido en mi vida, esta es la única que no quiero que se acabe.'],
  ['Lo aburrido', 'Contigo hasta lo aburrido se vuelve algo que quiero hacer.'],
  ['Gracias', 'Gracias por quedarte incluso los días en que no fue fácil quedarse.'],
  ['Para siempre', 'Si "para siempre" existe, quiero intentarlo contigo primero.'],
];

export const SECUNDARIOS = RAZONES.map(([titulo, texto]) => ({ titulo, texto }));

/**
 * Límites del reparto de razones entre racimos, balanceado a ±1: las
 * razones del racimo `c` son las de índice [limites[c], limites[c+1]).
 * La usan tanto la escena 3D (constellation.js) como el respaldo sin
 * WebGL (main.js), para que los dos agrupen igual.
 */
export function limitesRacimo() {
  const nPri = MENSAJES.length;
  const nSec = SECUNDARIOS.length;
  const limites = [];
  for (let c = 0; c <= nPri; c++) limites.push(Math.floor((c * nSec) / nPri));
  return limites;
}

// Texto de la interfaz (título de la página, pistas, pie).
export const TEXTOS = {
  tituloPagina: 'Para Danika Jusara',
  subtitulo: 'Una constelación de razones',
  pistaEscritorio: 'Arrastra los nodos · pasa el cursor por los puntos pequeños · haz clic para leer',
  pistaMovil: 'Arrastra los nodos · los puntos pequeños también se tocan',
  firma: 'Hecho a mano por Brandon',
  cerrar: 'Cerrar',
};

// ══════════════════════════════════════════════════════════════════
//   AJUSTES TÉCNICOS — no hace falta tocar nada de aquí para abajo.
// ══════════════════════════════════════════════════════════════════

export const AJUSTES = {
  radioHogar: 5.6, // radio de reposo de los 12 principales
  radioMax: 9.6, // muro: ningún nodo puede pasar de aquí

  // La esfera de reposo se achata para adaptarse a la pantalla: ancha
  // y baja en escritorio, alta y estrecha en un móvil en vertical.
  // Los secundarios heredan el mismo achatado que su racimo: aplicar
  // uno distinto por nivel los desalinearía de su principal.
  achatado: { x: 1.12, y: 0.86, z: 0.55 },
  achatadoMovil: { x: 0.62, y: 1.06, z: 0.55 },
  // Espacio libre alrededor. El vertical es mayor en escritorio porque
  // ahí el título y la firma se comen los bordes de la pantalla.
  margenEncuadre: { x: 1.5, y: 2.4 },
  margenEncuadreMovil: { x: 0.9, y: 1.3 },
  // Desplazamiento del centro de la escena: en móvil sube para dejar
  // sitio a la hoja inferior; en escritorio baja para librar el título.
  desvioY: 0.35,
  desvioYMovil: -0.9,

  // Racimos: cada principal reparte sus razones en un abanico propio
  // que cuelga hacia abajo (así la banda de arriba, donde va su
  // etiqueta, siempre queda despejada).
  clusterTangencial: 1.7,
  clusterTangencialMovil: 1.45,
  clusterRadial: 1.6,
  clusterRadialMovil: 1.3,
  clusterSesgoAbajo: 0.75,
  clusterGiro: 0.7,

  // Enlaces: una topología fija (no por distancia, que a 112 nodos
  // parpadea). Cuatro tipos — ver constellation.js:construirAristas.
  enlaceVecinosPri: 3, // vecinos más cercanos entre principales
  enlaceVecinosSec: 2, // vecinos más cercanos dentro del mismo racimo
  distanciaEnlaceSec: 1.9, // umbral para esos vecinos secundarios
  arranqueRadio: 1.35, // los radios del centro no arrancan en el punto
  estiron: 1.7, // una arista se apaga al estirarse más de esta razón
  brilloEnlace: [0.8, 0.42, 0.28, 0.18], // radio, anillo, peciolo, red
  opacidadEnlace: 0.72,

  radioNodo: 0.4, // tamaño visible de un principal
  radioGolpe: 0.5, // objetivo de clic de un principal (invisible)
  radioGolpeMovil: 0.95,

  // Los secundarios son puntos, no mallas: su objetivo de clic es el
  // umbral de Raycaster.params.Points, un radio en unidades de mundo.
  escalaPunto: 1.1,
  escalaPuntoMovil: 0.95,
  umbralPuntos: 0.42,
  umbralPuntosMovil: 0.55,
  sesgoPrincipal: 0.7, // en un empate, gana el principal

  // Física — separada por nivel: los secundarios deben aguantar la
  // forma del racimo o el racimo deja de leerse como tal.
  sepPri: 0.55, // radio de confort de un principal
  sepSec: 0.32,
  kHogarPri: 3.2, // fuerza del muelle hacia la posición de reposo
  kHogarSec: 4.6,
  derivaPri: 0.85, // amplitud del vaivén
  derivaSec: 0.35,
  kRepulsion: 6,
  kMuro: 4,
  amortiguacion: 0.88, // por cada 1/60 s
  velocidadMax: 6,
  rotacionMarco: 0.035, // rad/s a los que gira la constelación entera

  // Estrellas
  estrellas: 1200,
  estrellasMovil: 300,

  // En un móvil, con el hemisferio trasero también etiquetado la
  // escena se ve más saturada de lo que un texto necesita.
  soloFrenteMovil: true,

  // Colores
  colorCentro: 0xffe3ee,
  colorHaloCentro: 0xff6fae,
  escalaHaloCentro: 4.2,
  opacidadHaloCentro: 0.5,
  radioNucleoCentro: 0.95,
  colorEnlace: [1.0, 0.42, 0.68],
  tonoNodoMin: 0.82, // matiz HSL de los principales: 0.82 violeta → 0.96 rosa
  tonoNodoMax: 0.96,
  satSec: 0.62, // los secundarios van menos saturados: son 100 sumando luz
  luzSec: 0.66,
};
