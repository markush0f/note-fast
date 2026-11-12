export const ICON_CATEGORIES = {
  basics: "Básicos",
  work: "Trabajo",
  technology: "Tecnología",
  creativity: "Creatividad",
  learning: "Aprendizaje",
  life: "Vida diaria",
  nature: "Naturaleza",
  travel: "Viajes",
} as const;
export type IconCategory = keyof typeof ICON_CATEGORIES;

// Stable identifiers keep previously saved icon choices compatible.
export const ITEM_ICONS = [
  {
    id: "folder",
    label: "Carpeta",
    category: "basics",
    keywords: "directorio archivos",
  },
  {
    id: "page",
    label: "Documento",
    category: "basics",
    keywords: "archivo nota papel",
  },
  {
    id: "book",
    label: "Libro",
    category: "learning",
    keywords: "leer lectura biblioteca",
  },
  {
    id: "code",
    label: "Código",
    category: "technology",
    keywords: "programacion desarrollo",
  },
  {
    id: "tasks",
    label: "Tareas",
    category: "work",
    keywords: "lista pendientes checklist",
  },
  {
    id: "idea",
    label: "Idea",
    category: "creativity",
    keywords: "bombilla inspiracion",
  },
  {
    id: "star",
    label: "Estrella",
    category: "basics",
    keywords: "favorito importante",
  },
  { id: "heart", label: "Corazón", category: "life", keywords: "amor salud" },
  {
    id: "work",
    label: "Trabajo",
    category: "work",
    keywords: "maleta proyecto oficina",
  },
  { id: "home", label: "Casa", category: "life", keywords: "hogar vivienda" },
  {
    id: "calendar",
    label: "Calendario",
    category: "work",
    keywords: "fecha agenda evento",
  },
  {
    id: "music",
    label: "Música",
    category: "creativity",
    keywords: "nota cancion sonido",
  },
  {
    id: "globe",
    label: "Mundo",
    category: "travel",
    keywords: "globo planeta internacional",
  },
  {
    id: "image",
    label: "Imagen",
    category: "creativity",
    keywords: "foto fotografia galeria",
  },
  {
    id: "bookmark",
    label: "Marcador",
    category: "basics",
    keywords: "guardar favorito lectura",
  },
  {
    id: "pencil",
    label: "Lápiz",
    category: "basics",
    keywords: "escribir editar",
  },
  {
    id: "notes",
    label: "Notas",
    category: "basics",
    keywords: "apuntes papel",
  },
  {
    id: "journal",
    label: "Diario",
    category: "basics",
    keywords: "cuaderno personal",
  },
  {
    id: "check",
    label: "Completado",
    category: "basics",
    keywords: "hecho correcto verificado",
  },
  {
    id: "archive",
    label: "Archivo",
    category: "basics",
    keywords: "archivar guardar almacen",
  },
  { id: "box", label: "Caja", category: "basics", keywords: "paquete guardar" },
  {
    id: "label",
    label: "Etiqueta",
    category: "basics",
    keywords: "tag clasificar",
  },
  {
    id: "pin",
    label: "Chincheta",
    category: "basics",
    keywords: "fijar destacado",
  },
  {
    id: "search",
    label: "Lupa",
    category: "basics",
    keywords: "buscar investigar",
  },
  { id: "clock", label: "Reloj", category: "work", keywords: "tiempo hora" },
  {
    id: "alarm",
    label: "Alarma",
    category: "work",
    keywords: "despertador recordatorio",
  },
  {
    id: "timer",
    label: "Temporizador",
    category: "work",
    keywords: "tiempo pomodoro cronometro",
  },
  {
    id: "bell",
    label: "Campana",
    category: "work",
    keywords: "notificacion aviso",
  },
  {
    id: "mail",
    label: "Correo",
    category: "work",
    keywords: "email carta mensaje",
  },
  {
    id: "chat",
    label: "Conversación",
    category: "work",
    keywords: "chat dialogo hablar",
  },
  {
    id: "message",
    label: "Mensaje",
    category: "work",
    keywords: "texto comunicacion",
  },
  {
    id: "send",
    label: "Enviar",
    category: "work",
    keywords: "comunicar entregar",
  },
  {
    id: "user",
    label: "Persona",
    category: "work",
    keywords: "usuario contacto",
  },
  {
    id: "group",
    label: "Equipo",
    category: "work",
    keywords: "grupo personas colaboracion",
  },
  {
    id: "presentation",
    label: "Presentación",
    category: "work",
    keywords: "reunion diapositivas",
  },
  {
    id: "reports",
    label: "Informes",
    category: "work",
    keywords: "reporte documentos",
  },
  {
    id: "growth",
    label: "Crecimiento",
    category: "work",
    keywords: "grafico progreso objetivos",
  },
  {
    id: "credit-card",
    label: "Tarjeta",
    category: "work",
    keywords: "pago credito dinero",
  },
  {
    id: "wallet",
    label: "Cartera",
    category: "work",
    keywords: "dinero ahorro finanzas",
  },
  {
    id: "bank",
    label: "Banco",
    category: "work",
    keywords: "finanzas inversion",
  },
  {
    id: "money",
    label: "Dinero",
    category: "work",
    keywords: "dolar presupuesto gastos",
  },
  {
    id: "shopping",
    label: "Compras",
    category: "life",
    keywords: "bolsa tienda",
  },
  {
    id: "gift",
    label: "Regalo",
    category: "life",
    keywords: "cumpleanos sorpresa",
  },
  { id: "key", label: "Llave", category: "basics", keywords: "acceso abrir" },
  {
    id: "lock",
    label: "Candado",
    category: "technology",
    keywords: "seguridad privado contrasena",
  },
  {
    id: "shield",
    label: "Escudo",
    category: "technology",
    keywords: "seguridad proteccion",
  },
  {
    id: "computer",
    label: "Ordenador",
    category: "technology",
    keywords: "computadora pc escritorio",
  },
  {
    id: "laptop",
    label: "Portátil",
    category: "technology",
    keywords: "laptop computadora",
  },
  {
    id: "phone",
    label: "Móvil",
    category: "technology",
    keywords: "telefono celular smartphone",
  },
  {
    id: "server",
    label: "Servidor",
    category: "technology",
    keywords: "backend infraestructura",
  },
  {
    id: "database",
    label: "Base de datos",
    category: "technology",
    keywords: "sqlite sql datos",
  },
  {
    id: "terminal",
    label: "Terminal",
    category: "technology",
    keywords: "consola comandos shell",
  },
  {
    id: "git",
    label: "Ramas Git",
    category: "technology",
    keywords: "versiones repositorio desarrollo",
  },
  {
    id: "github",
    label: "GitHub",
    category: "technology",
    keywords: "repositorio codigo",
  },
  {
    id: "cloud",
    label: "Nube",
    category: "technology",
    keywords: "internet almacenamiento",
  },
  {
    id: "wifi",
    label: "Wifi",
    category: "technology",
    keywords: "red conexion internet",
  },
  {
    id: "network",
    label: "Red",
    category: "technology",
    keywords: "conexion nodos",
  },
  {
    id: "settings",
    label: "Ajustes",
    category: "technology",
    keywords: "configuracion preferencias",
  },
  {
    id: "tools",
    label: "Herramientas",
    category: "technology",
    keywords: "utilidades reparar",
  },
  {
    id: "wrench",
    label: "Llave inglesa",
    category: "technology",
    keywords: "mantenimiento reparar",
  },
  {
    id: "bug",
    label: "Error",
    category: "technology",
    keywords: "bug depurar pruebas",
  },
  {
    id: "puzzle",
    label: "Puzle",
    category: "technology",
    keywords: "rompecabezas solucion",
  },
  {
    id: "rocket",
    label: "Cohete",
    category: "technology",
    keywords: "lanzamiento startup",
  },
  {
    id: "palette",
    label: "Paleta",
    category: "creativity",
    keywords: "arte colores pintura",
  },
  {
    id: "design",
    label: "Diseño",
    category: "creativity",
    keywords: "dibujo lapiz boceto",
  },
  {
    id: "camera",
    label: "Cámara",
    category: "creativity",
    keywords: "foto fotografia",
  },
  {
    id: "video",
    label: "Vídeo",
    category: "creativity",
    keywords: "camara grabacion",
  },
  {
    id: "movie",
    label: "Cine",
    category: "creativity",
    keywords: "pelicula video",
  },
  {
    id: "headphones",
    label: "Auriculares",
    category: "creativity",
    keywords: "musica audio sonido",
  },
  {
    id: "microphone",
    label: "Micrófono",
    category: "creativity",
    keywords: "podcast voz grabar",
  },
  {
    id: "playlist",
    label: "Lista musical",
    category: "creativity",
    keywords: "playlist canciones",
  },
  {
    id: "gamepad",
    label: "Videojuegos",
    category: "creativity",
    keywords: "mando juegos ocio",
  },
  {
    id: "colors",
    label: "Colores",
    category: "creativity",
    keywords: "filtro diseno",
  },
  {
    id: "frame",
    label: "Marco",
    category: "creativity",
    keywords: "diseno composicion",
  },
  {
    id: "printer",
    label: "Impresora",
    category: "creativity",
    keywords: "imprimir papel",
  },
  {
    id: "graduation",
    label: "Graduación",
    category: "learning",
    keywords: "universidad estudios",
  },
  {
    id: "learning",
    label: "Aprender",
    category: "learning",
    keywords: "estudiar educacion",
  },
  {
    id: "translate",
    label: "Traducir",
    category: "learning",
    keywords: "idioma traduccion",
  },
  {
    id: "language",
    label: "Idiomas",
    category: "learning",
    keywords: "lengua hablar",
  },
  {
    id: "math",
    label: "Matemáticas",
    category: "learning",
    keywords: "numeros calculo",
  },
  {
    id: "flask",
    label: "Laboratorio",
    category: "learning",
    keywords: "quimica ciencia",
  },
  {
    id: "test-tube",
    label: "Tubo de ensayo",
    category: "learning",
    keywords: "ciencia experimento",
  },
  {
    id: "atom",
    label: "Átomo",
    category: "learning",
    keywords: "fisica ciencia",
  },
  {
    id: "microscope",
    label: "Microscopio",
    category: "learning",
    keywords: "biologia ciencia",
  },
  {
    id: "planet",
    label: "Planeta",
    category: "learning",
    keywords: "astronomia espacio",
  },
  {
    id: "coffee",
    label: "Café",
    category: "life",
    keywords: "taza descanso bebida",
  },
  { id: "pizza", label: "Pizza", category: "life", keywords: "comida receta" },
  {
    id: "food",
    label: "Cubiertos",
    category: "life",
    keywords: "cocina comida restaurante",
  },
  {
    id: "organic",
    label: "Alimentación",
    category: "life",
    keywords: "comida saludable organica",
  },
  {
    id: "health",
    label: "Salud",
    category: "life",
    keywords: "medicina medico cuidados",
  },
  {
    id: "wellness",
    label: "Bienestar",
    category: "life",
    keywords: "salud habitos",
  },
  {
    id: "gym",
    label: "Gimnasio",
    category: "life",
    keywords: "pesas ejercicio deporte",
  },
  {
    id: "running",
    label: "Correr",
    category: "life",
    keywords: "running ejercicio deporte",
  },
  {
    id: "cycling",
    label: "Ciclismo",
    category: "life",
    keywords: "bicicleta deporte",
  },
  {
    id: "walking",
    label: "Caminar",
    category: "life",
    keywords: "paseo ejercicio",
  },
  {
    id: "leaf",
    label: "Hoja",
    category: "nature",
    keywords: "planta ecologia",
  },
  {
    id: "flower",
    label: "Flor",
    category: "nature",
    keywords: "jardin planta",
  },
  { id: "sun", label: "Sol", category: "nature", keywords: "dia luz verano" },
  { id: "moon", label: "Luna", category: "nature", keywords: "noche descanso" },
  { id: "snow", label: "Nieve", category: "nature", keywords: "invierno frio" },
  { id: "fire", label: "Fuego", category: "nature", keywords: "llama calor" },
  { id: "water", label: "Agua", category: "nature", keywords: "gota lluvia" },
  {
    id: "hiking",
    label: "Senderismo",
    category: "nature",
    keywords: "montana caminar trekking",
  },
  { id: "tree", label: "Árbol", category: "nature", keywords: "bosque planta" },
  {
    id: "sea",
    label: "Mar",
    category: "nature",
    keywords: "olas oceano playa",
  },
  {
    id: "airplane",
    label: "Avión",
    category: "travel",
    keywords: "vuelo viajar",
  },
  {
    id: "car",
    label: "Coche",
    category: "travel",
    keywords: "auto carro conducir",
  },
  {
    id: "bus",
    label: "Autobús",
    category: "travel",
    keywords: "transporte colectivo",
  },
  {
    id: "train",
    label: "Tren",
    category: "travel",
    keywords: "ferrocarril transporte",
  },
  {
    id: "truck",
    label: "Camión",
    category: "travel",
    keywords: "transporte envio",
  },
  { id: "map", label: "Mapa", category: "travel", keywords: "ruta viaje" },
  {
    id: "location",
    label: "Ubicación",
    category: "travel",
    keywords: "lugar mapa direccion",
  },
  {
    id: "compass",
    label: "Brújula",
    category: "travel",
    keywords: "orientacion explorar",
  },
  {
    id: "flag",
    label: "Bandera",
    category: "travel",
    keywords: "destino meta",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  category: IconCategory;
  keywords: string;
}[];

export type ItemIconId = (typeof ITEM_ICONS)[number]["id"];
export type ItemTarget = { kind: "note" | "notebook"; id: string };
export const ITEM_ICON_IDS = ITEM_ICONS.map((icon) => icon.id);
const iconIds = new Set<string>(ITEM_ICON_IDS);

export function isItemIconId(value: unknown): value is ItemIconId {
  return typeof value === "string" && iconIds.has(value);
}

export function filterItemIcons(
  query: string,
  category: IconCategory | "all" = "all",
) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return ITEM_ICONS.filter((icon) => {
    const text = normalize(
      `${icon.id} ${icon.label} ${icon.keywords} ${ICON_CATEGORIES[icon.category]}`,
    );
    return (
      (category === "all" || icon.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}

// Unknown icons from old or future data fall back to the item's default.
export function normalizeItemIcon<T extends { icon?: unknown }>(item: T): T {
  if (item.icon === undefined || isItemIconId(item.icon)) return item;
  const normalized = { ...item };
  delete normalized.icon;
  return normalized;
}
