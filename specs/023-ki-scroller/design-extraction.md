# Scroller — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (023-ki-scroller).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code).

Contrastado con: `specs/023-ki-scroller/spec.md` (Design-source analysis),
`packages/tokens/tokens/component/divider.tokens.json` (precedente hairline y
eje de apariencia pura), `packages/tokens/tokens/component/status.tokens.json`
(precedente Space/xs = 4px) y `specs/020-ki-divider/design-extraction.md`
(formato).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Scroller` (página Miscellaneous, 2 variantes) | `12124:22602` |
| `Type=vertical` (8×200 px) | `12124:22597` |
| `Type=horizontal` (200×8 px) | `12124:22599` |

Estructura del set (get_metadata, verificado 2026-07-17): exactamente dos
variantes sobre el único eje `Type ∈ {vertical, horizontal}`. Sin estados
hover/pressed/dragging, sin texto, sin slots, sin iconografía: cada variante
es un contenedor de 8 px de sección transversal con un único hijo `scroll`
(el thumb). Ningún track visible.

## Anatomía medida (get_design_context, código de referencia)

Variante vertical (`12124:22597`, espejo exacto en la horizontal):

- Contenedor 8×200: `padding-inline: 2px` (holgura lateral del thumb) y
  `padding-block: 4px` (inserto Space/xs en los extremos del rail),
  `justify-content: center`, `items-start`, `overflow: clip`.
- Thumb (`scroll`, `12124:22598`): **4 px de grosor**, `min-height: 16px`,
  `max-height: 64px`, `border-radius: Radius/radius_round` (píldora),
  fill `Inverse_white/alpha_6`, `backdrop-blur` (Blur/24 → 12px CSS).
- El thumb dibujado llena solo parte del marco de 200 px: es una muestra
  proporcional, no un rail completo (el `max` de 64 px es el largo de la
  muestra estática, no un límite de contrato — en un scroller real el largo
  del thumb es proporción nativa del viewport visible).
- Lectura compuesta: el "8 px thickness" del spec es el **rail completo**
  (2 + 4 + 2); el thumb propiamente dicho mide 4 px. La píldora flota
  directamente sobre la superficie del contenido: track invisible.

Análisis del PNG 1:1 de `Type=vertical` (8×200): píldora gris muy tenue
(≈5% de negro sobre blanco) de 4 px de ancho centrada, arrancando tras el
inserto superior de 4 px — consistente con `Inverse_white/alpha_6 = #0000000d`
y el inserto Space/xs.

## Variables vinculadas (get_variable_defs)

Ambas variantes vinculan exactamente las mismas variables:

| Variable Figma | Valor (Light) | Token Kimen |
|---|---|---|
| `Inverse_white/alpha_6` | `#0000000d` (Black/5) | `{ki.inverse-white.alpha-6}` |
| `Radius/radius_round` | `1000` | `{ki.radius.round}` |
| `Space/xs` | `4` | `{ki.space.xs}` |
| `Blur/24` | BACKGROUND_BLUR radius 24 | — descartada (ver Decisiones §4) |

## Traducción a tokens de componente

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-scroller-*` | onmars | material3 (sin guía M3: decisión de autor de tema) |
|---|---|---|---|---|
| Color del thumb | `Inverse_white/alpha_6` (Black/5 ↔ White/5) | `thumb-color` | `{ki.inverse-white.alpha-6}` | `{ki.outline.med-em}` (= outline-variant, precedente divider/tabs M3) |
| Grosor del thumb | 4 px | `thumb-thickness` | `{ki.space.xs}` (4px) | `{ki.space.md}` (8px, look de scrollbar de plataforma) |
| Radio del thumb | `Radius/radius_round` (píldora) | `thumb-radius` | `{ki.radius.round}` | `{ki.radius.0}` (M3 sin cap treatment, precedente divider) |
| Largo mínimo del thumb | 16 px (`min-height`) | `thumb-min-length` | `{ki.space.3xl}` (16px) | hereda onmars (cascada 001) |
| Color del track | invisible (sin capa track) | `track-color` | `{ki.transparent-inverse}` | hereda (transparente) |
| Holgura lateral | 2 px a cada lado del thumb | `gutter` | `{ki.space.xxs}` (2px) | `{ki.space.zero}` (rail = thumb, plataforma) |
| Inserto en extremos | 4 px (`padding-block` = Space/xs) | `track-inset` | `{ki.space.xs}` | `{ki.space.zero}` |
| Superficie del viewport | el contenido mismo (sin capa propia) | `surface` | `{ki.transparent-inverse}` | hereda (transparente) |
| Focus ring del viewport | — (artefacto estático) | `focus-ring-color/width/offset` | `{ki.outline.primary-high-em}` / `{ki.space.xxs}` / `{ki.space.xxs}` | hereda (precedente ki-dialog) |

Rail total onmars = `thumb-thickness + 2×gutter` = 4 + 2·2 = **8 px**, el
grosor exacto del marco Figma. Rail material3 = 8 + 0 = 8 px.

## Decisiones (alineadas con el spec aprobado)

1. **El eje `Type` se traslada a `orientation`** (`vertical` por defecto,
   `horizontal`), FR-002. Un valor no reconocido no casa ningún selector y el
   CSS por construcción mantiene el comportamiento vertical (precedente
   badge/divider) — cero código de validación.
2. **Mecanismo del indicador: scrollbar nativo estilizado**, no overlay: el
   scroll permanece 100% nativo (FR-004, SC-004) y el visual se resuelve con
   `::-webkit-scrollbar*` por tokens (Chromium/WebKit: grosor, píldora,
   holgura e insertos exactos) más el fallback estándar
   `scrollbar-width`/`scrollbar-color` (Firefox: color/track por tokens,
   métricas de plataforma). Por eso el indicador NO es un part en v1
   (FR-011); un scrollbar custom webkit ocupa layout, lo que hace el
   indicador y su desaparición medibles en tests.
3. **`thumb-color = {ki.inverse-white.alpha-6}`**: la variable exacta
   vinculada en Figma; cambia Black/5 → White/5 con el esquema — S11 queda
   cubierto por la capa semántica sin valores propios del componente.
4. **El `Blur/24` (backdrop blur) del thumb se descarta**: un rectángulo de
   4 px con fill al 5% no tiene superficie de vidrio perceptible que
   desenfocar y `backdrop-filter` no aplica a pseudo-elementos de scrollbar;
   misma contención de glass que el punto de ki-status (021). Declarado para
   ratificación del founder.
5. **`track-inset` y `focus-ring-*` amplían la enumeración entre paréntesis
   del Constitutional Surface** (que lista thumb color/thickness/radius,
   min length, track, gutter, surface) dentro de la familia declarada
   `--ki-scroller-*`: el inserto de extremos es geometría vinculada en Figma
   (Space/xs) y el focus ring es obligación de FR-007 ("every visual
   property of the viewport") al ser el viewport focalizable (FR-005), con
   los tokens y valores exactos del precedente ki-dialog. Declarado para
   ratificación del founder.
6. **El "8 px thickness" del spec se lee como rail completo**: la extracción
   lo descompone en thumb 4 px + holgura 2 px por lado, fiel al vector; el
   agregado sigue siendo 8 px. Declarado para ratificación del founder.
7. **`max-height: 64px` del thumb no se traslada**: es el largo de la
   muestra estática del artefacto; el largo real del thumb es la proporción
   nativa viewport/contenido (spec, Design-source analysis).
8. **Material 3 no publica scrollbar** (spec Assumptions, verificado
   2026-07-17): los valores material3 son decisiones de autor de tema
   registradas en el token file — thumb `outline.med-em` cuadrado de 8 px a
   ras (look de plataforma), como registra la tabla.
