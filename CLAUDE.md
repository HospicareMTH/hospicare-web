# Hospicare: instrucciones para agentes

Hospicare es la historia clínica digital del Hospice Madre Teresa. Maneja datos de salud de personas al final de la vida y documentos médico-legales: un error acá no es un bug más. Ante la duda, frená y preguntá.

Respondé siempre en español.

## 1. La ERS manda

`docs/ERS.md` es la única fuente de verdad del producto. El código muestra cómo está hecho algo, no cómo debe funcionar.

Antes de cualquier tarea:

1. Buscá en la ERS los requisitos que toca y citá sus IDs.
2. Leé también lo que los condiciona: reglas transversales, requisitos no funcionales, seguridad y observaciones.
3. Si la tarea no se apoya en ningún requisito, no la implementes: preguntá.

| Busco | Sección de la ERS | IDs |
| --- | --- | --- |
| Pantallas, permisos y administración | 3 y 5 | `RF-ROL`, `RF-USR`, `RF-INV`, `RF-CFG`, `RF-ADM`, `RF-LOG` |
| Acceso y cuenta | 4 | `RF-ACC` |
| Operación clínica | 6 | `RF-ENT`, `RF-HUE`, `RF-EVO`, `RF-CAM`, `RF-FIS`, `RF-ADJ`, `RF-EPI`, `RF-DOC` |
| Catálogos, tablero y comunes | 7 | `RF-CAT`, `RF-DAS`, `RF-BUS`, `RF-TAB`, `RF-MAN`, `RF-UX` |
| Flujos y estados | 8 | |
| Modelo de datos | 9 | |
| Reglas transversales | 10 | `RN` |
| No funcionales | 11 | `RNF` |
| Aceptación | 13 | `CA` |
| Riesgos, brechas y preguntas abiertas | 14 | `R`, `B` |
| Tecnologías, arquitectura y módulos | 15 | |
| Seguridad del despliegue | 16 | `SC`, `SR`, `SB`, `SA`, `SP`, `CS` |

Reglas de uso:

- **Contradicciones:** si el pedido, la ERS y el código no coinciden, o dos secciones se contradicen, no elijas. Mostrá ambas versiones y preguntá. Esto incluye un requisito de las secciones 4 a 13 que describa un comportamiento marcado como riesgo en la 14.
- **Riesgos (`R`):** no los reproduzcas sin aprobación explícita.
- **Brechas (`B`) y preguntas de la sección 14.4:** no las implementes ni las resuelvas por tu cuenta hasta tener la decisión.
- **Referencias de código:** las rutas de las secciones 13.2 y 14.1 pertenecen al sistema anterior, no a este repositorio.
- **Cambios a la ERS:** nunca la edites sin pedido. Si una decisión cambia un requisito, proponé el texto nuevo y actualizalo en el mismo cambio, una vez aprobado.

## 2. Nunca supongas

Suponer es decidir algo que no está escrito en la ERS, en el pedido o en el código vigente. Frená y preguntá siempre que falte o sea ambiguo:

- una regla de negocio, criterio clínico, campo obligatorio, límite o estado;
- quién puede ver o hacer algo;
- un texto visible para el usuario;
- un cambio en el modelo de datos o una migración;
- una dependencia, servicio o variable de entorno nueva;
- qué debe pasar ante un error;
- el alcance de la tarea.

Cómo preguntar:

- Antes de editar y todo junto, en una lista numerada.
- Cada pregunta dice qué encontraste (con ID o archivo), qué falta, las opciones y sus consecuencias.
- Podés recomendar una opción, marcada como recomendación. La recomendación no reemplaza la respuesta.
- No avances con la parte afectada hasta tener respuesta.

Prohibido:

- Completar un hueco con un "valor razonable" o con una práctica habitual.
- Dejar `TODO`, datos de relleno o mocks para esquivar una decisión.
- Copiar el comportamiento de un módulo a otro sin confirmarlo.
- Tomar el silencio como aprobación.
- Inventar criterios médicos, normas legales o datos de pacientes.

No preguntes lo que ya responden la ERS o el código: verificalo antes. Tampoco detalles locales sin efecto externo, como el nombre de una variable interna.

## 3. Cómo se hace cada tarea

1. **Entender:** resumí el pedido en una o dos frases y listá los IDs.
2. **Investigar:** leé el código que se toca, sus llamadores, sus pruebas y sus datos.
3. **Preguntar:** resolvé todo lo pendiente según la sección 2.
4. **Planificar:** indicá archivos, qué cambia en cada uno, qué requisito cubre y cómo se va a probar. Esperá aprobación antes de editar. Solo se exceptúan correcciones sin efecto funcional, como una errata en un comentario.
5. **Implementar:** el cambio más chico que cumpla por completo el requisito.
6. **Verificar:** ejecutá las comprobaciones y leé su salida.
7. **Informar:** requisitos cubiertos, archivos cambiados, comandos ejecutados con su resultado, lo que no se pudo verificar y las decisiones pendientes.

Nunca digas que algo funciona si no lo comprobaste. Si una prueba falla, mostralo.

## 4. Arquitectura y claridad del código

El sistema debe ser modular, profesional, entendible, manejable y escalable (`RNF-21` a `RNF-24`). La estructura completa está en la sección 15.5 de la ERS.

### Arquitectura modular

- **Organización:** por dominio de negocio, en `src/modules/<dominio>/`. Las rutas de `src/app/` solo componen módulos.
- **Responsabilidad:** cada módulo cubre un solo dominio. Si no está claro a qué módulo pertenece algo, preguntá.
- **Límites:** otro módulo solo importa desde `index.ts` o `components/index.ts`. Nunca desde archivos internos.
- **Capas:** `actions`, luego `service`, luego `repository`. Ninguna capa se saltea, y ninguna regla de negocio vive en un componente.
- **Datos:** cada tabla pertenece a un módulo, y solo su `repository` la consulta.
- **Dependencias:** sin ciclos. Si dos módulos se necesitan mutuamente, la regla compartida se extrae a un módulo propio.
- **Módulo nuevo:** crearlo o cambiar la estructura requiere aprobación previa.
- **Reutilización:** antes de escribir algo, buscá si ya existe. Validaciones de fecha, DNI y texto se comparten, nunca se copian.

### Claridad

Quien lea el código por primera vez debe entender qué hace y por qué sin preguntar.

- **Idioma:** identificadores en inglés; textos de usuario y mensajes de error visibles en español rioplatense.
- **Vocabulario único:** huésped `guest`, entrevista `admissionInterview`, evolución `dailyEvolution`, nota aclaratoria `clarification`, epicrisis `epicrisis`, obra social `healthInsurance`, registro de actividad `auditLog`, anular `annul`. No uses sinónimos.
- **Nombres:** completos y descriptivos, sin abreviaturas. Los booleanos se leen como pregunta: `isLocked`, `canEdit`.
- **Funciones:** una sola responsabilidad. Si no se puede explicar en una frase, dividila.
- **Flujo:** retornos tempranos en lugar de anidación profunda.
- **Valores:** nada de números o textos mágicos; constantes con nombre.
- **Tipos:** TypeScript estricto. Prohibidos `any`, `@ts-ignore` y aserciones para callar al compilador.
- **Errores:** explícitos y manejados. Nunca los silencies con un `catch` vacío.
- **Comentarios:** por defecto, ninguno. Si hace falta explicar qué hace el código, mejorá los nombres o la estructura. Solo se admite una línea para un porqué que el código no pueda mostrar. Sin comentarios obvios, separadores, historial de cambios ni código comentado.
- **Código muerto:** se elimina.
- **Simplicidad:** sin abstracciones de un solo uso, opciones sin pedido ni código "para más adelante".
- **Alcance:** cada línea cambiada responde al pedido. No refactorices lo que no te pidieron; mencionalo.

## 5. Reglas del dominio

Son obligatorias en todo cambio. Si alguna parece no aplicar, preguntá.

- **Permisos:** todo acceso y cambio se valida en el servidor, cerca del dato (`RF-ROL-08`, `RN-14`). Ocultar un botón no alcanza. Toda entidad nueva declara sus permisos de ver, crear, modificar y eliminar.
- **Elevación:** nadie obtiene ni otorga privilegios superiores a los que tiene (`R-01`).
- **Auditoría:** todo cambio escribe en el registro de actividad en la misma transacción, con valor anterior y nuevo (`RN-20`, `R-02`, `R-11`).
- **Registros clínicos:** nunca se borran físicamente; se anulan con responsable, fecha y motivo (`RN-04`).
- **Epicrisis activa:** bloquea en el servidor todo cambio del huésped y su admisión, por encima de cualquier ventana de edición (`RN-05`).
- **Firma profesional:** la determina el sistema y no cambia al editar (`RN-08`).
- **Fechas:** toda fecha se calcula en `America/Argentina/Buenos_Aires` con los helpers compartidos (`RN-01`).
- **Validación:** siempre en el servidor, aunque también exista en la interfaz.
- **Datos personales:** nunca en logs, URLs, mensajes de error, prompts ni pruebas. Las pruebas usan datos ficticios.
- **Secretos:** nunca en el código, en la imagen ni en la etapa de build (`SR-05`).
- **IP del cliente:** solo desde `CF-Connecting-IP` (`SC-11`).
- **Archivos:** privados, con enlace firmado breve tras validar permiso (`SA-01`, `SA-03`).
- **Respuestas largas:** toda respuesta termina antes de 125 segundos (`SC-10`).
- **Sistema cerrado:** sin registro abierto ni textos que expongan proveedores o detalles internos (`RF-ACC-01`, `RNF-07`).

## 6. Tecnologías

El stack es el de la sección 15 de la ERS. No agregues, reemplaces ni actualices de versión mayor una dependencia o servicio sin aprobación.

Antes de usar una API de Next.js, leé la guía correspondiente en `node_modules/next/dist/docs/`: esta versión tiene cambios incompatibles con versiones anteriores. Para cualquier otra librería, consultá la documentación de la versión instalada en lugar de confiar en la memoria.

## 7. Interfaz

### shadcn/ui es siempre la base

Sin excepciones (`RNF-25`, `RNF-26`). Para cualquier necesidad de interfaz, seguí este orden:

1. Usá el componente ya instalado en `src/components/ui/`.
2. Si no está, buscalo en el registro oficial con `bunx --bun shadcn@latest search @shadcn -q "<nombre>"` e instalalo con `add`.
3. Si no existe, componelo con otros componentes de shadcn/ui.
4. Si no alcanza, crealo desde cero siguiendo las convenciones de shadcn/ui: su forma de API, variantes, tokens semánticos, `cn()` y accesibilidad.

En cualquiera de los cuatro casos, antes de escribir código ejecutá `bunx --bun shadcn@latest docs <componente>` y leé las URLs que devuelve. Si la documentación no está disponible, frená y avisá: no trabajes de memoria.

Prohibido sin aprobación explícita:

- Otras librerías de componentes o registros comunitarios de shadcn. Las dependencias que instala el propio shadcn/ui están permitidas.
- Actualizar o sobrescribir componentes de `src/components/ui/`.
- Reemplazar variantes y tokens por estilos propios.

### Impeccable en todo trabajo de interfaz

Toda tarea que diseñe, cree, modifique o revise interfaz se hace con la skill `/impeccable`, invocada antes de escribir código de interfaz (`RNF-27`). Impeccable guía el criterio de diseño y experiencia; shadcn/ui sigue siendo la base de componentes. Si una indicación de Impeccable choca con shadcn/ui o con la ERS, no elijas: preguntá.

### Reglas generales

- Tipografía IBM Plex Sans e íconos de HugeIcons.
- Interfaz densa, calma y orientada al trabajo. Las tarjetas no son el patrón dominante.
- Con color, nunca monocromática. Quien usa el sistema suele ser una persona grande y sin perfil técnico: cada sección se reconoce por su color, en su justa medida y sin que se mezclen entre sí.
- Radios de borde consistentes en toda superficie.
- Toda pantalla autenticada usa el shell y `Sidebar` compartidos, y la navegación se declara en el registro común.
- Todo es responsive, con navegación inferior en móvil y sin desplazamiento horizontal.
- Selección con `Select`, `Combobox`, `DropdownMenu`, `RadioGroup` o `ToggleGroup`. Nunca `<select>` nativo.
- Fechas con el selector compartido. Nunca `<input type="date">`.
- Resultados de operaciones con Sonner. `FieldError` solo para errores de campo.
- Todo campo obligatorio se marca con el contrato compartido de `Field`.
- Los textos hablan al usuario final: qué puede hacer, en qué estado está, qué decide.

## 8. Pruebas

- Todo cambio incluye pruebas en Vitest. Sin pruebas, la tarea no está terminada.
- Un bug se corrige escribiendo primero la prueba que lo reproduce.
- Las pruebas nombran el requisito que cubren, por ejemplo `RN-05: rechaza cambios con epicrisis activa`.
- Reglas de base de datos, permisos y auditoría se prueban contra PostgreSQL real.
- Los escenarios `CA` y `CS` que apliquen se implementan como pruebas de punta a punta con Playwright.
- Nunca borres, saltees ni debilites una prueba para que pase.
- Antes de informar el cierre, ejecutá `bun run ci` y reportá el resultado.

## 9. Lo que acompaña a cada función

Una función de producto no está terminada sin:

- permisos declarados y verificados en el servidor;
- entrada en el registro de actividad por cada cambio de datos;
- métrica o reporte en el inicio, con su permiso de visualización (`RF-DAS-02`);
- manual funcional actualizado y accesible desde Documentación (`RF-MAN-02`);
- metadatos SEO, con decisión explícita de indexación (`RNF-20`); las pantallas privadas no se indexan.

## 10. Límites operativos

Pedí confirmación explícita, en cada caso, antes de:

- hacer commit, push, merge o abrir un PR;
- generar o aplicar una migración, o ejecutar SQL que cambie datos;
- borrar archivos, datos o ramas;
- cambiar la configuración de Railway, Cloudflare, GitHub u otro proveedor;
- modificar controles de seguridad, permisos o reglas de auditoría;
- enviar datos a un servicio externo.

Nunca toques producción ni uses datos reales de pacientes desde una tarea de desarrollo. Commits y PR citan los IDs de la ERS.
