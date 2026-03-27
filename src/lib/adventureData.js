import epetExteriorBackground from "../assets/adventure/epet34-exterior.jpg";
import epetGaleriaBackground from "../assets/adventure/epet34-galeria.jpg";
import epetPasilloBackground from "../assets/adventure/epet34-pasillo.jpg";

const ADVENTURE_BACKGROUNDS = {
  entrada: {
    imagen: epetExteriorBackground,
    posicion: "center 46%"
  },
  patio: {
    imagen: epetGaleriaBackground,
    posicion: "center 38%"
  },
  comunidad: {
    imagen: epetPasilloBackground,
    posicion: "center 36%"
  }
};

export const DEFAULT_BATTLE_BACKGROUND = ADVENTURE_BACKGROUNDS.entrada;

export const ADVENTURE_ACHIEVEMENT = {
  id: "orgullo_epet_34",
  nombre: "Leyenda de la 34",
  descripcion: "Terminaste toda la aventura y el grupo ya no puede decir que entraste de suerte."
};

export const ADVENTURE_LEVELS = [
  {
    id: "ramon_facil",
    orden: 1,
    modo: "duel",
    rivalId: "ramon",
    dificultadId: "facil",
    titulo: "Cara de Guri",
    subtitulo: "Primer timbre en la entrada",
    resumen: "Ramon jura que tenes cara de alumno perdido y te frena antes de que pases del primer porton.",
    historia:
      "Apenas pisas la EPET 34, Ramon te mira de arriba abajo, te pregunta de que curso sos y te trata como otro caso de 'me pusieron en 4 y soy de 5'. Entre el edificio inaugurado en 2019, la fila de entrada y el orgullo del barrio, decide que tu cara de guri todavia no merece cruzar el porton sin una prueba.",
    fondo: ADVENTURE_BACKGROUNDS.entrada
  },
  {
    id: "alan_facil",
    orden: 2,
    modo: "duel",
    rivalId: "alan_soma",
    dificultadId: "facil",
    titulo: "Veni, Tengo los Sensores",
    subtitulo: "Alan te recluta para un proyecto",
    resumen: "Alan no te saluda: te secuestra para una prueba tecnica entre cables, tableros y apuro.",
    historia:
      "Superas la puerta y Alan aparece con la energia de alguien que ya te anoto en un proyecto sin preguntarte. Te suelta un 'veni, tengo los sensores para el proyecto, asi q veni', y cuando queres darte cuenta estas metido entre tableros, cables y una urgencia que para Alan siempre empieza con 'no me importa, hagan pruebas'.",
    fondo: ADVENTURE_BACKGROUNDS.patio
  },
  {
    id: "sonoda_facil",
    orden: 3,
    modo: "duel",
    rivalId: "sonoda",
    dificultadId: "facil",
    titulo: "Agua Te Explica Mal",
    subtitulo: "Guia confusa, confianza total",
    resumen: "Sonoda, alias Agua, te da una indicacion larguisima para llegar a un recreo que estaba a tres metros.",
    historia:
      "En el recreo conoces el verdadero poder de Sonoda: convertir una caminata recta en una quest secundaria. 'Anda a la entrada tipo el elevador, mira al frente, dobla a la izq y deberia haber una caja en el piso', dice con tanta seguridad que hasta parece razonable. El mismo tipo que no sabe por que todos lo tratan de admin te guia como si fuera un mapa humano con bugs.",
    fondo: ADVENTURE_BACKGROUNDS.comunidad
  },
  {
    id: "ramon_normal",
    orden: 4,
    modo: "duel",
    rivalId: "ramon",
    dificultadId: "normal",
    titulo: "Aca No Era",
    subtitulo: "Autitos rapidos y orgullo barrial",
    resumen: "Ramon te corre la posicion, corrige tu ruta y te reta a demostrar que no estas perdido.",
    historia:
      "Ahora que ya conoces la entrada, Ramon te cruza otra vez y arranca con su especialidad: hablarte como si fueras una mala decision del transito. Entre chicanas sobre autitos que van rapido, canchas y a quien representa el curso, te deja claro que en la 34 no alcanza con entrar: hay que plantarse y no escuchar 'aca no era' cada cinco minutos.",
    fondo: ADVENTURE_BACKGROUNDS.entrada
  },
  {
    id: "alan_normal",
    orden: 5,
    modo: "duel",
    rivalId: "alan_soma",
    dificultadId: "normal",
    titulo: "Prototipo a las Apuradas",
    subtitulo: "El laboratorio no perdona",
    resumen: "Alan sube el nivel y quiere ver si rendis cuando el proyecto esta a minutos de explotar.",
    historia:
      "Alan ya no quiere un ayudante; quiere a alguien que no tiemble cuando falta una pieza, sobra humo y el profe pregunta si ya esta listo. En medio del laboratorio aparece el trauma del portapilas con ocho pilas, las pruebas que nadie termino y la mirada de Alan que basicamente dice 'si sale mal, igual se entrega'.",
    fondo: ADVENTURE_BACKGROUNDS.patio
  },
  {
    id: "sonoda_normal",
    orden: 6,
    modo: "duel",
    rivalId: "sonoda",
    dificultadId: "normal",
    titulo: "Build de Netrunning",
    subtitulo: "Patio, ideas y humo comico",
    resumen: "Sonoda convierte el patio en una feria improvisada donde cada consejo viene con confianza inmerecida.",
    historia:
      "En el patio, Sonoda te recibe como si fuera un NPC legendario: te recomienda una build de netrunning, te promete que despues empieza el juego de verdad y te enchufa ESP, wifi con datos y sensor de peso como si todo eso entrara en una sola mochila. El polideportivo techado queda de fondo mientras el recreo se transforma en una pelea donde nadie entiende el plan, salvo Agua. Tal vez.",
    fondo: ADVENTURE_BACKGROUNDS.comunidad
  },
  {
    id: "ramon_dificil",
    orden: 7,
    modo: "duel",
    rivalId: "ramon",
    dificultadId: "dificil",
    titulo: "Campeon Carajo",
    subtitulo: "Turno tarde con ego competitivo",
    resumen: "Ramon llega con energia de final y decide que hoy se representa a la escuela en serio.",
    historia:
      "El turno tarde cae pesado, pero Ramon cae peor: viene cebado, competitivo y con ganas de gritar 'campeon carajo' antes de tiempo. Jura que ya termino la vagancia, que ahora se madruga hasta noviembre y que si alguien va a representar a la 34 en futbol, carroza o cualquier otra cosa, primero tiene que bancarse su presion absurda.",
    fondo: ADVENTURE_BACKGROUNDS.entrada
  },
  {
    id: "alan_dificil",
    orden: 8,
    modo: "duel",
    rivalId: "alan_soma",
    dificultadId: "dificil",
    titulo: "Pruebas, Dale",
    subtitulo: "Sensores, wifi y paciencia cero",
    resumen: "Alan arma la evaluacion final del proyecto y espera que entiendas el circuito antes que explote tu dignidad.",
    historia:
      "Cuando parece que ya viste todo, Alan reaparece con modo jefe de obra: sensores, wifi, cableado y cero paciencia. Te habla de pruebas como si fueran un deporte de contacto, te putea por pedir un kit de pesca sin sacar una mojarra y te obliga a sostener el ritmo del taller hasta demostrar que no solo aguantas: tambien resolves.",
    fondo: ADVENTURE_BACKGROUNDS.patio
  },
  {
    id: "sonoda_dificil",
    orden: 9,
    modo: "duel",
    rivalId: "sonoda",
    dificultadId: "dificil",
    titulo: "Agua en Modo Dios",
    subtitulo: "Noche de feria tecnica",
    resumen: "Sonoda guarda su forma final para la noche, cuando el caos ya no parece error sino estilo de vida.",
    historia:
      "Llega la velada de la EPET y Sonoda entra en su estado mas peligroso: gracioso, confiado y misteriosamente efectivo. Entre luces, pasillos llenos, ideas de MMA, una siesta que no fue y una sensacion real de que todo puede salir mal, Agua te sonrie y suelta la frase final: 'cuando te acostumbras sos Dios, amigo'.",
    fondo: ADVENTURE_BACKGROUNDS.comunidad
  },
  {
    id: "final_epet_34",
    orden: 10,
    modo: "boss",
    rivalId: "triple",
    dificultadId: "final",
    titulo: "Los que Tuvieron Esperanza",
    subtitulo: "Ramon, Alan y Agua juntos",
    resumen: "El grupo se junta para decidir si ya sos parte del folklore de la escuela o si te vuelven a mandar a la entrada.",
    historia:
      "En el corazon de la EPET 34, con el edificio, los talleres y el polideportivo como testigos, Ramon, Alan y Sonoda dejan de pelear entre ellos y te apuntan a vos. Es el examen final del barrio: entre la velada, la carroza, la impresion 3D, los sensores, los portapilas mal comprados y las indicaciones imposibles de Agua, si sobrevives a los tres juntos ya no sos visita. Sos folklore oficial de la 34.",
    fondo: ADVENTURE_BACKGROUNDS.entrada
  }
];

export const ADVENTURE_DIFFICULTY_MODIFIERS = {
  facil: {
    hp: 1,
    ataque: 1,
    defensa: 1,
    velocidad: 1
  },
  normal: {
    hp: 1.14,
    ataque: 1.1,
    defensa: 1.08,
    velocidad: 1.04
  },
  dificil: {
    hp: 1.28,
    ataque: 1.18,
    defensa: 1.14,
    velocidad: 1.08
  },
  final: {
    hp: 1.12,
    ataque: 1.08,
    defensa: 1.08,
    velocidad: 1.05
  }
};

export function getAdventureLevel(levelId) {
  return ADVENTURE_LEVELS.find((level) => level.id === levelId) || null;
}
