# Divider — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (020-ki-divider).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code).

Contrastado con: `scratchpad/marsui-design-dna.md` (§1 outlines, §3 spacing),
`packages/tokens/tokens/component/list.tokens.json` (precedente divider de
ki-list), `packages/tokens/tokens/component/tabs.material3.tokens.json`
(precedente outline-variant M3) y `specs/002-ki-button/design-extraction.md`
(formato).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Divider_horizontal` (6 variantes align × ends) | `12124:22493` |
| Set `Divider_vertical` (6 variantes align × ends) | `12124:22532` |
| Horizontal `align=center, ends=pointed` | `12124:22484` |
| Horizontal `align=center, ends=rounded` | `12124:22486` |
| Horizontal `align=top/bottom × ends` | `12124:22488` / `12124:22490` / `12124:22480` / `12124:22482` |
| Vertical `align=center, ends=pointed` / `rounded` | `12124:22523` / `12124:22525` |
| Vertical `align=left/right × ends` | `12124:22527` / `12124:22529` / `12124:22519` / `12124:22521` |

Estructura de los sets (get_metadata, verificado 2026-07-17): cada variante
horizontal mide **176×8 px** y cada vertical **8×176 px**; ejes
`align=top|center|bottom` (h) / `left|center|right` (v) × `ends=pointed|rounded`.
La variante por defecto del set es `align=center, ends=pointed`. Ninguna
variante tiene hijos con nombre, texto, slots ni estados de interacción: es un
único vector-hairline dentro del marco de 8 px.

## Anatomía medida

Análisis de píxeles del PNG 1:1 de `align=center, ends=pointed` y
`align=center, ends=rounded` (render compuesto sobre el blanco del set):

- La regla ocupa las filas y=3..4 con ~50% de cobertura por fila → **trazo de
  1 px centrado en el marco de 8 px** (línea en y=3.5–4.5). Coincide con el
  spec ("~1 px low-contrast hairline inside an 8 px frame").
- Intensidad: ~4/255 sobre blanco por fila a media cobertura → alpha efectiva
  ≈ 3% ⇒ consistente con `Outline/base_em` **#00000008** (Black/3).
- `pointed` vs `rounded` es indistinguible a 1 px de trazo salvo en los caps
  (radio 0 vs píldora): eje de apariencia pura.

## Variables vinculadas (get_variable_defs)

Cada variante individual vincula **exactamente una** variable:

| Variable Figma | Valor (Light) | Token Kimen |
|---|---|---|
| `Outline/base_em` | `#00000008` (Black/3) | `{ki.outline.base-em}` |

(El set-contenedor añade `Surface/s0`, `Outline/high_em`, `Space/12xl`,
`Radius/radius_10xl` y `Elevation/e6` — son estilos de la tarjeta de showcase
del set, NO del divider; se descartan.)

## Traducción a tokens de componente

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-divider-*` | onmars | material3 (`md.comp.divider`) |
|---|---|---|---|---|
| Grosor | 1 px hairline | `thickness` | `{ki.size.border.hairline}` (1px) | `{ki.size.border.hairline}` (1dp) |
| Color | `Outline/base_em` Black/3 ↔ White/3 | `color` | `{ki.outline.base-em}` | `{ki.outline.med-em}` (= outline-variant, precedente tabs.material3) |
| End caps | eje `ends=pointed\|rounded` | `radius` | `{ki.radius.round}` (rounded, spec US3) | `{ki.radius.0}` (M3 sin cap treatment) |
| Gutter | marco de 8 px, regla centrada | `spacing` | `{ki.space.md}` (8px) | `{ki.space.zero}` (M3 sin gutter propio) |

## Decisiones (alineadas con el spec aprobado)

1. **`align` no se traslada** (top|center|bottom / left|center|right): es una
   comodidad de colocación del hairline dentro de su gutter reservado en
   Figma, no un eje de comportamiento (Assumptions del spec). v1 centra la
   regla en el gutter simétrico `--ki-divider-spacing`.
2. **`ends` no es atributo**: eje de apariencia pura → `--ki-divider-radius`
   por tema (precedente Round/Square de 002). El default del set Figma es
   `pointed`, pero el contrato aprobado fija onmars = rounded (US3 "onmars
   keeps its rounded hairline"); a 1 px de grosor la diferencia visible se
   limita a los caps.
3. **Color = `{ki.outline.base-em}`**: es la variable exacta vinculada en
   Figma y el mismo rol semántico que ya usa `--ki-list-item-divider-color`
   (016). Cambia de Black/3 a White/3 con el esquema — S7 queda cubierto por
   la capa semántica sin valores propios del componente.
4. **Sin estados, sin slots, sin iconografía**: verificado — ninguna variante
   del set contiene más que el vector del hairline.
5. Contraste: el hairline Black/3 es deliberadamente sutil; como objeto
   gráfico no esencial no le aplica el 3:1 de non-text contrast (precedente
   merge-train registrado para la capa de tokens; Constitutional Surface del
   spec).
