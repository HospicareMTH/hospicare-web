export type ManualTopic = {
  title: string;
  paragraphs: string[];
  steps: string[];
};

export type ManualState = {
  name: string;
  description: string;
};

export type ManualSection = {
  id: string;
  title: string;
  summary: string;
  audience: string;
  topics: ManualTopic[];
  states: ManualState[];
  rules: string[];
  decisions: string[];
};

export const GENERAL_USE_SECTION: ManualSection = {
  id: "como-se-usa",
  title: "Cómo se usa el sistema",
  summary: "Cómo moverte entre pantallas y cómo se usan los listados.",
  audience: "Todas las personas con cuenta.",
  topics: [
    {
      title: "Moverte entre pantallas",
      paragraphs: [
        "El menú muestra solo los lugares a los que tu rol tiene acceso. En el teléfono, abajo tenés Inicio y Menú; el resto se abre desde Menú.",
        "El botón con la luna, arriba a la derecha, cambia entre modo claro y modo oscuro.",
      ],
      steps: [],
    },
    {
      title: "Buscar, ordenar y filtrar un listado",
      paragraphs: [
        "La búsqueda no distingue mayúsculas ni acentos. Tocá el título de una columna para ordenar por ella; un segundo toque invierte el orden.",
        "Cada listado muestra 50 filas por página y podés pasar a 100 o 150. La búsqueda, el orden y la página quedan en la dirección de la pantalla, así que el botón Atrás del navegador te devuelve a lo que estabas viendo.",
      ],
      steps: [],
    },
    {
      title: "Elegir qué columnas ver",
      paragraphs: [
        "Con el botón Columnas marcás o desmarcás las columnas del listado. La elección se guarda para tu usuario y se mantiene en cualquier dispositivo. La columna principal no se puede ocultar.",
      ],
      steps: [],
    },
    {
      title: "Acciones de una fila",
      paragraphs: [
        "Un clic marca la fila. Las acciones se abren con el botón de tres puntos al final de la fila o con clic derecho; en una pantalla táctil, manteniendo presionada la fila.",
        "Solo aparecen las acciones que tu rol permite. Las que desactivan, revocan o eliminan están en rojo y piden confirmación.",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "Cada pantalla y cada acción se controla en el servidor según tu rol. Si entrás a una pantalla sin permiso, ves «Acceso restringido».",
    "Cuando algo se guarda o no se puede guardar, aparece un aviso breve que lo explica.",
  ],
  decisions: [],
};

export const SIGN_IN_SECTION: ManualSection = {
  id: "ingreso",
  title: "Ingreso",
  summary:
    "Entrar al sistema, recuperar la contraseña, crear tu cuenta desde una invitación y usar el segundo factor al entrar.",
  audience:
    "Todas las personas con cuenta, y quien recibe una invitación por correo.",
  topics: [
    {
      title: "Iniciar sesión",
      paragraphs: [
        "Se entra con correo y contraseña. Si abriste una pantalla antes de entrar, después de iniciar sesión volvés a esa pantalla.",
        "La sesión dura 7 días y se renueva sola cada 24 horas mientras usás el sistema.",
      ],
      steps: [],
    },
    {
      title: "Recuperar la contraseña",
      paragraphs: [],
      steps: [
        "En el inicio de sesión, tocá «¿Olvidaste tu contraseña?».",
        "Escribí tu correo y tocá «Enviar enlace».",
        "Abrí el enlace que llega a tu correo. Vence a los 30 minutos y sirve una sola vez.",
        "Creá la contraseña nueva. Al guardarla se cierran todas tus sesiones y entrás con la nueva.",
      ],
    },
    {
      title: "Crear tu cuenta desde una invitación",
      paragraphs: [
        "Tu nombre, tu correo y tu rol vienen de la invitación; solo elegís tu contraseña.",
      ],
      steps: [
        "Abrí el enlace del correo de invitación. Vence a los 7 días y sirve una sola vez.",
        "Escribí tu contraseña dos veces y tocá «Crear cuenta».",
      ],
    },
    {
      title: "Segundo factor al entrar",
      paragraphs: [
        "Si tenés el segundo factor activo, después de la contraseña el sistema pide una verificación más. Podés usar el código de tu aplicación autenticadora, un código que llega por correo (vence a los 3 minutos) o uno de tus códigos de respaldo (cada uno sirve una sola vez).",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "La contraseña tiene entre 12 y 256 caracteres.",
    "Se permiten 5 intentos de ingreso por minuto y 5 pedidos de recuperación por hora. Después hay que esperar.",
    "No hay registro abierto: las cuentas se crean por invitación o desde Administración.",
    "Si tu acceso fue revocado, no podés entrar y el sistema te indica que hables con un administrador.",
  ],
  decisions: [
    "Si el correo o la contraseña no son correctos, el aviso no dice cuál de los dos falló, y el pedido de recuperación responde igual exista o no la cuenta. Así nadie puede averiguar qué correos tienen cuenta.",
  ],
};

export const ACCOUNT_SECTION: ManualSection = {
  id: "mi-cuenta",
  title: "Mi cuenta",
  summary: "Tus datos y la seguridad de tu cuenta.",
  audience: "Todas las personas con cuenta.",
  topics: [
    {
      title: "Verificar tu correo",
      paragraphs: [
        "Mientras tu correo no esté verificado, el Inicio muestra un aviso con el botón «Verificar mi correo».",
      ],
      steps: [
        "En Mi cuenta, en la parte de Correo, tocá «Enviar código».",
        "Escribí el código de 6 números que llega a tu correo. Vence a los 5 minutos y admite 5 intentos.",
      ],
    },
    {
      title: "Cambiar tu nombre y tu contraseña",
      paragraphs: [
        "El nombre necesita al menos 2 caracteres.",
        "Para cambiar la contraseña escribís la actual, la nueva y otra vez la nueva. Al guardarla se cierran tus otras sesiones; la de este dispositivo sigue abierta.",
      ],
      steps: [],
    },
    {
      title: "Activar el segundo factor",
      paragraphs: [
        "Al activarlo recibís 10 códigos de respaldo de 10 caracteres. Guardalos en un lugar seguro: sirven para entrar si no tenés la aplicación a mano. «Generar códigos nuevos» reemplaza los anteriores.",
      ],
      steps: [
        "Confirmá con tu contraseña.",
        "Escaneá el código QR con tu aplicación autenticadora o cargá la clave manual.",
        "Escribí el primer código de 6 números que muestra la aplicación.",
      ],
    },
    {
      title: "Cerrar sesión",
      paragraphs: [
        "«Cerrar sesión» cierra solo la sesión de este dispositivo.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Correo sin verificar",
      description:
        "Podés usar el sistema, pero no cambiar tu nombre, tu contraseña ni el segundo factor.",
    },
    {
      name: "Segundo factor activo",
      description:
        "Cada ingreso pide, además de la contraseña, un código de la aplicación, del correo o de respaldo.",
    },
  ],
  rules: [
    "Cambiar el nombre, la contraseña o el segundo factor exige el correo verificado.",
    "Desactivar el segundo factor y generar códigos nuevos piden tu contraseña.",
    "Se pueden pedir hasta 3 códigos de verificación por minuto y hacer 5 cambios de contraseña cada 10 minutos.",
  ],
  decisions: [],
};

export const HOME_SECTION: ManualSection = {
  id: "inicio",
  title: "Inicio",
  summary: "Los reportes del hospice. Cada reporte aparece según tu rol.",
  audience:
    "Quien tenga permiso para ver cada reporte. Por ahora está disponible Calidad de datos.",
  topics: [
    {
      title: "Calidad de datos",
      paragraphs: [
        "Muestra cuántas opciones activas tiene cada catálogo, separadas en Admisiones y Huéspedes. Un catálogo con 0 todavía no ofrece ninguna opción en los formularios.",
        "Si tu rol puede ver un catálogo, su nombre es un enlace que lo abre.",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "Un reporte sin permiso no se calcula ni se muestra.",
    "Si tu rol no tiene ningún reporte, el Inicio dice «Todavía no hay reportes para mostrar».",
  ],
  decisions: [],
};

export const USERS_SECTION: ManualSection = {
  id: "usuarios",
  title: "Usuarios",
  summary:
    "El listado de personas con cuenta: crear usuarios, cambiar su rol, revocar y restaurar accesos.",
  audience: "Administración, con los permisos de Usuarios.",
  topics: [
    {
      title: "Listado",
      paragraphs: [
        "Muestra nombre, correo, rol, estado del acceso, verificación del correo y segundo factor. Se puede filtrar por estado y por rol.",
      ],
      steps: [],
    },
    {
      title: "Crear un usuario",
      paragraphs: [
        "«Crear usuario» pide nombre, correo, contraseña inicial, rol y si el correo ya está verificado. El correo no puede tener otra cuenta.",
      ],
      steps: [],
    },
    {
      title: "Cambiar el rol",
      paragraphs: [
        "El rol nuevo rige desde la próxima pantalla que abra la persona, sin que tenga que volver a entrar.",
      ],
      steps: [],
    },
    {
      title: "Revocar y restaurar el acceso",
      paragraphs: [
        "Al revocar elegís si es hasta que se restaure o por una cantidad de días, de 1 a 365, y escribís el motivo, de 5 a 500 caracteres. La persona sale del sistema en ese momento.",
        "«Restaurar acceso» le permite volver a entrar.",
      ],
      steps: [],
    },
  ],
  states: [
    { name: "Activo", description: "La persona puede entrar." },
    {
      name: "Revocado",
      description:
        "No puede entrar. Si la revocación es por días, el estado muestra hasta cuándo.",
    },
  ],
  rules: [
    "Nadie puede cambiar su propio rol ni revocar o restaurar su propio acceso.",
    "No se puede asignar un rol con más permisos que los propios. Solo un Super user cambia el rol de otro Super user.",
  ],
  decisions: [
    "El camino recomendado es invitar: así cada persona elige su propia contraseña.",
  ],
};

export const ROLES_SECTION: ManualSection = {
  id: "roles",
  title: "Roles",
  summary:
    "Los roles agrupan permisos. Cada persona tiene un rol, y el rol define qué puede ver y hacer.",
  audience: "Administración, con los permisos de Roles.",
  topics: [
    {
      title: "Crear y editar un rol",
      paragraphs: [
        "«Nuevo rol» pide un nombre de 2 a 80 caracteres, que no puede repetirse, y una descripción opcional. El rol nace sin permisos.",
        "Editar cambia el nombre o la descripción; los permisos se editan aparte.",
      ],
      steps: [],
    },
    {
      title: "Asignar permisos",
      paragraphs: [
        "«Asignar permisos» abre los permisos agrupados por módulo. Marcá acciones sueltas o el módulo completo y tocá «Guardar permisos». El cambio rige desde la próxima pantalla de cada persona con ese rol.",
      ],
      steps: [],
    },
    {
      title: "Eliminar un rol",
      paragraphs: [
        "Solo se puede eliminar un rol sin usuarios y que no figure en ninguna invitación, aunque esté vencida o revocada.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "De sistema",
      description:
        "Super user y Usuario. No se renombran ni se eliminan. Super user tiene siempre todos los permisos; Usuario empieza solo con Documentación y sus permisos se pueden cambiar.",
    },
  ],
  rules: [
    "Nadie puede cambiar los permisos de su propio rol.",
    "Solo se pueden otorgar permisos que uno mismo tiene.",
  ],
  decisions: [],
};

export const INVITATIONS_SECTION: ManualSection = {
  id: "invitaciones",
  title: "Invitaciones",
  summary:
    "Invitar a una persona por correo para que cree su cuenta con el rol elegido.",
  audience: "Administración, con los permisos de Invitaciones.",
  topics: [
    {
      title: "Invitar a una persona",
      paragraphs: [],
      steps: [
        "Tocá «Invitar a una persona».",
        "Escribí nombre y correo, y elegí el rol.",
        "Tocá «Enviar invitación». La persona recibe un enlace que vence a los 7 días y sirve una sola vez.",
      ],
    },
    {
      title: "Revocar una invitación",
      paragraphs: [
        "Una invitación pendiente se puede revocar desde su fila. El enlace deja de funcionar.",
      ],
      steps: [],
    },
  ],
  states: [
    { name: "Pendiente", description: "El enlace todavía se puede usar." },
    {
      name: "Vencida",
      description: "Pasaron 7 días sin usarla; hay que invitar de nuevo.",
    },
    { name: "Aceptada", description: "La persona ya creó su cuenta." },
    { name: "Revocada", description: "El enlace ya no funciona." },
  ],
  rules: [
    "No se puede invitar un correo que ya tiene cuenta o una invitación pendiente.",
    "Si el correo no se puede enviar, la invitación queda revocada y se avisa en pantalla.",
    "No se puede invitar con un rol que tenga más permisos que los propios.",
  ],
  decisions: [],
};

export const CATALOGS_SECTION: ManualSection = {
  id: "catalogos",
  title: "Catálogos",
  summary:
    "Las listas de opciones de los formularios de Admisiones y Huéspedes, y el catálogo de Profesionales de salud.",
  audience:
    "Administración, con los permisos de cada catálogo: ver, crear, modificar y desactivar.",
  topics: [
    {
      title: "Elegir un catálogo",
      paragraphs: [
        "Arriba elegís el grupo, Admisiones o Huéspedes, y después el catálogo. Solo aparecen los catálogos que tu rol puede ver.",
      ],
      steps: [],
    },
    {
      title: "Crear, editar y desactivar opciones",
      paragraphs: [
        "«Nueva opción» pide un nombre de 2 a 120 caracteres y una descripción opcional de hasta 500. La opción nueva se ubica al final.",
        "Si el nombre ya existe en ese catálogo, sin contar mayúsculas ni acentos, no se crea otra: si estaba desactivada, vuelve a activarse.",
        "Para reactivar una opción, elegí «Inactivas» en el filtro de estado y usá «Reactivar» en su fila.",
      ],
      steps: [],
    },
    {
      title: "Cambiar el orden",
      paragraphs: [
        "El orden del catálogo es el que se ve en los formularios. Usá los botones para subir o bajar una opción, o arrastrala desde el asa al principio de la fila.",
        "Con el teclado: llevá el foco al asa, presioná espacio, movela con las flechas y volvé a presionar espacio. Escape cancela.",
        "Los controles de orden aparecen con el filtro en Activas, sin búsqueda y con el orden propio del catálogo.",
      ],
      steps: [],
    },
    {
      title: "Profesionales de salud",
      paragraphs: [
        "Cada profesional tiene nombre, y de manera opcional especialidad, matrícula, teléfono y correo. Se listan en orden alfabético.",
        "El correo vincula al profesional con su cuenta para firmar. Si se carga el correo de un profesional desactivado, se reactiva con los datos nuevos.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Activa",
      description: "Se ofrece en los formularios.",
    },
    {
      name: "Inactiva",
      description:
        "Deja de ofrecerse, pero se sigue mostrando en los registros que ya la usan.",
    },
    {
      name: "Base",
      description:
        "Opción cargada al instalar el sistema. Se edita, se ordena y se desactiva como cualquier otra.",
    },
  ],
  rules: [
    "Las opciones y los profesionales no se borran: se desactivan.",
    "Vínculos mantiene un orden fijo: las opciones nuevas van al final. Profesionales de salud se ordena alfabéticamente.",
    "Reactivar y cambiar el orden requieren el permiso de modificar del catálogo.",
    "Dos profesionales activos no pueden tener el mismo correo.",
    "Cada cambio queda en el registro de actividad, con quién lo hizo.",
  ],
  decisions: [
    "Desactivar en lugar de borrar conserva lo que ya se registró: una entrevista sigue mostrando la opción que se eligió en su momento.",
  ],
};
