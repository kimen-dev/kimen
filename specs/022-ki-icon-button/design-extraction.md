# Icon_button — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (022-ki-icon-button).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_metadata` + `get_design_context` + `get_variable_defs` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code).

Contrastado con: `specs/002-ki-button/design-extraction.md` (§2 variante × estado,
§3 Icon_button md — esta extracción reutiliza esa evidencia variante a variante y
solo añade los deltas propios del set Icon_button),
`scratchpad/marsui-design-dna.md` (§1 biseles, §5 efectos/focus/radios),
`packages/tokens/tokens/component/button.tokens.json` y
`packages/elements/src/components/ki-button/ki-button.css` (patrón CSS de destino).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Icon_button` (página Buttons; 160 símbolos) | `10078:2975` |
| primary xs default | `10078:3147` |
| primary sm default | `10078:3138` |
| primary md default (ya extraído en 002 §3) | `10078:3129` |
| primary md hover | `10078:3084` |
| primary md disabled | `10078:2994` |
| primary lg default | `10078:3120` |
| primary xl default | `10078:3111` |
| secondary md default | `10078:3480` |

Estructura del set (get_metadata, verificado 2026-07-17): ejes **Type**
(primary / primary_light / secondary / tertiary / quaternary / neutral / flat /
primary_flat — los mismos ocho del set `Button`) × **Size** (xs/sm/md/lg/xl) ×
**State** (default/hover/focus/disabled) = 160 símbolos. Todos los símbolos son
**cuadrados exactos** (w = h) y no existe eje de tono: igual que en `Button`,
danger/success no forman parte del set (y a diferencia de `Button`, aquí NO
existen sets paralelos `Icon_button_danger`/`Icon_button_success` — ver
Assumptions del spec: `tone` es decisión de paridad de API, no extracción).

## Anatomía medida (get_design_context por representante)

Anatomía común a todas las variantes: caja cuadrada, `padding: Space/zero` (0),
icono único centrado (flex `items-center justify-center`), sin texto, sin slots
laterales. El borde de 1px es **INNER** en Figma (dentro de la caja): la cota
cuadrada ya contiene el borde.

| Size | Caja (w=h) | Variable de caja | Icono | Radio | Variable de radio |
|---|---|---|---|---|---|
| xs | 24 | `Space/7xl` | **16** (`Icon / Placeholder_xs`) | 6 | `Radius/component/radius_xs` |
| sm | 32 | `Space/10xl` | **18** (`Placeholder_sm`) | 8 | `Radius/component/radius_sm` |
| md | 40 | `Space/12xl` | **20** (`Placeholder_md`) | 10 | `Radius/component/radius_md` |
| lg | 48 | `Space/14xl` | **24** (`Placeholder_lg`) | 12 | `Radius/component/radius_lg` |
| xl | 56 | `Space/16xl` | **28** (`Placeholder_xl`) | 14 | `Radius/component/radius_xl` |

Deltas vs `Button` (002 §1): mismas cotas de caja (= alturas del Button) y los
MISMOS radios por tamaño (6/8/10/12/14), pero la rampa de icono va **un paso
por encima** en todos los tamaños y estira los extremos: Button 14/16/18/20/24 →
Icon_button **16/18/20/24/28**. (002 §3 ya había detectado el paso md 18→20;
esta extracción completa la rampa.)

Efectos y colores por variante × estado (verificado en los representantes md;
idénticos 1:1 a los del `Button` de 002 §2):

- **primary default**: fondo `Surface/primary_med_em`, borde 1px
  `Outline/primary_button_top`, estilo `Component_effect/primary_default`
  (Blur 24 → CSS `backdrop-filter: blur(12px)` + drop e1 `(0,1,1,−0.5)`
  `Elevation/shadow` + inner `(0,3,3,0)` `Color/White/12`).
- **primary hover**: mismo fondo + overlay `linear-gradient` White/5 encima,
  `Component_effect/primary_hover` (Blur 24 + drops `(0,20,20,−12)` /
  `(0,3,3,−1.5)` / `(0,1,1,−0.5)` + inner White/18).
- **primary disabled**: fondo `Surface/disabled_base_em`, **sin borde, sin
  sombras**, conserva Blur 24. Igual que Button disabled (002 §2.1).
- **secondary default**: fondo `Surface/special/secondary_alpha_base` (vidrio
  gris), borde `Outline/secondary_button_top`,
  `Component_effect/secondary_default` (Blur 24 + drop `(0,2,1.5,−0.5)` +
  inner White/3).
- **focus**: variantes State=focus presentes en el set; `Focus/primary` (anillo
  spread 3px `Outline/primary_base_em_alpha`) y `Focus/gray` en las variables
  vinculadas — mismo mecanismo doble del Button (002 §2.5).

## Variables vinculadas (get_variable_defs sobre el set)

El fichero estaba en modo **Dark** durante la extracción, así que los valores
resueltos confirman además la rama oscura de las variables por esquema (la rama
Light quedó documentada en 002):

| Variable Figma | Valor resuelto (Dark) | Token Kimen |
|---|---|---|
| `Surface/primary_med_em` | `#845abe` (invariante) | `{ki.surface.primary-med-em}` |
| `Surface/Special/secondary_alpha_base` | `#242424e0` (L: `#f2f2f4cc`) | `{ki.surface.special.secondary-alpha-base}` |
| `Surface/disabled_base_em` | `#ffffff14` (L: `#f2f2f4`) | (Kimen conserva la desviación 010 D2: `{ki.surface.disabled-low-em}`) |
| `Outline/primary_button_top` / `_bottom` | `#0000001f` / `#0000003d` | `{ki.outline.primary-button-top}` / `{ki.outline.primary-button-bottom}` |
| `Outline/secondary_button_top` / `_bottom` | `#ffffff08` / `#ffffff0d` | `{ki.outline.secondary-button-top}` / `{ki.outline.secondary-button-bottom}` |
| `Surface/hover_overlay` / `_inverse` | `#0000000d` / `#ffffff08` | `{ki.surface.hover-overlay}` / `{ki.surface.hover-overlay-inverse}` |
| `Component_effect/primary_default` / `_hover` | Blur24 + e1 + inner W/12 → hover 3 drops + inner W/18 | `{ki.effect.component.primary.default.shadow}` / `{ki.effect.component.primary.hover.shadow}` + `{ki.effect.component.backdrop-blur}` |
| `Component_effect/secondary_default` / `_hover` | Blur24 + drop (0,2,1.5,−0.5) + inner W/3 → hover W/8 | `{ki.effect.component.secondary.default.shadow}` / `{ki.effect.component.secondary.hover.shadow}` |
| `Focus/primary` | spread 3px `Outline/primary_base_em_alpha` `#845abe66` | `{ki.focus.primary}` |
| `Space/3xl…9xl` | 16/18/20/24/28 (iconos) | `{ki.space.3xl}` `{ki.space.4xl}` `{ki.space.5xl}` `{ki.space.7xl}` `{ki.space.9xl}` |
| `Space/7xl…16xl` | 24/32/40/48/56 (cajas) | `{ki.space.7xl}` `{ki.space.10xl}` `{ki.space.12xl}` `{ki.space.14xl}` `{ki.space.16xl}` |
| `Radius/component/radius_xs…xl` | 6/8/10/12/14 | `{ki.radius.sm}` `{ki.radius.md}` `{ki.radius.lg}` `{ki.radius.xl}` `{ki.radius.2xl}` |
| `Elevation/shadow` | `#00000014` (L: `#00000008`) | (color interno de los composites de efecto) |

(El set-contenedor añade `Surface/s0`, `Outline/high_em`, `Radius/radius_10xl`,
`Elevation/e6`, `Text/*` — estilos de la tarjeta de showcase, NO del icon
button; se descartan, igual que en 021.)

## Traducción a tokens de componente

La matriz variante × tono × estado de `--ki-icon-button-*` referencia
exactamente los MISMOS tokens semánticos que `--ki-button-*` (002): mismos
fondos, biseles top/bottom, overlays de hover, sombras
`ki.effect.component.*`, blur de vidrio y anillo de focus. Los deltas propios
del componente son solo dimensionales:

| Propiedad | Token `--ki-icon-button-*` | onmars | material3 |
|---|---|---|---|
| Caja (w=h) por talla | `{size}-size` | `{ki.space.7xl/10xl/12xl/14xl/16xl}` (24/32/40/48/56) | (hereda; M3 standard 40dp ≡ md) |
| Icono por talla | `{size}-icon-size` | `{ki.space.3xl/4xl/5xl/7xl/9xl}` (16/18/20/24/28) | (hereda; M3 24dp ≈ lg) |
| Radio por talla | `{size}-radius` | `{ki.radius.sm/md/lg/xl/2xl}` (6/8/10/12/14) | `{ki.radius.round}` (M3 shape Round, igual que 002) |
| Matriz de color/estado | `{variant}-{tone}-{state}-{bg\|fg\|border}` | = referencias de `button.tokens.json` | borde → `{ki.outline.none}` y overlay → `{ki.state-layer.hover}` (= button.material3) |
| Sombras por variante | `{variant}-{state}-shadow` | = `{ki.effect.component.*}` / migrated de 002 | (hereda) |
| Bisel inferior | `{variant}-rest-border-bottom` | `{ki.outline.primary/secondary-button-bottom}` | `{ki.outline.none}` |
| Vidrio | `backdrop-blur` | `{ki.effect.component.backdrop-blur}` | (semántico M3 resuelve blur 0) |
| Focus | `focus-ring-{color,width,offset,shadow}` | = 002 (`{ki.focus.primary}` + outline opaco WCAG) | (hereda) |
| Borde | `border-width` | `{ki.size.border.hairline}` | = button.material3 (badge m3 border-width) |

## Decisiones (alineadas con el spec aprobado)

1. **Reutilización 1:1 del sistema visual del Button**: cada capa medida en los
   representantes (fondo, bisel top/bottom, overlay de hover, pila de sombras,
   blur, focus) coincide con la evidencia de 002; la matriz de color de
   `icon-button.tokens.json` referencia los mismos tokens semánticos que
   `button.tokens.json` en vez de re-derivar valores. Los ocho Types del set
   colapsan a los cinco niveles semánticos por la misma regla de 002
   (light/flat son sub-estilos de capa de tokens).
2. **Rampa de icono propia (16/18/20/24/28)**: única divergencia dimensional
   respecto al Button; extraída de los `Icon / Placeholder_{size}` del set y
   registrada como tokens `{size}-icon-size`.
3. **Cota exacta sin calc de padding**: el Button mantiene sus alturas exactas
   restando el borde del padding-block (002 §1, strokes INNER); el icon button
   tiene padding 0 (`Space/zero`), así que la garantía equivalente es
   `box-sizing: border-box` + `block-size`/`inline-size` fijas a la cota — el
   borde de 1px queda dentro de los 24/32/40/48/56 exactos.
4. **Disabled hereda la desviación deliberada 010 D2** (Figma
   `Surface/disabled_base_em` gray.100 + icono base_em ≈1.4:1; Kimen usa
   `disabled-low-em` gray.200 + `text.muted`), pendiente de ratificación del
   founder — misma decisión que 002, aplicada por referencia semántica.
5. **Sin matrices de tono en la fuente**: verificado en el listado de páginas
   del set — no existen `Icon_button_danger`/`Icon_button_success`. `tone`
   resuelve por los tokens de intención semántica que 002 declaró (decisión de
   paridad de API registrada en el spec, no extracción).
6. **Focus como en 002**: anillo suave `Focus/primary` (3px al 40%) apilado
   bajo el outline opaco de 2px que garantiza WCAG 1.4.11 (mecanismo doble
   V.1); las variantes State=focus del set no añaden capas nuevas.
