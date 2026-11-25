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
        "El menú muestra solo las pantallas que tu rol te permite usar. En el teléfono, la barra de abajo tiene Inicio, Admisiones si tu rol puede verla, y Menú. Las demás pantallas se abren desde Menú.",
        "El botón de arriba a la derecha cambia entre modo claro y modo oscuro. En modo claro muestra una luna y en modo oscuro, un sol. Al principio el sistema usa el modo de tu dispositivo.",
      ],
      steps: [],
    },
    {
      title: "Buscar una pantalla o una sección del manual",
      paragraphs: [
        "Tocá «Buscar» en el menú o presioná Ctrl + K (⌘ K en Mac). Escribí parte del nombre: no importan las mayúsculas ni los acentos. Solo aparece lo que tu rol puede ver.",
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
        "Si la fila tiene una pantalla de detalle, hacé doble clic para abrirla. Con el teclado, llegá a la fila con Tab y presioná Enter.",
        "Solo ves las acciones que tu rol permite. Las que anulan, desactivan, revocan o eliminan están en rojo y te piden confirmar antes de hacer el cambio.",
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
  audience: "Quienes tengan permiso para ver cada reporte.",
  topics: [
    {
      title: "Admisiones",
      paragraphs: [
        "Muestra cuántas entrevistas se cargaron en los últimos 7 días, qué parte de las entrevistas vigentes pasó a huésped y cuántas esperan una decisión sobre el ingreso. Una entrevista pasó a huésped cuando se aceptó y su huésped sigue vigente. Las anuladas no se cuentan.",
        "Si tu rol puede ver entrevistas, «Ver entrevistas» abre el listado.",
      ],
      steps: [],
    },
    {
      title: "Huéspedes",
      paragraphs: [
        "Muestra cuántos huéspedes vigentes hay, cuántos de ellos ingresaron desde una entrevista de admisión y cuántos tienen la obra social cargada, con su porcentaje. Los huéspedes anulados no se cuentan.",
        "Si tu rol puede ver huéspedes, «Ver huéspedes» abre el listado.",
      ],
      steps: [],
    },
    {
      title: "Seguimiento clínico",
      paragraphs: [
        "Entre los huéspedes vigentes que tienen evaluación CAM, muestra cuántos tienen delirium probable. Entre los que tienen evaluación física de ingreso, cuántos tienen úlceras por presión.",
        "También muestra cuántas evoluciones diarias se registraron en los últimos 7 días. Las evoluciones anuladas y las de huéspedes anulados no se cuentan.",
      ],
      steps: [],
    },
    {
      title: "Calidad de datos",
      paragraphs: [
        "Muestra cuántas opciones activas tiene cada catálogo de Admisiones y de Huéspedes. Si un catálogo tiene 0, ese campo de los formularios todavía no tiene opciones para elegir.",
        "Si tu rol puede ver un catálogo, tocá su nombre para abrirlo.",
      ],
      steps: [],
    },
    {
      title: "Accesos",
      paragraphs: [
        "Muestra cuántas entradas sumó el registro de actividad en los últimos 7 días: cambios de datos, ingresos y cierres de sesión, e intentos de ingreso fallidos.",
        "Si tu rol puede ver el registro, «Ver registro de actividad» lo abre.",
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

export const ACTIVITY_LOG_SECTION: ManualSection = {
  id: "registro-de-actividad",
  title: "Registro de actividad",
  summary: "Muestra quién hizo cada cambio e ingreso en el sistema, y cuándo.",
  audience: "Administración, con el permiso para ver el Registro de actividad.",
  topics: [
    {
      title: "Qué se registra",
      paragraphs: [
        "Cada alta, cambio o baja de datos, cada ingreso y cierre de sesión, los intentos de ingreso fallidos y los cambios de seguridad de una cuenta, como la contraseña o el segundo factor.",
      ],
      steps: [],
    },
    {
      title: "Buscar y filtrar",
      paragraphs: [
        "Buscá por el nombre de la acción, como «Entrevista anulada», o por el nombre de quien la hizo. Podés filtrar por operación y por recurso. El listado empieza por lo más reciente.",
      ],
      steps: [],
    },
    {
      title: "Columnas",
      paragraphs: [
        "Usuario afectado, IP y Navegador empiezan ocultas. Podés mostrarlas desde «Columnas», y el sistema recuerda tu elección.",
      ],
      steps: [],
    },
  ],
  states: [
    { name: "Completada", description: "La acción se hizo." },
    {
      name: "Fallida",
      description:
        "La acción no se pudo hacer. Por ahora, solo los intentos de ingreso fallidos quedan así.",
    },
  ],
  rules: [
    "Nadie puede modificar ni borrar una entrada desde el sistema.",
    "Si la acción no tiene una persona responsable, como un intento de ingreso fallido, figura «Sistema».",
    "La operación «Baja» agrupa eliminar, anular y desactivar. La acción dice cuál fue.",
  ],
  decisions: ["Por ahora el registro no se puede exportar a Excel."],
};

export const ADMISSIONS_SECTION: ManualSection = {
  id: "admisiones",
  title: "Admisiones",
  summary:
    "Cómo cargar, buscar, consultar, editar, aceptar y anular las entrevistas de admisión.",
  audience:
    "Quienes tengan permiso para ver entrevistas. Cargar, editar, aceptar y anular piden permisos propios.",
  topics: [
    {
      title: "Buscar una entrevista",
      paragraphs: [
        "El listado muestra las entrevistas vigentes, de la más reciente a la más antigua. Podés buscar por el nombre del huésped, su DNI o el nombre de quien respondió la entrevista. El DNI se encuentra con puntos o sin ellos.",
        "Con los filtros ves solo las entrevistas de un vínculo o de un médico de cabecera. Para abrir una entrevista, hacé doble clic en su fila o elegí «Ver entrevista» en el menú de la fila.",
      ],
      steps: [],
    },
    {
      title: "Cargar una entrevista",
      paragraphs: [],
      steps: [
        "Tocá «Nueva entrevista».",
        "Completá las tres secciones: Huésped, Entrevistado y red de cuidado, y Condición clínica. Los campos con asterisco son obligatorios.",
        "Tocá «Guardar entrevista». Si falta algo, las secciones con datos para corregir quedan marcadas y se abre la primera.",
      ],
    },
    {
      title: "Al completar el formulario",
      paragraphs: [
        "Las fechas se escriben como DD/MM/AAAA o se eligen en el calendario. No pueden ser posteriores a hoy. La fecha de entrevista ya viene con la fecha de hoy.",
        "El DNI se puede escribir con puntos. Si ya hay otra entrevista vigente con ese DNI, aparece un aviso para que revises que no sea la misma persona. El aviso no impide guardar.",
        "Algunos campos aparecen solo cuando hacen falta: «Otra religión» si elegís Otra, «Lugar de la metástasis» si hay metástasis y «Opioide» si hay tratamiento con opioides.",
        "Si tu rol puede crear opciones de un catálogo, podés agregar una opción nueva desde el mismo campo, sin salir del formulario.",
        "Si no se puede guardar, lo que cargaste queda en el formulario para que lo corrijas. Cada vez que tocás «Nueva entrevista», el formulario empieza vacío.",
      ],
      steps: [],
    },
    {
      title: "Ver y editar una entrevista",
      paragraphs: [
        "El detalle muestra los datos en las mismas tres secciones. Donde no se cargó nada, dice «Sin cargar». Debajo del nombre figura quién cargó la entrevista y quién la modificó por última vez.",
        "«Editar» abre el formulario con los datos guardados. Si una opción que estaba elegida se desactivó después en su catálogo, se conserva y aparece como inactiva.",
        "Si otra persona guardó cambios mientras editabas, tus cambios no se guardan y aparece un aviso. Actualizá la pantalla para ver la versión actual.",
      ],
      steps: [],
    },
    {
      title: "Aceptar una entrevista",
      paragraphs: [
        "Al aceptar una entrevista se crea el huésped con sus datos: nombre, apellido, fecha de nacimiento, DNI, obra social y dirección. La fecha de internación es la de hoy y el número de historia clínica lo asigna el sistema.",
        "Si ya hay otro huésped vigente con el mismo DNI, la confirmación lo avisa para que revises que no sea la misma persona.",
        "La entrevista aceptada muestra «Aceptada», con la fecha y el número de historia clínica del huésped. Si tu rol puede ver huéspedes, el número abre su ficha.",
        "Los cambios que guardes después en la entrevista no se pasan a los datos del huésped.",
        "Si el huésped se anula, la entrevista vuelve a quedar sin aceptar. Si la aceptás de nuevo, se crea otro huésped con otro número.",
      ],
      steps: [
        "Abrí la entrevista.",
        "Tocá «Aceptar entrevista».",
        "Confirmá con «Aceptar entrevista».",
      ],
    },
    {
      title: "Anular una entrevista",
      paragraphs: [
        "«Anular», en el detalle o en el menú de la fila, pide un motivo de 10 a 500 caracteres.",
        "La entrevista anulada sale del listado y ya no se puede modificar. No se borra: su detalle muestra quién la anuló, cuándo y por qué. La anulación no se puede deshacer.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Pendiente",
      description:
        "Entrevista vigente que espera una decisión sobre el ingreso. Se puede editar, aceptar y anular.",
    },
    {
      name: "Aceptada",
      description:
        "Tiene un huésped vigente. Se puede editar y anular, pero los cambios no se pasan al huésped.",
    },
    {
      name: "Anulada",
      description:
        "Salió del listado. Se puede consultar, pero ya no se puede modificar.",
    },
  ],
  rules: [
    "Las entrevistas no se borran: se anulan con un motivo.",
    "Cargar, editar y anular piden permisos distintos. Si tu rol no los tiene, no ves esos botones y el sistema rechaza la acción.",
    "Aceptar pide el permiso «Crear huéspedes desde entrevistas».",
    "Una entrevista tiene como máximo un huésped vigente. Solo se puede aceptar de nuevo si ese huésped se anuló.",
    "En una entrevista nueva no se pueden elegir opciones desactivadas.",
    "Cada alta, cambio y anulación queda en el registro de actividad, con el dato anterior y el nuevo.",
  ],
  decisions: [
    "El aviso de DNI repetido no bloquea el guardado porque una misma persona puede tener más de una entrevista, por ejemplo si vuelve a ingresar.",
    "Las entrevistas se anulan en lugar de borrarse para no perder lo que se registró.",
    "Los cambios en una entrevista aceptada no se pasan al huésped: la entrevista es el registro de la admisión y el huésped tiene sus propios datos.",
  ],
};

export const GUESTS_SECTION: ManualSection = {
  id: "huespedes",
  title: "Huéspedes",
  summary:
    "Cómo buscar, crear, consultar, editar y anular huéspedes, y cómo se asigna su número de historia clínica.",
  audience:
    "Quienes tengan permiso para ver huéspedes. Crear sin entrevista, editar y anular piden permisos propios.",
  topics: [
    {
      title: "Buscar un huésped",
      paragraphs: [
        "El listado muestra los huéspedes vigentes, de la fecha de internación más reciente a la más antigua. Podés buscar por nombre, DNI, número de historia clínica u obra social. Si escribís solo números, encuentra la historia clínica con ese número exacto y los DNI que contienen esos números.",
        "Con el filtro de origen ves solo los que ingresaron desde una entrevista («Admisión») o los que se crearon sin entrevista («Sin entrevista»). Para abrir la ficha, hacé doble clic en la fila o elegí «Ver huésped» en el menú de la fila.",
      ],
      steps: [],
    },
    {
      title: "Crear un huésped sin entrevista",
      paragraphs: [
        "Lo habitual es que el huésped se cree al aceptar su entrevista de admisión. Crealo sin entrevista solo cuando no la hay.",
        "Si ya hay otro huésped vigente con ese DNI, o una entrevista con ese DNI que todavía no se aceptó, aparece un aviso. El aviso no impide guardar. Si es la misma persona de la entrevista, aceptá la entrevista en lugar de crear el huésped.",
      ],
      steps: [
        "Tocá «Nuevo huésped».",
        "Completá Datos personales e Internación. Los campos con asterisco son obligatorios.",
        "Tocá «Guardar huésped». Se abre la ficha con el número de historia clínica asignado.",
      ],
    },
    {
      title: "Número de historia clínica",
      paragraphs: [
        "Cada huésped recibe un número al crearse: el último asignado más 1. No se edita ni se vuelve a usar, aunque el huésped se anule.",
        "Administración puede cambiar el último número asignado desde Configuración, pero nunca a uno menor.",
      ],
      steps: [],
    },
    {
      title: "Ver la ficha",
      paragraphs: [
        "La pestaña Internación muestra los datos en dos grupos, Datos personales e Internación. Donde no se cargó nada, dice «Sin cargar». También figuran quién cargó al huésped y quién lo modificó por última vez.",
        "El origen dice «Admisión» o «Sin entrevista». Si vino de una entrevista y tu rol puede ver entrevistas, «Ver la entrevista» la abre.",
        "Según tus permisos, también ves las pestañas Evolución diaria y Evaluaciones.",
      ],
      steps: [],
    },
    {
      title: "Editar un huésped",
      paragraphs: [
        "«Editar», en la ficha o en el menú de la fila, abre el formulario con los datos guardados. Se puede cambiar todo, menos el número de historia clínica y el origen.",
        "Si otra persona guardó cambios mientras editabas, tus cambios no se guardan y aparece un aviso. Actualizá la pantalla para ver la versión actual.",
      ],
      steps: [],
    },
    {
      title: "Anular un huésped",
      paragraphs: [
        "«Anular», en la ficha o en el menú de la fila, pide un motivo de 10 a 500 caracteres.",
        "El huésped anulado sale del listado y ya no se puede modificar, ni cargarle evaluaciones o evoluciones. No se borra: su ficha muestra quién lo anuló, cuándo y por qué. Su número de historia clínica no se vuelve a usar. La anulación no se puede deshacer.",
        "Si vino de una entrevista, la entrevista vuelve a quedar sin aceptar.",
      ],
      steps: [],
    },
  ],
  states: [
    {
      name: "Vigente",
      description:
        "Aparece en el listado. Se puede editar y anular, y se le cargan evaluaciones y evoluciones.",
    },
    {
      name: "Anulado",
      description:
        "Salió del listado. Se puede consultar, pero ya no se puede modificar.",
    },
  ],
  rules: [
    "Los huéspedes no se borran: se anulan con un motivo.",
    "Ver, crear desde una entrevista, crear sin entrevista, editar y anular piden permisos distintos. Si tu rol no los tiene, no ves esos botones y el sistema rechaza la acción.",
    "En un huésped no se pueden elegir opciones desactivadas. Si una opción ya elegida se desactiva después, se conserva.",
    "Cada alta, cambio y anulación queda en el registro de actividad, con el dato anterior y el nuevo.",
  ],
  decisions: [
    "El aviso de DNI repetido no bloquea el guardado: lo revisa quien carga.",
    "El número de historia clínica no se vuelve a usar para que cada número identifique siempre a una sola persona.",
    "Los huéspedes se anulan en lugar de borrarse para no perder lo que se registró.",
  ],
};

export const EVALUATIONS_SECTION: ManualSection = {
  id: "evaluaciones",
  title: "Evaluaciones",
  summary:
    "Cómo cargar y modificar la evaluación CAM y la evaluación física de ingreso de un huésped.",
  audience:
    "Quienes tengan permiso para ver evaluaciones CAM o evaluaciones físicas de ingreso. Cargar y modificar piden permisos propios.",
  topics: [
    {
      title: "Dónde están",
      paragraphs: [
        "En la ficha del huésped, pestaña Evaluaciones. Cada huésped tiene una sola evaluación CAM y una sola evaluación física de ingreso. Si hay que corregirlas, se modifican.",
      ],
      steps: [],
    },
    {
      title: "Evaluación CAM",
      paragraphs: [
        "Sirve para detectar delirium. Tiene cuatro criterios que se responden en orden: comienzo agudo, inatención, pensamiento desorganizado y conciencia alterada. Si no hay comienzo agudo o no hay inatención, la evaluación termina ahí.",
        "El resultado se calcula mientras respondés: «Delirium probable» o «Sin delirium probable». La fecha viene con la de hoy y las observaciones admiten hasta 100 caracteres.",
      ],
      steps: [
        "Tocá «Cargar evaluación CAM».",
        "Respondé Sí o No a cada criterio que aparece.",
        "Tocá «Guardar evaluación».",
      ],
    },
    {
      title: "Evaluación física de ingreso",
      paragraphs: [
        "Tiene dos partes: la Escala de síntomas (ESAS) y la Evaluación de ingreso de enfermería. Son obligatorios la fecha y los 10 puntajes de la ESAS, de 0 (nada) a 10 (mucho). El resto es opcional.",
        "Algunos datos aparecen solo cuando hacen falta, y entonces son obligatorios: los del dolor si su puntaje es mayor que 0, el detalle de la lesión neurológica si esa es la causa de la deambulación, el estadio y el lugar si hay úlceras por presión, el lugar si hay edemas y el tipo si hay ostomías.",
      ],
      steps: [
        "Tocá «Cargar evaluación física de ingreso».",
        "Completá la ESAS y los bloques de enfermería.",
        "Tocá «Guardar evaluación». Volvés a la pestaña Evaluaciones.",
      ],
    },
    {
      title: "Modificar una evaluación",
      paragraphs: [
        "«Modificar» abre la evaluación con lo guardado. Si otra persona la cambió mientras la editabas, tus cambios no se guardan y aparece un aviso. Actualizá la pantalla para ver la versión actual.",
      ],
      steps: [],
    },
  ],
  states: [],
  rules: [
    "Cada huésped tiene una sola evaluación CAM y una sola evaluación física de ingreso.",
    "Ver, cargar y modificar piden permisos distintos para cada evaluación. Si tu rol no los tiene, no ves esos botones y el sistema rechaza la acción.",
    "A un huésped anulado no se le pueden cargar ni modificar evaluaciones. Las que ya tenía se siguen viendo.",
    "Cada carga y cada cambio quedan en el registro de actividad, con el dato anterior y el nuevo.",
  ],
  decisions: [
    "Los criterios de la CAM y los puntajes de la ESAS empiezan sin responder, para que nadie guarde un resultado sin haber evaluado.",
    "Cuando un dato deja de hacer falta, por ejemplo porque el dolor vuelve a 0, se guarda vacío.",
  ],
};

export const DAILY_EVOLUTIONS_SECTION: ManualSection = {
  id: "evolucion-diaria",
  title: "Evolución diaria",
  summary:
    "Cómo registrar, corregir, anular y aclarar las evoluciones diarias de un huésped.",
  audience:
    "Quienes tengan permiso para ver evoluciones. Registrar y agregar notas aclaratorias piden «Crear evoluciones»; corregir y anular, sus permisos propios.",
  topics: [
    {
      title: "Registrar una evolución",
      paragraphs: [
        "Si no se puede registrar, el texto queda en el campo para que lo corrijas.",
      ],
      steps: [
        "En la ficha del huésped, abrí la pestaña Evolución diaria.",
        "Escribí en «Nueva evolución», entre 10 y 5000 caracteres.",
        "Tocá «Registrar evolución». Aparece primera en la lista.",
      ],
    },
    {
      title: "La firma",
      paragraphs: [
        "Cada evolución se firma sola: con la especialidad del profesional de salud que tiene tu mismo correo o, si no lo hay, con el nombre de tu rol. Antes de registrar ves «Se firma como …».",
        "La firma no cambia aunque después cambien tu rol o tu especialidad.",
      ],
      steps: [],
    },
    {
      title: "Ver las evoluciones",
      paragraphs: [
        "La lista muestra todas, de la más reciente a la más antigua, con fecha y hora, autor, firma y texto. «Modificada el …» indica que se corrigió. Las notas aclaratorias aparecen debajo de su evolución.",
      ],
      steps: [],
    },
    {
      title: "Corregir o anular una evolución",
      paragraphs: [
        "Solo quien la escribió puede corregirla o anularla, y solo dentro de la ventana de edición. Mientras se pueda, ves «Podés corregirla hasta el …». Después queda «Bloqueada».",
        "«Editar» te deja cambiar el texto y guardarlo con «Guardar cambios».",
        "«Anular» pide un motivo de 10 a 500 caracteres. La evolución sale del historial y ya no se puede modificar ni aclarar. No se borra: quedan registrados quién la anuló, cuándo y el motivo. No se puede deshacer.",
      ],
      steps: [],
    },
    {
      title: "Agregar una nota aclaratoria",
      paragraphs: [
        "Sirve para completar o aclarar una evolución, también cuando ya está bloqueada. La puede agregar cualquiera con permiso para crear evoluciones. Las notas no se pueden corregir ni anular.",
      ],
      steps: [
        "Tocá «Agregar nota aclaratoria» en la evolución.",
        "Escribí la nota, entre 10 y 5000 caracteres.",
        "Tocá «Guardar nota».",
      ],
    },
  ],
  states: [
    {
      name: "Editable",
      description:
        "Está dentro de la ventana de edición. Su autor puede corregirla o anularla.",
    },
    {
      name: "Bloqueada",
      description:
        "Pasó la ventana de edición. Solo se le pueden agregar notas aclaratorias.",
    },
    {
      name: "Anulada",
      description: "Salió del historial. Consta en el registro de actividad.",
    },
  ],
  rules: [
    "Las evoluciones no se borran: se anulan con un motivo.",
    "La ventana de edición se fija en Configuración y cada evolución toma la vigente al registrarse. Si la ventana cambia después, las evoluciones ya registradas conservan su límite.",
    "A un huésped anulado no se le pueden registrar evoluciones.",
    "Cada registro, corrección, anulación y nota queda en el registro de actividad.",
  ],
  decisions: [
    "Solo el autor corrige su evolución, para que lo escrito responda siempre a quien lo firmó.",
    "Las correcciones tienen un plazo para que el registro clínico quede firme. Después, lo que haga falta se agrega como nota aclaratoria.",
  ],
};

export const SETTINGS_SECTION: ManualSection = {
  id: "configuracion",
  title: "Configuración",
  summary:
    "Cómo cambiar el último número de historia clínica asignado y la ventana de edición de las evoluciones diarias.",
  audience:
    "Quienes tengan permiso para ver la configuración. Cambiarla pide el permiso de modificar.",
  topics: [
    {
      title: "Número de historia clínica",
      paragraphs: [
        "Muestra el último número asignado. El próximo huésped recibe ese número más 1.",
        "No se puede guardar un número menor que el último asignado. Si guardás el mismo número, no hay cambios.",
      ],
      steps: [
        "Escribí el nuevo último número asignado, solo con números.",
        "Tocá «Guardar número».",
        "Confirmá. Después no vas a poder volver a un número menor.",
      ],
    },
    {
      title: "Ventana de edición de evoluciones diarias",
      paragraphs: [
        "Define cuánto tiempo después de registrarla su autor puede corregir o anular una evolución. Con «Bloqueo inmediato» no se puede corregir nunca. Con «Durante un tiempo» elegís la cantidad y la unidad (minutos, horas o días), de 1 minuto a 30 días.",
        "Vale para las evoluciones que se registren desde ahora: las anteriores conservan su límite.",
      ],
      steps: [
        "Elegí el modo y, si corresponde, la cantidad y la unidad.",
        "Tocá «Guardar ventana».",
      ],
    },
  ],
  states: [],
  rules: [
    "El número de historia clínica nunca baja: cada número se usa una sola vez.",
    "Debajo de cada parámetro figura quién lo cambió por última vez y cuándo.",
    "Cada cambio queda en el registro de actividad, con el valor anterior y el nuevo. Asignar un número al crear un huésped no cuenta como cambio de configuración.",
  ],
  decisions: [
    "El número no puede bajar para que dos huéspedes nunca compartan historia clínica.",
  ],
};
