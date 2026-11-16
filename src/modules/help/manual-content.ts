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
  summary: "Cómo moverte por el sistema y cómo trabajar con los listados.",
  audience: "Todas las personas con cuenta.",
  topics: [
    {
      title: "Moverte entre pantallas",
      paragraphs: [
        "El menú muestra solo las pantallas que tu rol te permite usar. En el teléfono, la barra de abajo tiene Inicio y Menú. Las demás pantallas se abren desde Menú.",
        "El botón de arriba a la derecha cambia entre modo claro y modo oscuro. En modo claro muestra una luna y en modo oscuro, un sol. Al principio el sistema usa el modo de tu dispositivo.",
      ],
      steps: [],
    },
    {
      title: "Buscar, ordenar y filtrar un listado",
      paragraphs: [
        "Al buscar no importan las mayúsculas ni los acentos: «jose» encuentra «José». Las columnas con flechas en el título se pueden ordenar. Tocá el título una vez para ordenar y otra vez para invertir el orden. Algunos listados tienen filtros junto a la búsqueda, por ejemplo por estado o por rol.",
        "Cada listado muestra 50 filas por página. Al pie del listado podés pasar a 100 o 150. La pantalla recuerda tu búsqueda, el orden y la página. Si abrís una fila y después tocás Atrás en el navegador, volvés a lo que estabas viendo.",
      ],
      steps: [],
    },
    {
      title: "Elegir qué columnas ver",
      paragraphs: [
        "Con el botón Columnas elegís qué columnas ver. Tu elección se guarda en tu cuenta para cada listado, y la encontrás igual en cualquier dispositivo. La columna principal siempre se muestra y por eso no aparece en esa lista.",
      ],
      steps: [],
    },
    {
      title: "Acciones de una fila",
      paragraphs: [
        "Al hacer clic en una fila, queda resaltada. Para ver qué podés hacer con ella, tocá los tres puntos al final de la fila o hacé clic derecho sobre la fila. En una pantalla táctil, mantené presionada la fila.",
        "Solo ves las acciones que tu rol permite. Las que desactivan, revocan o eliminan están en rojo y te piden confirmar antes de hacer el cambio.",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "Tu rol define qué pantallas podés abrir y qué podés hacer, también si llegás por un enlace directo. Si abrís una pantalla sin permiso, ves «Acceso restringido». Ahí podés volver al inicio o pedirle el acceso a un administrador.",
    "Cada vez que guardás, aparece un aviso que te dice si el cambio se hizo o no.",
  ],
  decisions: [],
};

export const SIGN_IN_SECTION: ManualSection = {
  id: "ingreso",
  title: "Ingreso",
  summary:
    "Cómo entrar al sistema, recuperar tu contraseña, crear tu cuenta desde una invitación y usar el segundo factor.",
  audience:
    "Todas las personas con cuenta y quienes reciben una invitación por correo.",
  topics: [
    {
      title: "Iniciar sesión",
      paragraphs: [
        "Entrás con tu correo y tu contraseña. Si abriste un enlace a una pantalla antes de entrar, al iniciar sesión el sistema te lleva a esa pantalla.",
        "Tu sesión queda abierta mientras uses el sistema. Si pasás alrededor de una semana sin usarlo, vas a tener que volver a iniciar sesión.",
      ],
      steps: [],
    },
    {
      title: "Recuperar la contraseña",
      paragraphs: [],
      steps: [
        "En la pantalla de inicio de sesión, tocá «¿Olvidaste tu contraseña?».",
        "Escribí tu correo y tocá «Enviar enlace».",
        "Abrí el enlace que te llega por correo. Vence a los 30 minutos y se puede usar una sola vez.",
        "Escribí tu contraseña nueva y tocá «Guardar contraseña». Se cierran todas tus sesiones abiertas y volvés al inicio de sesión para entrar con la contraseña nueva.",
      ],
    },
    {
      title: "Crear tu cuenta desde una invitación",
      paragraphs: [
        "Tu nombre, tu correo y tu rol ya vienen cargados en la invitación. Solo tenés que elegir tu contraseña.",
      ],
      steps: [
        "Abrí el enlace del correo de invitación. Vence a los 7 días y se puede usar una sola vez.",
        "Escribí tu contraseña dos veces y tocá «Crear cuenta».",
        "Cuando tu cuenta esté lista, entrá con tu correo y tu contraseña.",
      ],
    },
    {
      title: "Segundo factor al entrar",
      paragraphs: [
        "Si tenés el segundo factor activo, después de la contraseña el sistema te pide un código. Podés usar cualquiera de estos:",
      ],
      steps: [
        "El código de tu aplicación autenticadora.",
        "Un código que te enviamos por correo. Vence a los 3 minutos.",
        "Uno de tus códigos de respaldo. Cada uno se puede usar una sola vez.",
      ],
    },
  ],
  states: [],
  rules: [
    "La contraseña debe tener entre 12 y 256 caracteres.",
    "Podés hacer hasta 5 intentos de ingreso por minuto, 5 intentos de código por minuto y 5 pedidos de recuperación por hora. Si llegás al límite, esperá y volvé a probar.",
    "Nadie puede crearse una cuenta por su cuenta. Las cuentas se crean por invitación o desde Administración.",
    "Si un administrador revocó tu acceso, no vas a poder entrar. El sistema te avisa y te indica que hables con un administrador.",
  ],
  decisions: [
    "Si el correo o la contraseña no son correctos, el aviso no dice cuál de los dos falló. El pedido de recuperación también responde lo mismo, tenga cuenta o no ese correo. Así nadie puede averiguar qué correos están registrados.",
  ],
};

export const ACCOUNT_SECTION: ManualSection = {
  id: "mi-cuenta",
  title: "Mi cuenta",
  summary: "Cómo cambiar tus datos y cuidar la seguridad de tu cuenta.",
  audience: "Todas las personas con cuenta.",
  topics: [
    {
      title: "Verificar tu correo",
      paragraphs: [
        "Mientras no verifiques tu correo, el Inicio te muestra un aviso con el botón «Verificar mi correo».",
      ],
      steps: [
        "En Mi cuenta, en la parte de Correo, tocá «Enviar código».",
        "Escribí el código de 6 números que te llega por correo y tocá «Verificar». El código vence a los 5 minutos y podés probar hasta 5 veces.",
      ],
    },
    {
      title: "Cambiar tu nombre y tu contraseña",
      paragraphs: [
        "Tu nombre debe tener al menos 2 caracteres.",
        "Para cambiar la contraseña, escribí la actual y dos veces la nueva. Al guardarla, se cierran tus sesiones en otros dispositivos. En este dispositivo seguís con la sesión abierta.",
      ],
      steps: [],
    },
    {
      title: "Activar el segundo factor",
      paragraphs: [
        "Al activarlo recibís 10 códigos de respaldo. Te sirven para entrar si no tenés la aplicación a mano. Si tocás «Generar códigos de respaldo nuevos», los anteriores dejan de funcionar.",
      ],
      steps: [
        "Tocá «Activar segundo factor» y confirmá con tu contraseña.",
        "Escaneá el código QR con tu aplicación autenticadora, o escribí a mano la clave que aparece al lado.",
        "Escribí el código de 6 números que te muestra la aplicación y tocá «Confirmar».",
        "Guardá los códigos de respaldo en un lugar seguro y tocá «Ya los guardé».",
      ],
    },
    {
      title: "Cerrar sesión",
      paragraphs: [
        "«Cerrar sesión» cierra la sesión solo en este dispositivo. Si tenés el sistema abierto en otros, ahí sigue abierto.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Correo sin verificar",
      description:
        "Podés usar el sistema, pero no podés cambiar tu nombre ni tu contraseña, ni activar o desactivar el segundo factor.",
    },
    {
      name: "Segundo factor activo",
      description:
        "Cada vez que entrás, además de la contraseña, el sistema te pide un código: de la aplicación, del correo o de respaldo.",
    },
  ],
  rules: [
    "Para cambiar tu nombre o tu contraseña, activar o desactivar el segundo factor o generar códigos de respaldo nuevos, primero tenés que verificar tu correo.",
    "Para activar o desactivar el segundo factor, o para generar códigos de respaldo nuevos, el sistema te pide tu contraseña.",
    "Podés pedir hasta 3 códigos de verificación por minuto y hacer hasta 5 intentos de cambio de contraseña cada 10 minutos. Si llegás al límite, esperá y volvé a probar.",
  ],
  decisions: [],
};

export const HOME_SECTION: ManualSection = {
  id: "inicio",
  title: "Inicio",
  summary: "Muestra los reportes del hospice que tu rol te permite ver.",
  audience:
    "Quienes tengan permiso para ver cada reporte. Por ahora hay un solo reporte: Calidad de datos.",
  topics: [
    {
      title: "Calidad de datos",
      paragraphs: [
        "Muestra cuántas opciones activas tiene cada catálogo de Admisiones y de Huéspedes. Si un catálogo tiene 0, ese campo de los formularios todavía no tiene opciones para elegir.",
        "Si tu rol puede ver un catálogo, tocá su nombre para abrirlo.",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "Si tu rol no tiene permiso para un reporte, el sistema no lo calcula ni lo muestra.",
    "Si tu rol no tiene permiso para ningún reporte, el Inicio muestra «Todavía no hay reportes para mostrar».",
  ],
  decisions: [],
};

export const USERS_SECTION: ManualSection = {
  id: "usuarios",
  title: "Usuarios",
  summary:
    "Cómo ver a las personas con cuenta, crear usuarios, cambiar su rol y revocar o restaurar su acceso.",
  audience: "Administración, con los permisos de Usuarios.",
  topics: [
    {
      title: "Listado",
      paragraphs: [
        "Muestra el nombre, el correo y el rol de cada persona, si su acceso está activo, si verificó su correo y si usa el segundo factor. Podés filtrar por estado y por rol.",
      ],
      steps: [],
    },
    {
      title: "Crear un usuario",
      paragraphs: [
        "«Crear usuario» pide nombre, correo, contraseña inicial repetida dos veces y rol. Si ya sabés que el correo es de esa persona, marcá «Correo verificado». El correo no puede tener otra cuenta ni una invitación pendiente.",
      ],
      steps: [],
    },
    {
      title: "Cambiar el rol",
      paragraphs: [
        "El rol nuevo rige desde la próxima pantalla que abra la persona. No hace falta que vuelva a entrar.",
      ],
      steps: [],
    },
    {
      title: "Revocar y restaurar el acceso",
      paragraphs: [
        "Al revocar el acceso, elegís cuánto dura: «Hasta que se restaure» o «Por una cantidad de días», de 1 a 365. También escribís el motivo, de 5 a 500 caracteres. Se cierran todas las sesiones de la persona en ese momento.",
        "Con «Restaurar acceso», la persona puede volver a entrar con su correo y su contraseña.",
      ],
      steps: [],
    },
  ],
  states: [
    { name: "Activo", description: "La persona puede entrar." },
    {
      name: "Revocado",
      description:
        "No puede entrar. Si la revocación es por días, el estado muestra hasta qué fecha. Pasada esa fecha, puede volver a entrar sin que nadie restaure su acceso.",
    },
  ],
  rules: [
    "Nadie puede cambiar su propio rol ni revocar o restaurar su propio acceso.",
    "Solo podés asignar un rol si vos tenés todos sus permisos. Solo un Super user puede asignar el rol Super user, y cambiar el rol o el acceso de otro Super user.",
  ],
  decisions: [
    "Te recomendamos invitar a las personas en lugar de crearles el usuario. Así cada una elige su propia contraseña.",
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
        "«Nuevo rol» pide un nombre de 2 a 80 caracteres, que no puede repetirse, y una descripción opcional de hasta 500 caracteres. El rol nuevo no tiene permisos: se los asignás después.",
        "Con «Editar» cambiás el nombre o la descripción. Los permisos se cambian desde «Permisos».",
      ],
      steps: [],
    },
    {
      title: "Asignar permisos",
      paragraphs: [
        "«Permisos» muestra los permisos del rol, agrupados por módulo. Marcá acciones sueltas o el módulo completo y tocá «Guardar permisos». Las personas con ese rol ven el cambio en la próxima pantalla que abran.",
      ],
      steps: [],
    },
    {
      title: "Eliminar un rol",
      paragraphs: [
        "Solo podés eliminar un rol que no tenga usuarios y que no figure en ninguna invitación, aunque esté vencida o revocada. El rol se borra junto con sus permisos y no se puede deshacer.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "De sistema",
      description:
        "Super user y Usuario. No se pueden renombrar ni eliminar. Super user siempre tiene todos los permisos. Usuario empieza solo con el permiso de Documentación, y sus permisos se pueden cambiar.",
    },
  ],
  rules: [
    "Nadie puede cambiar los permisos de su propio rol.",
    "Solo podés otorgar permisos que vos tenés.",
  ],
  decisions: [],
};

export const INVITATIONS_SECTION: ManualSection = {
  id: "invitaciones",
  title: "Invitaciones",
  summary:
    "Cómo invitar a una persona por correo para que cree su cuenta con el rol que elijas.",
  audience: "Administración, con los permisos de Invitaciones.",
  topics: [
    {
      title: "Invitar a una persona",
      paragraphs: [],
      steps: [
        "Tocá «Invitar».",
        "Escribí el nombre y el correo de la persona, y elegí su rol.",
        "Tocá «Enviar invitación». La persona recibe un correo con un enlace que vence a los 7 días y se puede usar una sola vez.",
      ],
    },
    {
      title: "Revocar una invitación",
      paragraphs: [
        "Podés revocar una invitación pendiente desde su fila, con «Revocar invitación». El enlace que recibió la persona deja de funcionar.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Pendiente",
      description:
        "La persona todavía puede usar el enlace para crear su cuenta.",
    },
    {
      name: "Vencida",
      description:
        "Pasaron 7 días sin que la persona la use. Para darle acceso, invitala de nuevo.",
    },
    { name: "Aceptada", description: "La persona ya creó su cuenta." },
    {
      name: "Revocada",
      description:
        "Alguien la revocó o no se pudo enviar el correo. El enlace ya no funciona.",
    },
  ],
  rules: [
    "No podés invitar a un correo que ya tiene una cuenta o una invitación pendiente.",
    "Si el correo no se puede enviar, la invitación queda revocada y la pantalla te avisa. Podés volver a invitar a la persona en unos minutos.",
    "Solo podés invitar con un rol si vos tenés todos sus permisos. Solo un Super user puede invitar con el rol Super user.",
  ],
  decisions: [],
};

export const CATALOGS_SECTION: ManualSection = {
  id: "catalogos",
  title: "Catálogos",
  summary:
    "Cómo mantener las listas de opciones que aparecen en los formularios de Admisiones y Huéspedes, y el catálogo de Profesionales de salud.",
  audience:
    "Administración, con los permisos de cada catálogo: ver, crear, modificar y desactivar.",
  topics: [
    {
      title: "Elegir un catálogo",
      paragraphs: [
        "Arriba elegí el grupo, Admisiones o Huéspedes, y después el catálogo. Profesionales de salud está dentro de Admisiones. Solo ves los catálogos que tu rol te permite ver.",
      ],
      steps: [],
    },
    {
      title: "Crear, editar y desactivar opciones",
      paragraphs: [
        "«Nueva opción» pide un nombre de 2 a 120 caracteres y una descripción opcional de hasta 500 caracteres. La opción nueva queda al final de la lista.",
        "Si en ese catálogo ya hay una opción con el mismo nombre, aunque cambien las mayúsculas o los acentos, no se crea otra. Si esa opción estaba desactivada, se vuelve a activar.",
        "Para reactivar una opción, elegí «Inactivas» en el filtro de estado y usá «Reactivar» en su fila.",
      ],
      steps: [],
    },
    {
      title: "Cambiar el orden",
      paragraphs: [
        "Las opciones aparecen en los formularios en el mismo orden que en el catálogo. Para mover una opción, usá las flechas de la columna «Cambiar orden», o «Subir» y «Bajar» en el menú de la fila. También podés arrastrarla desde el asa al principio de la fila.",
        "Con el teclado: llevá el foco al asa y presioná Espacio. Movela con las flechas y presioná Espacio otra vez para soltarla. Para cancelar, presioná Escape.",
        "Los controles de orden aparecen solo si tenés permiso para modificar el catálogo, el filtro está en Activas, no hay ninguna búsqueda y el listado está en el orden propio del catálogo.",
      ],
      steps: [],
    },
    {
      title: "Profesionales de salud",
      paragraphs: [
        "Cada profesional tiene un nombre y, si querés, especialidad, matrícula, teléfono y correo. Se listan en orden alfabético.",
        "El correo vincula al profesional con su cuenta, para que pueda firmar. Si cargás el correo de un profesional desactivado, ese profesional se vuelve a activar con los datos nuevos.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Activa",
      description: "Aparece en los formularios para elegirla.",
    },
    {
      name: "Inactiva",
      description:
        "Ya no aparece para elegir, pero los registros que ya la usan la siguen mostrando.",
    },
    {
      name: "Base",
      description:
        "Opción que vino cargada con el sistema. Podés editarla, ordenarla y desactivarla como cualquier otra.",
    },
  ],
  rules: [
    "Las opciones y los profesionales no se borran: se desactivan.",
    "En Vínculos no se puede cambiar el orden: las opciones nuevas van al final. Profesionales de salud siempre se ordena alfabéticamente.",
    "Para reactivar una opción o cambiar el orden, necesitás el permiso de modificar ese catálogo.",
    "Dos profesionales activos no pueden tener el mismo correo.",
    "Cada cambio queda guardado en el registro de actividad, con el nombre de quien lo hizo.",
  ],
  decisions: [
    "Las opciones se desactivan en lugar de borrarse para no perder lo que ya se registró. Así, una entrevista sigue mostrando la opción que se eligió en su momento.",
  ],
};
