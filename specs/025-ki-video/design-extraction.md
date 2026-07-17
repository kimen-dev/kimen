# Video — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (025-ki-video).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` + captura
> del nodo (Figma MCP, skill figma-design-to-code).

Contrastado con: `specs/025-ki-video/spec.md` (Design-source analysis),
`packages/tokens/tokens/component/icon-button.tokens.json` (mecánica glass
verificada del botón), `packages/tokens/tokens/component/status.tokens.json`
(precedente del par e1+inner-white sin blur gratuito) y
`specs/023-ki-scroller/design-extraction.md` (formato).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Video` (página Media, 2 variantes) | `12089:6569` |
| `📐 Size=sm` (256×144 px) | `12082:6790` |
| `📐 Size=md` (640×360 px) | `12089:6570` |

Estructura del set (get_metadata, verificado 2026-07-17): exactamente dos
variantes sobre el único eje `📐 Size ∈ {sm, md}`, ambas 16:9 con anatomía
idéntica: marco redondeado con imagen de póster y una única affordance de
play centrada. Sin scrub bar, timeline, volumen, captions ni fullscreen; sin
estados hover/pressed/playing (spec, Design-source analysis).

## Anatomía medida (get_design_context, código de referencia)

Variante md (`12089:6570`, canónica; la sm es espejo a menor escala):

- **Marco 640×360**: `border-radius: Radius/big_component/radius_xs` (16),
  sombra Elevation/e4 (4 capas drop en Elevation/shadow 3%), borde de ancho
  **0** en `Outline/secondary_button_top` (invisible), `overflow` implícito
  del redondeo.
- **Fondo de respaldo**: gradiente vertical `Color/Dark/500` 40% →
  `Color/Dark/300` 40% **debajo** de la imagen de póster que cubre todo el
  marco (`object-cover`): solo visible sin póster.
- **Halo del play** (`Play`, `12089:6571`): fill `Inverse_white/alpha_6`,
  `backdrop-blur` Blur/24 (→ 12px CSS), `padding: Space/3xl` (16),
  `border-radius: Radius/component/radius_6xl` (28).
- **Contenedor del play** (`Icon_button`, `12089:6573` — instancia literal
  del componente Icon_button): caja **56×56** (= xl de ki-icon-button),
  `border-radius: Radius/component/radius_xl` (14), borde hairline
  `Outline/primary_button_top`, fill `Surface/inverse_white` (negro en
  light) con `backdrop-blur` Blur/24, par glass Component_effect/
  primary_default (drop e1 0/1/1/-0.5 + inner `Color/White/12` 0/3/3),
  y stack Elevation/e6 sobre el wrap.
- **Glifo**: slot `Icon/Placeholder_xl` de **28×28**, dibujado blanco
  (`Text/inverse_black`).

Variante sm (`12082:6790`): misma anatomía a escala — marco
`Radius/radius_md` (8), halo `padding Space/lg` (10) y `radius_4xl` (20),
Icon_button de 40 (`radius_md` 10) con glifo `Placeholder_md` de 20.

Captura 1:1 del md: póster a sangre completa en el marco redondeado, botón
negro cuadrado-redondeado centrado con triángulo de play blanco dentro de un
halo translúcido apenas perceptible sobre la imagen.

## Variables vinculadas (get_variable_defs)

| Variable Figma | Valor (Light) | Token Kimen |
|---|---|---|
| `Radius/big_component/radius_xs` | `16` | `{ki.radius.big-component.xs}` |
| `Inverse_white/alpha_6` | `#0000000d` | `{ki.inverse-white.alpha-6}` |
| `Radius/component/radius_6xl` | `28` | `{ki.radius.component.6xl}` |
| `Space/3xl` | `16` | `{ki.space.3xl}` |
| `Space/16xl` | `56` | `{ki.space.16xl}` |
| `Space/9xl` | `28` | `{ki.space.9xl}` |
| `Radius/component/radius_xl` | `14` | `{ki.radius.component.xl}` |
| `Surface/inverse_white` | `#000000` | `{ki.surface.inverse-white}` |
| `Text/inverse_black` | `#ffffff` | `{ki.text.inverse-black}` |
| `Outline/primary_button_top` | `#00000014` | `{ki.outline.primary-button-top}` |
| `Component_effect/primary_default` | e1 drop + inner White/12 + Blur/24 | `{ki.effect.component.primary.default.shadow}` + `{ki.effect.component.backdrop-blur}` |
| `Blur/24` | BACKGROUND_BLUR radius 24 | `{ki.effect.component.backdrop-blur}` (12px CSS) |
| `Elevation/e4` / `Elevation/e6` | stacks drop en `Elevation/shadow` 3% | — descartadas (ver Decisiones §5) |
| `Color/Dark/500` / `Color/Dark/300` | gradiente de respaldo 40% | — descartado (ver Decisiones §6) |

## Traducción a tokens de componente

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-video-*` | onmars | material3 (sin componente M3: decisión de autor de tema) |
|---|---|---|---|---|
| Radio del marco | `big_component/radius_xs` (16) | `frame-radius` | `{ki.radius.big-component.xs}` | `{ki.radius.component.lg}` (12dp, md.sys.shape.corner.medium, precedente media de ki-card) |
| Color del scrim | `Inverse_white/alpha_6` | `scrim-color` | `{ki.inverse-white.alpha-6}` | `{ki.transparent-inverse}` (plano, sin halo glass) |
| Radio del scrim | `component/radius_6xl` (28) | `scrim-radius` | `{ki.radius.component.6xl}` | hereda (invisible con scrim transparente) |
| Holgura del scrim | `Space/3xl` (16) | `scrim-padding` | `{ki.space.3xl}` | `{ki.space.zero}` |
| Blur de vidrio | `Blur/24` (halo y contenedor) | `backdrop-blur` | `{ki.effect.component.backdrop-blur}` | hereda: la capa semántica lo resuelve a blur none |
| Caja del play | 56×56 (Icon_button xl) | `play-size` | `{ki.space.16xl}` | hereda (56 ≥ 48dp target M3) |
| Glifo del play | 28×28 (`Placeholder_xl`) | `play-icon-size` | `{ki.space.9xl}` | hereda |
| Radio del play | `component/radius_xl` (14) | `play-radius` | `{ki.radius.component.xl}` | `{ki.radius.round}` (M3 shape Round, precedente ki-icon-button) |
| Superficie del play | `Surface/inverse_white` | `play-bg` | `{ki.surface.inverse-white}` | `{ki.surface.primary-med-em}` (filled icon button) |
| Glifo (color) | `Text/inverse_black` | `play-fg` | `{ki.text.inverse-black}` | `{ki.text.primary-on-primary}` |
| Bisel del play | `Outline/primary_button_top`, hairline | `play-border-color` / `play-border-width` | `{ki.outline.primary-button-top}` / `{ki.size.border.hairline}` | `{ki.outline.none}` / hereda |
| Efectos del play | `Component_effect/primary_default` | `play-shadow` | `{ki.effect.component.primary.default.shadow}` | `none` (plano) |
| Focus ring del play | — (artefacto estático) | `focus-ring-color/width/offset` | `{ki.outline.primary-high-em}` / `{ki.space.xxs}` / `{ki.space.xxs}` | hereda (precedente ki-dialog) |
| Fade de la fachada | — (sin motion en el set) | `motion-duration` | `{ki.motion.duration.fast}` | hereda (cero bajo reduced motion, FR-013) |

## Decisiones (alineadas con el spec aprobado)

1. **La variante md es la canónica**: el spec lee `📐 Size` como demo de
   escala, no como eje de API (sin atributo `size`). Los valores de tokens
   provienen íntegros del md (marco 16, halo 28/16, play 56/28/14); los del
   sm (8, 20/10, 40/20/10) quedan documentados como la misma anatomía a
   escala. Declarado para ratificación del founder.
2. **El play es la mecánica glass verificada de ki-icon-button**: la capa
   Figma es una instancia literal de `Icon_button` en 56 (xl), y los tokens
   reutilizan exactamente los mismos semánticos (superficie inversa, bisel
   hairline `primary_button_top`, par e1+inner-White/12, Blur/24) — cero
   valores nuevos en la capa semántica.
3. **El glifo se emite como SVG inline con `currentColor`**: la capa Figma es
   `Icon/Placeholder_xl` (slot de icono, no un glifo contractual), y el
   componente necesita un glifo autónomo (el slot está restringido al
   `<video>`). Precedente ki-alert (aspa) y ki-avatar (persona). El color
   resuelve de `play-fg`.
4. **`scrim-*` amplía la enumeración del Constitutional Surface** ("overlay
   scrim" en el spec) a color+radio+holgura del halo medido, y
   `play-border-*`, `play-shadow`, `backdrop-blur`, `focus-ring-*` y
   `motion-duration` son extensiones declaradas de la familia `--ki-video-*`
   (geometría y efectos vinculados en Figma; obligaciones FR-004/FR-013),
   siguiendo el §5 de 023. Declarado para ratificación del founder.
5. **Los stacks Elevation/e4 (marco) y e6 (wrap del botón) se descartan**:
   sombras al 3% a radios enormes sin presencia perceptible sobre imagen de
   póster; el contenedor del play conserva su par glass propio
   (Component_effect/primary_default), el mismo recorte que hizo ki-status
   con su blur (021 §Decisiones). Declarado para ratificación del founder.
6. **El gradiente de respaldo (Dark/500→Dark/300 al 40%) se descarta**: el
   pipeline no modela gradientes (precedente text-avatar de la ola 1) y la
   capa solo asoma sin póster — caso que el spec define como "whatever the
   native element paints"; el componente no sintetiza póster. Declarado para
   ratificación del founder.
7. **El borde del marco no se traslada**: la variante md declara el stroke
   `Outline/secondary_button_top` con ancho 0 (invisible por construcción en
   el artefacto); un token de borde sin valor visible sería API muerta.
8. **Fixture de tests (decisión declarada)**: `<video muted>` sin fuente con
   póster data-URI generado por canvas y pista de captions WebVTT data-URI —
   cero binarios y cero dependencias; el algoritmo play() sobre media sin
   fuente ya hace observable "playback starts exactly once" (`paused` +
   evento `play`), y `muted` mantiene el fixture dentro de toda política de
   autoplay (S2/S3/S9).
