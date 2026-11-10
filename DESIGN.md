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
  label-to-control: "8px"
  folder-tab-gap: "12px"
  field-gap: "20px"
  sheet-padding-compact: "24px"
  sheet-header-gap: "28px"
  sheet-padding: "44px"
  page-gutter: "56px"
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
---

# Design System: Hospicare

## Overview

**Creative North Star: "La carpeta de historia clínica"**

Hospicare se apoya en un objeto que el equipo del hospice ya conoce: la carpeta de papel con hojas y solapas de color. La hoja blanca descansa sobre una mesa celeste muy clara, y las solapas asoman por su borde derecho. El sistema rechaza tanto el formulario gris intercambiable como la portada emotiva de ONG.

El azul institucional del logo ordena la interacción: acción principal, enlace y foco. Las solapas aportan el único color adicional y todavía no tienen significado asignado; ver la decisión pendiente en Colors. El resto es neutro con un leve tinte azul, para que nada decorativo compita con el dato clínico.

La base técnica es shadcn/ui en estilo radix-nova con IBM Plex Sans e íconos HugeIcons. CLAUDE.md, sección 7, manda sobre componentes, tipografía e íconos. Lo registrado aquí proviene de la única superficie construida, el inicio de sesión; las pantallas autenticadas todavía no tienen evidencia propia.

**Key Characteristics:**

- Mesa celeste, hoja blanca y cuatro solapas de color.
- Una sola familia tipográfica, con tres pesos.
- Un solo azul para actuar, enlazar y enfocar.
- Dos radios: controles y hoja.
- Controles planos; la profundidad pertenece a la hoja.

## Colors

Azul institucional sobre neutros de tinte azul, con cuatro tonos de solapa y equivalentes propios para modo oscuro.

### Primary

- **Azul Madre Teresa** (`primary`): logo, botón principal, enlaces, cursor de texto, selección y foco. En modo oscuro se aclara a `primary-dark` y su texto pasa a `primary-foreground-dark`.

### Secondary

- **Solapa Azul** (`section-blue`): primera solapa. En modo claro coincide con `primary`.
- **Solapa Verde** (`section-green`): segunda solapa.
- **Solapa Ocre** (`section-ochre`): tercera solapa.
- **Solapa Ciruela** (`section-plum`): cuarta solapa.

Cada solapa tiene su equivalente `-dark`.

**Decisión pendiente: asignación de secciones.** Los cuatro tokens `section-*` todavía no están asignados a ninguna sección del sistema. Cuál sección lleva cada color queda por decidir.

**Elección de tema.** El botón compartido `ThemeToggle` alterna claro y oscuro con un clic. Arranca con el tema del sistema operativo y recuerda la elección en el navegador (`RF-UX-06`).

### Tertiary

- **Rojo de Señal** (`destructive`): asterisco de campo obligatorio y estados de error de los componentes shadcn/ui.

### Neutral

- **Mesa Celeste** (`muted`): fondo de la página detrás de la hoja. En modo oscuro, `muted-dark` es el plano más profundo.
- **Hoja Blanca** (`card`): superficie de la hoja. En modo oscuro, `card-dark`.
- **Fondo Base** (`background`): fondo del documento, tapado hoy por la mesa.
- **Tinta Azulada** (`foreground`): títulos, rótulos y texto escrito.
- **Trazo de Campo** (`input`): borde de los campos, visible a 3,31:1 sobre la hoja.

Los tokens `secondary`, `accent`, `popover`, `border`, `muted-foreground`, `sidebar-*` y `chart-*` de `globals.css` siguen con los valores de fábrica y ninguna superficie los ejercita. No forman parte del sistema registrado hasta que se usen y se revisen.

**La Regla del Azul Único.** Acción principal, enlace y foco usan siempre el azul institucional; ningún color de solapa cumple esas funciones.

**La Regla de las Solapas sin Dueño.** Ninguna superficie asocia un color de solapa con una sección hasta que esa asignación esté decidida.

**La Regla de Mesa y Hoja.** La página es el plano más bajo y la hoja se recorta por encima, en modo claro y en modo oscuro.

## Typography

**Display Font:** IBM Plex Sans (con sans-serif)
**Body Font:** IBM Plex Sans (con sans-serif)

**Character:** Una sans técnica y serena, que se lee como un formulario institucional bien impreso. `--font-heading` apunta a la misma familia.

### Hierarchy

- **Headline** (600, 1.5rem, 1.333): título de la hoja.
- **Action** (600, 1.125rem, 1.556): rótulo del botón principal.
- **Label** (500, 1rem, 1.5): rótulos de campo y enlace de recuperación.
- **Body** (400, 1rem, 1.5): texto que la persona escribe en un campo.

**La Regla de la Familia Única.** Todo el producto usa IBM Plex Sans, en los pesos cargados 400, 500 y 600.

## Layout

La única composición construida es la de acceso: una hoja de hasta 480 px centrada en ambos ejes de la mesa, con altura mínima de pantalla completa. El margen lateral de página es de 16 px y sube a 56 px desde 640 px, y deja lugar a las solapas.

El ritmo interno es de 8 px entre rótulo y control, 20 px entre campos, 28 px entre logo y título, y 24 px entre encabezado y formulario. El relleno de la hoja es de 24 px en móvil y 44 px desde 640 px.

Para las pantallas autenticadas rige CLAUDE.md, sección 7: shell y `Sidebar` compartidos, interfaz densa y calma, navegación inferior en móvil y ningún desplazamiento horizontal. Su grilla todavía no existe y no se registra.

## Elevation & Depth

Híbrido. La hoja tiene la única sombra propia del sistema, breve y azulada, más un filete de 1 px con la tinta al 10%. Botones y campos son planos. En modo oscuro la sombra casi desaparece, y la separación recae en la diferencia tonal entre `muted-dark` y `card-dark`.

### Shadow Vocabulary

- **Hoja apoyada** (`box-shadow: 0 14px 34px rgb(11 59 102 / 0.1)`): solo en la hoja. Se define en la propia pantalla y todavía no es un token.

**La Regla de la Hoja Apoyada.** La sombra describe una hoja sobre la mesa; filas, celdas y controles no la llevan.

## Shapes

Esquinas suavemente curvas, en dos medidas de una misma escala basada en `--radius`: `rounded.lg` para botones y campos, `rounded.xl` para la hoja. Las solapas usan `rounded.lg` solo en sus esquinas derechas, porque su lado izquierdo nace detrás de la hoja.

**La Regla de las Dos Curvas.** Los controles llevan la curva chica y la superficie contenedora la grande; no se introducen radios fuera de la escala.

## Components

Son componentes shadcn/ui ajustados con clases de tamaño, sin variantes propias ni archivos de `src/components/ui/` modificados.

### Buttons

Sobrios y grandes, pensados para una persona mayor.

- **Shape:** curva de control (`rounded.lg`).
- **Primary:** azul institucional a todo el ancho, 52 px de alto y rótulo Action.
- **Hover / Focus:** al pasar el puntero, el fondo baja al 80%. El foco visible cambia el borde a `ring` y agrega un halo de 3 px de `ring` al 50%. Al presionar, baja 1 px.
- **Link:** texto azul subrayado de forma permanente, con 44 px de alto.

El halo al 50% da 2,47:1 sobre la hoja clara y 2,53:1 sobre la oscura, y en el botón principal no lo acompaña un borde que contraste. No es referencia para controles propios.

### Cards / Containers

La hoja es la pieza de acceso, y una tarjeta de shadcn/ui por debajo.

- **Corner Style:** curva grande (`rounded.xl`).
- **Background:** `card`, o `card-dark` en modo oscuro.
- **Shadow Strategy:** ver Hoja apoyada en Elevation & Depth.
- **Border:** filete de 1 px con `foreground` al 10%.
- **Internal Padding:** `spacing.sheet-padding-compact` en móvil y `spacing.sheet-padding` desde 640 px.

### Inputs / Fields

- **Style:** fondo transparente, trazo de 1 px en `input`, curva de control, 48 px de alto y 14 px de relleno lateral. El cursor de texto es azul institucional. En modo oscuro el fondo es `input-dark` al 30%.
- **Focus:** borde sólido en `ring` y halo de 3 px de `ring` al 50%.
- **Error / Disabled:** los que trae shadcn/ui con `aria-invalid` y `disabled`; todavía no se ejercitan en una superficie.
- **Obligatorio:** rótulo compartido con asterisco en `destructive`, separado 8 px del texto y oculto para lectores de pantalla; el control lleva `required`.

**Decisión pendiente: tamaño de controles en pantallas de trabajo.** Las alturas de 44, 48 y 52 px corresponden al acceso. La interfaz densa de las pantallas autenticadas todavía no tiene alturas construidas.

### Solapas de carpeta

La firma del sistema. Cuatro rectángulos de color que nacen detrás de la hoja y asoman por su borde derecho, en el orden azul, verde, ocre y ciruela.

- **Medidas:** 56 px de ancho; 64 px de alto en móvil y 96 px desde 640 px; 12 px de separación.
- **Posición:** arrancan 56 px debajo del borde superior de la hoja y sobresalen 16 px en móvil y 40 px desde 640 px.
- **Función actual:** decorativa, oculta para tecnología asistiva y sin sección asignada.

## Do's and Don'ts

### Do:

- **Do** partir siempre de `src/components/ui/` y seguir el orden de CLAUDE.md, sección 7, antes de crear un componente.
- **Do** usar tokens semánticos y la escala de radios de `globals.css`.
- **Do** resolver cada pantalla en modo claro y oscuro con sus tokens `-dark` equivalentes.
- **Do** marcar todo campo obligatorio con el rótulo compartido y sumar `required` al control.
- **Do** usar el logo azul en modo claro y el blanco en modo oscuro.
- **Do** usar íconos HugeIcons, y Sonner para los resultados de operaciones.

### Don't:

- **Don't** asignar un color de solapa a una sección sin la decisión pendiente resuelta.
- **Don't** usar un color de solapa para acción, enlace o foco.
- **Don't** convertir las tarjetas en el patrón dominante de las pantallas de trabajo.
- **Don't** usar `<select>` nativo ni `<input type="date">`.
- **Don't** reemplazar variantes y tokens de shadcn/ui por estilos propios, ni modificar `src/components/ui/` sin aprobación.
- **Don't** extender las alturas del acceso a pantallas de trabajo sin decidirlo antes.
