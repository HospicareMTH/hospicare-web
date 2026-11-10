---
name: Hospicare
description: Historia clínica digital del Hospice Madre Teresa, con la forma de una carpeta clínica.
colors:
  primary: "#005591"
  primary-foreground: "#ffffff"
  ring: "#005591"
  section-blue: "#005591"
  section-green: "#2f7d5c"
  section-ochre: "#b9791c"
  section-plum: "#9c3557"
  section-on-dark: "#ffffff"
  section-on-light: "#1b2733"
  sidebar: "#005591"
  sidebar-foreground: "#ffffff"
  sidebar-primary: "#ffffff"
  sidebar-primary-foreground: "#005591"
  sidebar-accent: "#ffffff"
  sidebar-accent-foreground: "#1b2733"
  sidebar-border: "rgb(255 255 255 / 20%)"
  sidebar-ring: "#ffffff"
  destructive: "oklch(0.577 0.245 27.325)"
  background: "oklch(1 0 0)"
  foreground: "#1b2733"
  card: "oklch(1 0 0)"
  muted: "#edf3f8"
  input: "#7a90a4"
  primary-dark: "#5aa9e6"
  primary-foreground-dark: "#06213a"
  ring-dark: "#5aa9e6"
  section-blue-dark: "#2a78bd"
  section-green-dark: "#3f9a73"
  section-ochre-dark: "#cf8f2e"
  section-plum-dark: "#b9496f"
  sidebar-dark: "#0b3357"
  sidebar-foreground-dark: "#eef3f8"
  sidebar-primary-dark: "#eef3f8"
  sidebar-primary-foreground-dark: "#0b3357"
  sidebar-accent-dark: "#eef3f8"
  sidebar-border-dark: "rgb(255 255 255 / 15%)"
  sidebar-ring-dark: "#5aa9e6"
  destructive-dark: "oklch(0.704 0.191 22.216)"
  background-dark: "#16212c"
  foreground-dark: "#eef3f8"
  card-dark: "#1c2935"
  muted-dark: "#0f1923"
  input-dark: "oklch(1 0 0 / 35%)"
typography:
  headline:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  action:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
rounded:
  lg: "0.625rem"
  xl: "0.875rem"
spacing:
  section-strip: "4px"
  nav-item-gap: "6px"
  label-to-control: "8px"
  folder-tab-gap: "12px"
  page-gutter-compact: "16px"
  field-gap: "20px"
  sheet-padding-compact: "24px"
  sheet-header-gap: "28px"
  shell-gutter: "36px"
  sheet-padding: "44px"
  page-gutter: "56px"
  shell-header: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.action}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "52px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "color-mix(in oklab, #005591 80%, transparent)"
  button-link:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    height: "44px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "4px 14px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.sheet-padding}"
    width: "480px"
  folder-tab-blue:
    backgroundColor: "{colors.section-blue}"
    rounded: "{rounded.lg}"
    width: "56px"
    height: "96px"
  folder-tab-green:
    backgroundColor: "{colors.section-green}"
    rounded: "{rounded.lg}"
    width: "56px"
    height: "96px"
  folder-tab-ochre:
    backgroundColor: "{colors.section-ochre}"
    rounded: "{rounded.lg}"
    width: "56px"
    height: "96px"
  folder-tab-plum:
    backgroundColor: "{colors.section-plum}"
    rounded: "{rounded.lg}"
    width: "56px"
    height: "96px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    width: "256px"
  sidebar-item:
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "52px"
  sidebar-item-hover:
    backgroundColor: "rgb(255 255 255 / 12%)"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
  section-chip-blue:
    backgroundColor: "{colors.section-blue}"
    textColor: "{colors.section-on-dark}"
    rounded: "{rounded.lg}"
    size: "36px"
  section-chip-neutral:
    backgroundColor: "rgb(255 255 255 / 12%)"
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.lg}"
    size: "36px"
  folder-label-blue:
    backgroundColor: "{colors.section-blue}"
    textColor: "{colors.section-on-dark}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "52px"
  folder-label-green:
    backgroundColor: "{colors.section-green}"
    textColor: "{colors.section-on-dark}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "52px"
  folder-label-ochre:
    backgroundColor: "{colors.section-ochre}"
    textColor: "{colors.section-on-light}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "52px"
  folder-label-plum:
    backgroundColor: "{colors.section-plum}"
    textColor: "{colors.section-on-dark}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "52px"
  folder-label-neutral:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "52px"
  section-sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  mobile-nav-bar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    height: "64px"
---

# Design System: Hospicare

## Overview

**Creative North Star: "La carpeta de historia clínica"**

Hospicare se apoya en un objeto que el equipo del hospice ya conoce: la carpeta de papel con hojas y solapas de color. La hoja blanca descansa sobre una mesa celeste muy clara. En el acceso, las solapas asoman por el borde derecho de la hoja; dentro del sistema, cada hoja de trabajo lleva arriba una etiqueta de carpeta del color de su sección, con su nombre. El sistema rechaza tanto el formulario gris intercambiable como la portada emotiva de ONG, y también el panel gris con un acento y el tablero de tarjetas.

El azul institucional del logo ordena la interacción: acción principal, enlace y foco, y además llena la barra lateral, donde el logo va en blanco. Los cuatro colores de sección dicen dónde está la persona: Inicio azul, Admisiones verde, Huéspedes ocre y Epicrisis ciruela; Administración, Documentación y Mi cuenta son neutras. El resto es neutro con un leve tinte azul, para que nada decorativo compita con el dato clínico.

La base técnica es shadcn/ui en estilo radix-nova con IBM Plex Sans e íconos HugeIcons. CLAUDE.md, sección 7, manda sobre componentes, tipografía e íconos. Lo registrado aquí proviene de dos superficies construidas: el inicio de sesión y el shell autenticado con Inicio.

**Key Characteristics:**

- Mesa celeste, hoja blanca y etiqueta de carpeta del color de la sección.
- Barra lateral llena del azul institucional, con el destino activo en pastilla clara.
- Cuatro secciones con color propio; el resto, neutras.
- Una sola familia tipográfica, con tres pesos.
- Dos radios: controles y hoja.
- Controles planos; la profundidad pertenece a la hoja.

## Colors

Azul institucional sobre neutros de tinte azul, con cuatro colores de sección, dos tintas para escribir sobre ellos y equivalentes propios para modo oscuro.

### Primary

- **Azul Madre Teresa** (`primary`): logo, botón principal, enlaces, cursor de texto, selección y foco. En modo oscuro se aclara a `primary-dark` y su texto pasa a `primary-foreground-dark`.
- **Barra Institucional** (`sidebar`): fondo de la barra lateral y de la navegación inferior móvil. En modo claro coincide con `primary`; en oscuro pasa a `sidebar-dark`, un azul profundo que sigue distinguiéndose de la mesa. Su texto es `sidebar-foreground`.
- **Pastilla Activa** (`sidebar-accent`, con `sidebar-accent-foreground`): fondo claro y tinta del destino actual dentro de la barra.
- **Iniciales de Cuenta** (`sidebar-primary`, con `sidebar-primary-foreground`): círculo de iniciales de la persona en el pie de la barra.
- **Foco en Barra** (`sidebar-ring`): anillo de foco sobre el azul; blanco en claro, `sidebar-ring-dark` en oscuro.

### Secondary

Cada color de sección pertenece a una sola sección:

- **Azul de Inicio** (`section-blue`): Inicio. En modo claro coincide con `primary`.
- **Verde de Admisiones** (`section-green`): Admisiones.
- **Ocre de Huéspedes** (`section-ochre`): Huéspedes.
- **Ciruela de Epicrisis** (`section-plum`): Epicrisis.

Cada uno tiene su equivalente `-dark`. Administración, Documentación y Mi cuenta no llevan color de sección.

- **Tinta sobre Sección Oscura** (`section-on-dark`): texto e íconos sobre azul, verde y ciruela.
- **Tinta sobre Ocre** (`section-on-light`): texto e íconos sobre ocre, que es demasiado claro para el blanco.

El color de sección aparece en tres intensidades: relleno pleno (ficha y etiqueta de carpeta), franja de 4 px (filete superior de la hoja) y tinte al 12% con el ícono en el color pleno (medallón del estado vacío).

**Elección de tema.** El botón compartido `ThemeToggle` alterna claro y oscuro con un clic. Arranca con el tema del sistema operativo y recuerda la elección en el navegador (`RF-UX-06`).

### Tertiary

- **Rojo de Señal** (`destructive`): asterisco de campo obligatorio y estados de error de los componentes shadcn/ui.

### Neutral

- **Mesa Celeste** (`muted`): fondo de la página detrás de la hoja, también en el área de trabajo del shell. En modo oscuro, `muted-dark` es el plano más profundo.
- **Hoja Blanca** (`card`): superficie de la hoja. En modo oscuro, `card-dark`.
- **Fondo Base** (`background`): fondo del documento, tapado hoy por la mesa.
- **Tinta Azulada** (`foreground`): títulos, rótulos y texto escrito.
- **Trazo de Campo** (`input`): borde de los campos, visible a 3,31:1 sobre la hoja.

Los tokens `secondary`, `accent`, `muted-foreground` y `chart-*` de `globals.css` siguen con los valores de fábrica y ninguna superficie los ejercita. `popover` (menú de cuenta) y `border` (franja de una sección neutra) ya se usan, pero con valores de fábrica sin tinte azul y sin revisión. Ninguno forma parte del sistema registrado hasta que se revise.

**La Regla del Azul Único.** Acción principal, enlace y foco usan siempre el azul institucional; ningún color de sección cumple esas funciones.

**La Regla de una Sección, un Color.** Inicio es azul, Admisiones verde, Huéspedes ocre y Epicrisis ciruela; todo otro destino es neutro. Un color de sección no se presta a otra sección ni se usa como decoración.

**La Regla de la Tinta Legible.** Sobre ocre se escribe con `section-on-light`; sobre azul, verde y ciruela, con `section-on-dark`. El relleno de sección lleva solo íconos o la etiqueta de 24 px: el verde oscuro con blanco da 3,45:1 y el ocre claro con su tinta 4,20:1, suficientes para texto grande y no para texto de cuerpo.

**La Regla de Mesa y Hoja.** La página es el plano más bajo y la hoja se recorta por encima, en modo claro y en modo oscuro.

## Typography

**Display Font:** IBM Plex Sans (con sans-serif)
**Body Font:** IBM Plex Sans (con sans-serif)

**Character:** Una sans técnica y serena, que se lee como un formulario institucional bien impreso. `--font-heading` apunta a la misma familia.

### Hierarchy

- **Headline** (600, 1.5rem, 1.333): título de la hoja de acceso y etiqueta de carpeta.
- **Action** (600, 1.125rem, 1.556): rótulo del botón principal.
- **Label** (500, 1rem, 1.5): rótulos de campo, enlace de recuperación, destinos de navegación y nombre de la cuenta. El destino activo sube a 600.
- **Body** (400, 1rem, 1.5): texto que la persona escribe en un campo.

El mensaje del estado vacío usa 1.125rem en `foreground`, no en gris.

**La Regla de la Familia Única.** Todo el producto usa IBM Plex Sans, en los pesos cargados 400, 500 y 600.

## Layout

**Acceso.** Una hoja de hasta 480 px centrada en ambos ejes de la mesa, con altura mínima de pantalla completa. El margen lateral es `page-gutter-compact` y sube a `page-gutter` desde 640 px, y deja lugar a las solapas. El ritmo interno es de 8 px entre rótulo y control, 20 px entre campos, 28 px entre logo y título, y 24 px entre encabezado y formulario. El relleno de la hoja es de 24 px en móvil y 44 px desde 640 px.

**Shell autenticado.** Desde 768 px, barra lateral fija de 256 px a la izquierda (logo, destinos y cuenta abajo) y área de trabajo sobre la mesa. El área tiene un encabezado de 80 px con el cambio de tema a la derecha, y debajo la etiqueta de carpeta apoyada sobre la hoja, que ocupa todo el alto restante. El margen lateral es `shell-gutter` (36 px) y `page-gutter-compact` (16 px) en móvil. Los destinos de la barra se separan 6 px.

**Móvil.** Por debajo de 768 px la barra lateral se vuelve un panel que se abre desde "Menú", y una navegación inferior fija en azul institucional muestra los destinos marcados para el teléfono más "Menú". El encabezado muestra el logo azul (blanco en oscuro) a la izquierda. El área de trabajo reserva 96 px abajo para que la barra inferior no tape la hoja, y respeta el área segura del dispositivo.

Rige además CLAUDE.md, sección 7: interfaz densa y calma, ningún desplazamiento horizontal.

**Riesgo registrado: hoja con `overflow-hidden`.** La hoja recorta su contenido para respetar las esquinas, y eso anula `position: sticky` dentro de ella. Los encabezados fijos de tablas futuras no van a funcionar dentro de la hoja tal como está; hay que resolverlo antes de construir la primera tabla larga.

## Elevation & Depth

Híbrido. La hoja tiene la única sombra propia del sistema, breve y azulada. En el acceso la acompaña un filete de 1 px con la tinta al 10%; la hoja del shell no lo lleva, y su borde superior lo marca la franja de sección. Botones, campos, etiquetas y la barra lateral son planos. En modo oscuro la sombra casi desaparece, y la separación recae en la diferencia tonal entre `muted-dark` y `card-dark`.

### Shadow Vocabulary

- **Hoja apoyada** (`box-shadow: 0 14px 34px rgb(11 59 102 / 0.1)`): solo en la hoja, de acceso y de trabajo. Se repite en cada pantalla y todavía no es un token.

**La Regla de la Hoja Apoyada.** La sombra describe una hoja sobre la mesa; filas, celdas, etiquetas y controles no la llevan.

## Shapes

Esquinas suavemente curvas, en dos medidas de una misma escala basada en `--radius`: `rounded.lg` para botones, campos, destinos y fichas; `rounded.xl` para la hoja y la etiqueta de carpeta. Las solapas del acceso usan `rounded.lg` solo en sus esquinas derechas, porque su lado izquierdo nace detrás de la hoja. La etiqueta de carpeta redondea solo arriba, y la hoja del shell deja recta su esquina superior izquierda, donde nace la etiqueta.

**La Regla de las Dos Curvas.** Los controles llevan la curva chica y la superficie contenedora la grande; no se introducen radios fuera de la escala.

## Components

Son componentes shadcn/ui ajustados con clases de tamaño, sin archivos de `src/components/ui/` modificados. Las piezas compartidas del shell viven en `src/components/shared/`, y el registro de destinos en `navigation.ts`.

### Buttons

Sobrios y grandes, pensados para una persona mayor.

- **Shape:** curva de control (`rounded.lg`).
- **Primary:** azul institucional a todo el ancho, 52 px de alto y rótulo Action.
- **Hover / Focus:** al pasar el puntero, el fondo baja al 80%. El foco visible cambia el borde a `ring` y agrega un halo de 3 px de `ring` al 50%. Al presionar, baja 1 px.
- **Link:** texto azul subrayado de forma permanente, con 44 px de alto.
- **Cambio de tema:** botón de ícono de 44 px.

El halo al 50% da 2,47:1 sobre la hoja clara y 2,53:1 sobre la oscura, y en el botón principal no lo acompaña un borde que contraste. No es referencia para controles propios.

### Cards / Containers

La hoja es la superficie contenedora; las tarjetas no son el patrón de las pantallas de trabajo.

- **Corner Style:** curva grande (`rounded.xl`).
- **Background:** `card`, o `card-dark` en modo oscuro.
- **Shadow Strategy:** ver Hoja apoyada en Elevation & Depth.
- **Border:** en el acceso, filete de 1 px con `foreground` al 10%; en el shell, franja superior de sección.
- **Internal Padding:** en el acceso, `sheet-padding-compact` en móvil y `sheet-padding` desde 640 px. La hoja del shell no fija relleno; lo decide su contenido.

### Inputs / Fields

- **Style:** fondo transparente, trazo de 1 px en `input`, curva de control, 48 px de alto y 14 px de relleno lateral. El cursor de texto es azul institucional. En modo oscuro el fondo es `input-dark` al 30%.
- **Focus:** borde sólido en `ring` y halo de 3 px de `ring` al 50%.
- **Error / Disabled:** los que trae shadcn/ui con `aria-invalid` y `disabled`; todavía no se ejercitan en una superficie.
- **Obligatorio:** rótulo compartido con asterisco en `destructive`, separado 8 px del texto y oculto para lectores de pantalla; el control lleva `required`.

**Decisión pendiente: tamaño de controles en pantallas de trabajo.** Las alturas de 44, 48 y 52 px corresponden al acceso y a la navegación. La interfaz densa de las pantallas de trabajo todavía no tiene alturas construidas.

### Navigation

`Sidebar` de shadcn/ui, desplegable fuera de pantalla, con los destinos declarados en el registro común.

- **Barra:** fondo `sidebar` a todo el alto, logo blanco de 192 px arriba, cuenta en el pie separada por un filete `sidebar-border`.
- **Destino:** 52 px de alto, rótulo Label, ficha de 36 px a la izquierda con 12 px de separación.
- **Ficha:** cuadrado de curva chica con anillo blanco al 30% y el ícono del destino a 20 px. Lleva el relleno de su sección con su tinta; los destinos neutros llevan blanco al 12%.
- **Hover:** fondo blanco al 12%, el texto sigue blanco.
- **Activo:** pastilla clara `sidebar-accent` con tinta `sidebar-accent-foreground` y peso 600; la ficha conserva su color. El hover no cambia la pastilla.
- **Foco:** anillo `sidebar-ring` con separación del color de la barra.
- **Móvil:** barra inferior fija en `sidebar`, con filete superior `sidebar-border`; cada destino ocupa una parte igual y muestra ficha y nombre lado a lado en 52 px. El actual lleva la misma pastilla clara. "Menú" usa una ficha neutra y abre la barra lateral como panel.

### Menú de cuenta

Nombre de la persona con sus iniciales en un círculo `sidebar-primary`, en un renglón de 56 px al pie de la barra. Abre hacia arriba un menú del ancho del renglón, con "Cerrar sesión" a 44 px de alto y 16 px de texto. Abierto, el renglón queda en blanco al 12%. Un error de cierre se informa con Sonner.

### Etiqueta de carpeta y hoja de sección

La firma del shell. Toda pantalla de sección es una hoja con su etiqueta.

- **Etiqueta:** encabezado principal de la pantalla, 52 px de alto, 24 px de relleno lateral, ancho según el texto, curva grande solo arriba. Lleva ícono de 24 px y el nombre de la sección en Headline, sobre el relleno de su sección con su tinta. Las secciones neutras usan `card` y `foreground`.
- **Hoja:** ocupa el alto restante, curva grande salvo la esquina superior izquierda, sombra Hoja apoyada.
- **Franja:** filete interno de 4 px arriba de la hoja, del color de la sección; `border` en las neutras. Une la etiqueta con la hoja.
- **Estado vacío:** `Empty` de shadcn/ui centrado, con medallón de 56 px y curva grande en el tinte al 12% de la sección, ícono de 28 px y una frase en `foreground`.

### Solapas de carpeta

Firma del acceso. Cuatro rectángulos de color que nacen detrás de la hoja y asoman por su borde derecho, en el orden azul, verde, ocre y ciruela, el mismo de las cuatro secciones.

- **Medidas:** 56 px de ancho; 64 px de alto en móvil y 96 px desde 640 px; 12 px de separación.
- **Posición:** arrancan 56 px debajo del borde superior de la hoja y sobresalen 16 px en móvil y 40 px desde 640 px.
- **Función:** decorativa y oculta para tecnología asistiva.

## Do's and Don'ts

### Do:

- **Do** partir siempre de `src/components/ui/` y seguir el orden de CLAUDE.md, sección 7, antes de crear un componente.
- **Do** usar tokens semánticos y la escala de radios de `globals.css`.
- **Do** resolver cada pantalla en modo claro y oscuro con sus tokens `-dark` equivalentes.
- **Do** declarar cada destino nuevo en `navigation.ts` con su color de sección o `null` si es neutro.
- **Do** abrir toda pantalla de sección con la hoja y su etiqueta de carpeta compartidas.
- **Do** escribir sobre ocre con `section-on-light` y sobre azul, verde y ciruela con `section-on-dark`.
- **Do** marcar todo campo obligatorio con el rótulo compartido y sumar `required` al control.
- **Do** usar el logo azul sobre la mesa en modo claro y el blanco sobre la barra y en modo oscuro.
- **Do** usar íconos HugeIcons, y Sonner para los resultados de operaciones.

### Don't:

- **Don't** dar color de sección a Administración, Documentación o Mi cuenta, ni prestar un color de una sección a otra.
- **Don't** usar un color de sección para acción, enlace o foco.
- **Don't** poner texto de cuerpo sobre un relleno de sección.
- **Don't** convertir las tarjetas en el patrón dominante de las pantallas de trabajo.
- **Don't** usar `<select>` nativo ni `<input type="date">`.
- **Don't** reemplazar variantes y tokens de shadcn/ui por estilos propios, ni modificar `src/components/ui/` sin aprobación.
- **Don't** extender las alturas del acceso a pantallas de trabajo sin decidirlo antes.
- **Don't** confiar en `position: sticky` dentro de la hoja mientras recorte su contenido.
