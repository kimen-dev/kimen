# Indicator — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (024-ki-indicator).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code) más análisis del SVG exportado de
> cada variante (geometría vectorial exacta).

Contrastado con: `specs/024-ki-indicator/spec.md` (Design-source analysis),
`packages/tokens/tokens/component/status.tokens.json` (precedente
Inverse_white y hallazgo de contraste), `specs/023-ki-scroller/design-extraction.md`
(precedente de composición calc sobre tokens y ampliación declarada de la
enumeración) y `specs/020-ki-divider/design-extraction.md` (formato).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Indicator` (página Miscellaneous, 3 variantes) | `14225:4055` |
| `State=active` (32×16) | `14225:3903` |
| `State=active_2` (24×16) | `20334:10604` |
| `State=inactive` (8×16) | `14225:3904` |
| Fila compuesta `Nav_indicator` (74×16) | `14195:5866` |

Estructura del set (get_metadata, verificado 2026-07-17): exactamente tres
símbolos sobre el único eje `State ∈ {active, active_2, inactive}`, todos de
16 px de alto. Sin estados hover/focus/pressed, sin texto, sin slots, sin
iconografía. `Nav_indicator` (74×16) compone un `active` (32×16) más tres
`inactive` (8×16) con gaps de 6 px vinculados a `Space/sm`
(32 + 3·8 + 3·6 = 74, verificado), `items-center` y `justify-center`.

## Anatomía medida (get_design_context + SVG exportado)

- **`State=inactive` (8×16)**: círculo pintado de **8×8** (r=4) centrado
  verticalmente en el marco de 16; relleno negro con `fill-opacity 0.18`
  (= `Inverse_white/alpha_18`, #0000002e). El marco de 16 es la línea de la
  fila, no geometría del punto.
- **`State=active` (32×16)**: **píldora hueca** — path even-odd cuyo anillo
  exterior es la píldora completa 32×16 (radio 8, círculo perfecto en los
  extremos) y cuyo recorte interior va de (5,5) a (27,11): hueco de
  **22×6 con radio 3**. Es decir: anillo de 5 px de grosor uniforme
  ((16 − 6) / 2 = 5) y radio interior derivado (8 − 5 = 3). Mismo relleno
  negro `fill-opacity 0.18`.
- **`State=active_2` (24×16)**: marco 24 (`Space/7xl`) con
  `overflow: clip` y `Radius/radius_round`; dentro, píldora **sólida** de
  20×8 con radio `Radius/component/radius_sm` (8) centrada (top 4), relleno
  `Inverse_white/alpha_88` (#000000e0). Sin documentación de uso en el
  fichero (ver Decisiones §2).
- **Marco del set**: la tarjeta blanca redondeada (Surface/s0,
  Outline/high_em, Space/12xl, Radius/radius_10xl, Elevation/e6) es framing
  de showcase, NO anatomía del componente; se descarta (precedente 021).

## Variables vinculadas (get_variable_defs)

| Variable Figma | Valor (Light) | Token Kimen |
|---|---|---|
| `Inverse_white/alpha_18` | `#0000002e` (Black/18 ↔ White/18) | `{ki.inverse-white.alpha-18}` |
| `Space/10xl` | `32` (ancho de `active`) | `{ki.space.10xl}` |
| `Space/3xl` | `16` (alto de fila y de `active`) | `{ki.space.3xl}` |
| `Space/md` | `8` (ancho de `inactive`) | `{ki.space.md}` |
| `Space/sm` | `6` (gap de `Nav_indicator`) | `{ki.space.sm}` |
| `Radius/radius_round` | `1000` | `{ki.radius.round}` |
| `Space/7xl` | `24` (ancho de `active_2`) | — descartada (Decisiones §2) |
| `Inverse_white/alpha_88` | `#000000e0` (fill de `active_2`) | — descartada (Decisiones §2) |
| `Radius/component/radius_sm` | `8` (radio interno de `active_2`) | — descartada (Decisiones §2) |

## Traducción a tokens de componente

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-indicator-*` | onmars | material3 (sin componente M3: decisión de autor de tema) |
|---|---|---|---|---|
| Gap entre puntos | `Space/sm` (6, Nav_indicator) | `gap` | `{ki.space.sm}` (6px) | `{ki.space.md}` (8dp, convención pager M2) |
| Punto en reposo (inline) | 8 px (`Space/md`) | `dot-inline-size` | `{ki.space.md}` | hereda (cascada 001) |
| Punto en reposo (block) | círculo de 8 px medido en el vector | `dot-block-size` | `{ki.space.md}` | hereda |
| Forma del punto | `Radius/radius_round` | `dot-radius` | `{ki.radius.round}` | hereda (círculos uniformes) |
| Color en reposo | `Inverse_white/alpha_18` | `dot-color` | `{ki.inverse-white.alpha-18}` | `{ki.inverse-white.alpha-32}` (énfasis bajo M2) |
| Punto actual (inline) | 32 px (`Space/10xl`) | `dot-current-inline-size` | `{ki.space.10xl}` | `{ki.space.md}` (círculo uniforme) |
| Punto actual (block) | 16 px (`Space/3xl`) | `dot-current-block-size` | `{ki.space.3xl}` | `{ki.space.md}` |
| Forma del actual | `Radius/radius_round` | `dot-current-radius` | `{ki.radius.round}` | hereda |
| Pintura del actual | `Inverse_white/alpha_18` (anillo) | `dot-current-color` | `{ki.inverse-white.alpha-18}` | `{ki.surface.primary-high-em}` (énfasis por color) |
| Hueco del actual | recorte 22×6 r3 medido en el vector | `dot-current-hole-block-size` | `{ki.space.sm}` (6px) | `{ki.space.zero}` (punto sólido) |
| Motion del traspaso | sin motion documentado en el set | `motion-duration` | `{ki.motion.duration.fast}` | hereda |

Anillo onmars = `(dot-current-block-size − hole) / 2` = (16 − 6) / 2 =
**5 px**, y el radio del hueco deriva de la geometría del borde CSS
(8 − 5 = 3): reproducción exacta del vector even-odd sin ningún valor fuera
de tokens (precedente calc del rail de ki-scroller).

## Decisiones (alineadas con el spec aprobado)

1. **La píldora `active` se construye, no se aplana**: el vector es un
   anillo (píldora con hueco), y CSS lo reproduce exactamente como caja de
   centro transparente cuyo borde lleva la pintura — grosor
   `(block − hole) / 2` y radios interiores derivados. El hueco es recorte
   por definición (path even-odd que muestra la superficie inferior), así
   que su transparencia es construcción, no valor de tema. Un tema que
   resuelve `hole = 0` colapsa el anillo en punto sólido (material3), de
   modo que "elongación, color o ambos" queda íntegro en valores de token
   (FR-007).
2. **`active_2` no se traslada como valor de tema**: tercer valor sin
   documentación de uso en el fichero (spec Assumptions); `Nav_indicator` —
   la fila que ki-indicator materializa — compone `active`, no `active_2`.
   Sus medidas quedan registradas arriba por fidelidad; si el founder
   confirma un tercer estado real, entra como MINOR aditivo vía spec.
3. **`dot-current-block-size` y `dot-current-hole-block-size` amplían la
   enumeración entre paréntesis del Constitutional Surface** (que lista
   inline-size|color|radius para el punto actual) dentro de la familia
   declarada `--ki-indicator-*`: el alto 16 es geometría vinculada en Figma
   (`Space/3xl`) y el hueco de 6 px es geometría medida del vector (su
   altura coincide con `Space/sm`), imprescindible para el anillo sin
   valores hardcoded. Precedente exacto: ki-scroller §Decisiones 5.
   Declarado para ratificación del founder.
4. **El alto de fila lo lleva el punto actual**: los tres marcos comparten
   16 px de alto, pero el círculo en reposo pintado mide 8×8 — el marco es
   alineación de fila (`items-center` en Nav_indicator). En CSS la fila
   centra los puntos y su alto lo impone el más alto (16 en onmars, 8 en
   material3); no hay token de alto de fila.
5. **Material 3 no publica indicador de página** (spec Assumptions: el
   carrusel M3 comunica posición por tamaño de item): los valores material3
   registran la convención pager-dot de la era M2 — círculos uniformes de
   8dp a 8dp de gap, énfasis solo por color (primario vs alpha-32) — como
   decisión de autor de tema, no término de contrato.
6. **Motion**: el set no documenta transición alguna; onmars resuelve la
   única transición (el traspaso del resaltado) a
   `{ki.motion.duration.fast}` (120ms) como decisión de autor de tema,
   anulada bajo `prefers-reduced-motion` (FR-008). Declarado para
   ratificación del founder.
7. **Contraste (FR-012), hallazgo a registrar**: `Inverse_white/alpha_18`
   (Black/18) sobre `s0` claro ≈ 1.4:1 — el diseño MarsUI en sí no alcanza
   el 3:1 no-textual aspiracional del spec, ni para punto-vs-superficie ni
   entre apariencias (actual y reposo comparten color y se distinguen por
   geometría: anillo 32×16 vs disco 8×8). Esta extracción conserva la
   fidelidad a las variables exactas de Figma (regla del tren, mismo
   hallazgo y resolución que 021-ki-status) y eleva el conflicto FR-012 ↔
   fidelidad al founder en el merge gate. El sweep genérico de contraste
   (pares `-bg`/`-fg`) no mide indicadores `-color` sin texto; en material3
   el énfasis primario-vs-alpha-32 sí es distinción de color deliberada.
