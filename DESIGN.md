---
name: Hospicare
description: Historia clínica digital del Hospice Madre Teresa, sobre shadcn/ui limpio, redondeado y en el azul de la casa.
colors:
  primary: "#005591"
  primary-foreground: "#ffffff"
  ring: "#005591"
  section-blue: "#005591"
  section-green: "#2f7d5c"
  section-ochre: "#b9791c"
  section-plum: "#9c3557"
  background: "#ffffff"
  foreground: "#14212d"
  card: "#ffffff"
  muted: "#eef2f5"
  muted-foreground: "#566778"
  border: "#e1e7ec"
  input: "#7a90a4"
  destructive: "oklch(0.577 0.245 27.325)"
  sidebar: "#f3f6f9"
  sidebar-foreground: "#34465a"
  sidebar-primary: "#005591"
  sidebar-primary-foreground: "#ffffff"
  sidebar-accent: "#e4eaf0"
  sidebar-accent-foreground: "#14212d"
  sidebar-border: "#e1e7ec"
  primary-dark: "#5aa9e6"
  primary-foreground-dark: "#06213a"
  section-blue-dark: "#2a78bd"
  section-ochre-dark: "#c58423"
  section-plum-dark: "#b9496f"
  background-dark: "#16212c"
  foreground-dark: "#e8eef4"
  card-dark: "#1c2935"
  muted-dark: "#1f2d3a"
  muted-foreground-dark: "#9aabbb"
  border-dark: "#263442"
  input-dark: "#5f7387"
  destructive-dark: "oklch(0.704 0.191 22.216)"
  sidebar-dark: "#0f1821"
  sidebar-foreground-dark: "#c3d0dc"
  sidebar-primary-dark: "#2a78bd"
  sidebar-accent-dark: "#1f2d3a"
  sidebar-accent-foreground-dark: "#f1f5f9"
typography:
  headline:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  nav:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  action:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
rounded:
  lg: "0.625rem"
  xl: "0.875rem"
  full: "9999px"
spacing:
  label-to-control: "8px"
  inset-margin: "8px"
  field-gap: "20px"
  page-gutter-compact: "16px"
  page-gutter: "24px"
  title-to-content: "24px"
  shell-header: "64px"
  mobile-nav-reserve: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.action}"
    rounded: "{rounded.full}"
    height: "48px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "color-mix(in oklab, #005591 80%, transparent)"
  button-link:
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    height: "44px"
  button-theme-toggle:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    size: "40px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "0"
    padding: "0 4px"
    height: "44px"
  sign-in-column:
    backgroundColor: "{colors.card}"
    width: "384px"
  sign-in-identity-circle:
    backgroundColor: "color-mix(in oklab, #005591 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: "80px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    width: "16rem"
  sidebar-collapsed:
    width: "3.5rem"
  sidebar-item:
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.nav}"
    rounded: "{rounded.lg}"
    height: "40px"
  sidebar-item-hover:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
  sidebar-item-active:
    backgroundColor: "color-mix(in oklab, #005591 10%, transparent)"
    textColor: "{colors.primary}"
  sidebar-item-collapsed:
    rounded: "{rounded.lg}"
    size: "40px"
  sidebar-item-collapsed-active:
    backgroundColor: "color-mix(in oklab, #005591 20%, transparent)"
    textColor: "{colors.primary}"
  sidebar-isotype:
    backgroundColor: "{colors.sidebar-primary}"
    rounded: "{rounded.lg}"
    size: "40px"
  account-avatar:
    backgroundColor: "{colors.sidebar-primary}"
    textColor: "{colors.sidebar-primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    size: "32px"
  content-panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  shell-header:
    height: "{spacing.shell-header}"
    padding: "0 16px"
  page-title:
    textColor: "{colors.foreground}"
    typography: "{typography.title}"
  empty-state:
    rounded: "{rounded.xl}"
    padding: "24px"
  empty-state-media:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: "48px"
  mobile-nav-bar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
  mobile-nav-item:
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "56px"
  mobile-nav-item-active:
    backgroundColor: "color-mix(in oklab, #005591 10%, transparent)"
    textColor: "{colors.primary}"
---

# Design System: Hospicare

## Overview

**Creative North Star: "shadcn/ui tal cual, en el azul de la casa"**

Hospicare usa los componentes de shadcn/ui sin disfrazarlos: la `Sidebar` en variante inset y contraíble a íconos, campos, botones, `Empty`, menús. La identidad no sale de una metáfora ni de bloques de color, sino de tres decisiones chicas y constantes: el azul institucional del logo (`primary`) es la única voz de acción, una sola familia tipográfica (IBM Plex Sans) y esquinas suaves en todo. El resto es neutro con un leve tinte azul, para que nada decorativo compita con el dato clínico.

El color de sección sigue existiendo, pero en su medida más chica: tiñe solo el ícono del destino en la barra lateral y el ícono del título de la pantalla. Inicio es azul, Admisiones verde, Huéspedes ocre y Epicrisis ciruela; Administración, Documentación y Mi cuenta son neutras. Así cada sección se reconoce sin que el color se mezcle con la acción.

Dos superficies están construidas y son la base de este registro: el inicio de sesión (una columna centrada sobre blanco, tomada de una imagen de referencia del usuario) y el shell autenticado con Inicio (el bloque sidebar-08 de shadcn/ui, fijado por el usuario). CLAUDE.md, sección 7, manda sobre componentes, tipografía e íconos.

**Key Characteristics:**

- Componentes de shadcn/ui con sus variantes; los ajustes son de tamaño, no de identidad.
- Un solo azul para acción, enlace, foco y destino activo.
- Color de sección solo en íconos de navegación y de título.
- Una familia tipográfica, tres pesos (400, 500, 600).
- Esquinas suaves: curva de control, curva de panel y círculo para la píldora y los íconos redondos.
- Planos y tonales; la única sombra con intención es la del botón de ingreso.

## Colors

Azul institucional sobre neutros de tinte azul, cuatro colores de sección reducidos a íconos y un juego oscuro propio.

### Primary

- **Azul Madre Teresa** (`primary`, con `primary-foreground`): botón principal, enlaces, cursor de texto, selección, línea del campo enfocado, foco (`ring`), destino activo y sus tintes al 10% y 20%, círculo de identidad del acceso e ícono del estado vacío. En modo oscuro pasa a `primary-dark` con `primary-foreground-dark`.
- **Cuadro de Marca** (`sidebar-primary`, con `sidebar-primary-foreground`): fondo del isotipo blanco cuando la barra está contraída y del avatar de iniciales de la cuenta. En oscuro, `sidebar-primary-dark`.

### Secondary

Cada color de sección pertenece a una sola sección y se aplica solo como color del ícono:

- **Azul de Inicio** (`section-blue`): Inicio. En claro coincide con `primary`; en oscuro, `section-blue-dark`.
- **Verde de Admisiones** (`section-green`): Admisiones. Usa el mismo valor en claro y en oscuro.
- **Ocre de Huéspedes** (`section-ochre`): Huéspedes. En oscuro, `section-ochre-dark`.
- **Ciruela de Epicrisis** (`section-plum`): Epicrisis. En oscuro, `section-plum-dark`.

Los destinos neutros llevan el ícono en `sidebar-foreground`. Hoy solo Inicio está declarado en el registro de navegación; los otros tres colores están definidos y mapeados, pero ninguna pantalla los ejercita todavía.

### Tertiary

- **Rojo de Señal** (`destructive`): asterisco de campo obligatorio y estados de error de shadcn/ui. En oscuro, `destructive-dark`.

### Neutral

- **Blanco de Trabajo** (`background`, `card`): fondo del acceso y del panel de contenido. En oscuro, el acceso usa `card-dark` y el panel `background-dark`.
- **Gris Azulado de Barra** (`sidebar`): barra lateral y el marco que rodea al panel inset; también la navegación inferior móvil. En oscuro, `sidebar-dark`, el plano más profundo.
- **Tinta Azulada** (`foreground`): títulos y texto escrito. En oscuro, `foreground-dark`.
- **Tinta de Barra** (`sidebar-foreground`): rótulos de destinos y nombre de la cuenta; también íconos de destinos neutros.
- **Gris Suave** (`muted`): fondo del medallón del estado vacío y del hover de botones fantasma. `secondary`, `accent` y `popover` comparten valores con `muted` y `card`.
- **Tinta Secundaria** (`muted-foreground`): rótulos del acceso e ícono del cambio de tema.
- **Hover de Barra** (`sidebar-accent`, con `sidebar-accent-foreground`): fondo de un destino bajo el puntero, del menú de cuenta abierto y del destino móvil bajo el puntero.
- **Filete** (`border`, `sidebar-border`): línea inferior del encabezado del shell y línea superior de la navegación móvil.
- **Trazo de Campo** (`input`): línea inferior de los campos, barra de desplazamiento y, al 60%, el borde punteado del estado vacío.

Los tokens `chart-*` de `globals.css` son grises de fábrica y ninguna superficie los usa; no forman parte del sistema registrado.

**La Regla del Azul Único.** Acción, enlace, foco y destino activo usan siempre `primary`; ningún color de sección cumple esas funciones.

**La Regla del Color en el Ícono.** El color de sección solo tiñe el ícono del destino y el ícono del título de su pantalla. No rellena fondos, bandas, insignias ni texto.

**La Regla de una Sección, un Color.** Inicio azul, Admisiones verde, Huéspedes ocre, Epicrisis ciruela; todo otro destino es neutro. Un color no se presta a otra sección.

## Typography

**Display Font:** IBM Plex Sans (con sans-serif)
**Body Font:** IBM Plex Sans (con sans-serif)

**Character:** Una sans técnica y serena. `--font-heading` apunta a la misma familia; se cargan solo los pesos 400, 500 y 600.

### Hierarchy

- **Headline** (600, 1.875rem, 1.2, tracking -0.025em): "Iniciar sesión", único título del acceso.
- **Title** (600, 1.5rem, 1.333, tracking -0.025em): título de cada pantalla autenticada, con el ícono de la sección a 28 px.
- **Action** (600, 1rem): rótulo del botón principal.
- **Nav** (500, 1rem): destinos de la barra lateral y nombre de la cuenta. El destino activo sube a 600.
- **Body** (400, 1rem, 1.5): texto escrito en un campo, enlace de recuperación y mensaje del estado vacío, este último en `foreground`, no en gris.
- **Label** (500, 0.875rem): rótulos de campo en `muted-foreground`, rótulos de la navegación móvil e iniciales del avatar (estas a 600).

**La Regla de la Familia Única.** Todo el producto usa IBM Plex Sans en 400, 500 y 600; no se agregan pesos ni familias.

## Layout

**Acceso.** Página blanca a pantalla completa con una columna de 384 px centrada en ambos ejes y 16 px de margen lateral. De arriba abajo: logo horizontal de 192 px, 48 px, título, 32 px, círculo de identidad, 40 px, formulario. Dentro del formulario, 8 px entre rótulo y campo y 20 px entre campos; el botón principal suma 24 px por encima. El cambio de tema flota a 16 px de la esquina superior derecha.

**Shell autenticado.** `Sidebar` de 16rem en variante inset: el fondo de la página es `sidebar` y el panel de contenido se separa 8 px del borde. Contraída queda en 3.5rem, solo con íconos, y recuerda su estado en la cookie `sidebar_state`. El panel abre con un encabezado de 64 px (botón para contraer a la izquierda, cambio de tema a la derecha, filete inferior) y debajo el contenido con 16 px de margen en móvil y 24 px desde 768 px. Toda pantalla abre con su título y 24 px debajo el contenido, que ocupa el alto restante.

**Móvil.** Por debajo de 768 px la barra lateral se vuelve un panel lateral, el encabezado muestra el logo horizontal de 144 px en lugar del botón de contraer, y una navegación inferior fija muestra los destinos marcados para el teléfono más "Menú", que abre la barra. El contenido reserva 96 px abajo y la barra respeta el área segura del dispositivo.

Rige además CLAUDE.md, sección 7: interfaz densa y calma, ningún desplazamiento horizontal.

## Elevation & Depth

Plano y tonal. La profundidad del shell sale de la diferencia entre `sidebar` y el panel blanco, más la sombra mínima que shadcn/ui da al panel inset. Botones, campos, destinos y el estado vacío son planos. La única sombra propia es la del botón de ingreso, y desaparece en modo oscuro.

### Shadow Vocabulary

- **Panel inset** (`box-shadow` de `shadow-sm` de shadcn/ui): solo el panel de contenido del shell, desde 768 px.
- **Píldora de ingreso** (`box-shadow: 0 10px 24px -8px rgb(0 85 145 / 0.55)`): solo el botón principal del acceso, en modo claro.

**La Regla de lo Plano.** Ningún control lleva sombra propia salvo la píldora de ingreso; la separación se resuelve con tono y filete.

## Shapes

Esquinas suavemente curvas, de una escala basada en `--radius`: `rounded.lg` para destinos, cuadro del isotipo, avatar y superficies de la navegación móvil; `rounded.xl` para el panel inset y el estado vacío; `rounded.full` para el botón principal del acceso, el cambio de tema, el círculo de identidad y el medallón del estado vacío. Los campos del acceso no tienen caja: son una línea inferior, sin radio. El estado vacío lleva borde punteado de 1 px.

**La Regla de la Escala.** Ningún radio fuera de `lg`, `xl` y `full`.

## Components

Son componentes de shadcn/ui con ajustes de tamaño por clase, sin cambios en `src/components/ui/`. Las piezas compartidas viven en `src/components/shared/` y el registro de destinos en `navigation.ts`.

### Buttons

- **Shape:** píldora (`rounded.full`) en el acceso; curva de control en el resto.
- **Primary:** azul a todo el ancho, 48 px de alto, rótulo Action, con la sombra Píldora de ingreso en claro.
- **Hover / Focus:** el fondo baja al 80%; foco con el anillo de shadcn/ui en `ring`.
- **Link:** texto azul de 16 px y 44 px de alto, subrayado al pasar el puntero.
- **Cambio de tema:** botón fantasma redondo con luna o sol de 20 px en `muted-foreground`; 44 px en el acceso y 40 px en el shell.

### Inputs / Fields

- **Style:** sin caja ni fondo, solo una línea inferior de 1 px en `input`, 44 px de alto y 4 px de relleno lateral. Cursor azul.
- **Focus:** la línea pasa a `primary` y se engrosa con una segunda línea interna de 1 px; sin halo.
- **Obligatorio:** rótulo compartido (`RequiredFieldLabel`) con asterisco en `destructive`, oculto para lectores de pantalla; el control lleva `required`.
- **Error / Disabled:** los de shadcn/ui; todavía no se ejercitan en una superficie.

Este campo de línea es del acceso. Las pantallas de trabajo todavía no tienen campos construidos.

### Navigation

`Sidebar` de shadcn/ui, variante inset, contraíble a íconos con tooltips y riel para alternar.

- **Marca:** logo horizontal de 160 px expandida; contraída, isotipo blanco de 28 px sobre cuadro `sidebar-primary` de 40 px.
- **Destino:** 40 px de alto, rótulo Nav, ícono de 20 px en el color de su sección o en `sidebar-foreground` si es neutro.
- **Hover:** `sidebar-accent`.
- **Activo:** tinte de `primary` al 10% con texto `primary` en 600. Contraída: tinte al 20% y anillo de 1 px de `primary` al 40%, en un cuadro de 40 px.
- **Cuenta:** al pie, avatar de iniciales de 32 px en `sidebar-primary`, nombre y flechas; abre un menú con "Cerrar sesión" (44 px de alto, ícono de 20 px) hacia la derecha, o hacia abajo en móvil. Abierto, el renglón queda en `sidebar-accent`. Un error se informa con Sonner.
- **Móvil:** barra inferior en `sidebar` con filete superior; cada destino ocupa una parte igual, con ícono de 24 px sobre el rótulo en 56 px. El actual lleva el mismo tinte al 10% y texto `primary`. "Menú" usa ícono neutro.

### Título de pantalla

`SectionSheet` abre toda pantalla autenticada con un `h1` en Title y el ícono del destino a 28 px en su color de sección, separado 12 px del texto.

### Estado vacío

`Empty` de shadcn/ui que ocupa el alto disponible, curva `xl` y borde punteado de `input` al 60%. Medallón redondo de 48 px en `muted` con ícono de 24 px en `primary`, y una frase en Body sobre `foreground`.

### Acceso

Columna única: logo, título Headline, círculo de identidad de 80 px (tinte de `primary` al 10% con UserCircle02 de 48 px en `primary`), dos campos de línea, botón píldora y enlace. Sin tarjeta, sin bandas, sin texto explicativo.

## Do's and Don'ts

### Do:

- **Do** partir siempre de `src/components/ui/` y seguir el orden de CLAUDE.md, sección 7, antes de crear un componente.
- **Do** usar tokens semánticos y la escala de radios de `globals.css`, y resolver cada pantalla en claro y oscuro.
- **Do** declarar cada destino nuevo en `navigation.ts` con su color de sección o `null` si es neutro.
- **Do** abrir toda pantalla autenticada con `SectionSheet`, para que el título lleve el ícono de su sección.
- **Do** marcar todo campo obligatorio con `RequiredFieldLabel` y sumar `required` al control.
- **Do** usar el logo azul en modo claro, el blanco en oscuro y el isotipo blanco sobre `sidebar-primary` con la barra contraída.
- **Do** usar íconos HugeIcons, y Sonner para los resultados de operaciones.

### Don't:

- **Don't** usar un color de sección para acción, enlace, foco, fondo, banda, insignia o texto.
- **Don't** dar color de sección a Administración, Documentación o Mi cuenta, ni prestar un color de una sección a otra.
- **Don't** agregar sombras a controles o superficies fuera de las dos registradas.
- **Don't** convertir las tarjetas en el patrón dominante de las pantallas de trabajo.
- **Don't** usar `<select>` nativo ni `<input type="date">`.
- **Don't** reemplazar variantes y tokens de shadcn/ui por estilos propios, ni modificar `src/components/ui/` sin aprobación.
- **Don't** extender el campo de línea ni las alturas del acceso a pantallas de trabajo sin decidirlo antes.
