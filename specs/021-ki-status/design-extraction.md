# Status — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (021-ki-status).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code).

Contrastado con: `scratchpad/marsui-design-dna.md` (§1 rampas semánticas y
escaleras inverse, §5 efectos), `packages/tokens/tokens/component/badge.tokens.json`
(precedente de vocabulario de tonos), `packages/tokens/tokens/component/tooltip.material3.tokens.json`
(precedente level0 plano en M3) y `specs/020-ki-divider/design-extraction.md`
(formato).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `Status` (8 variantes Type × Outline, página Miscellaneous) | `10009:933` |
| `Type=success, Outline=False` / `True` | `10009:931` / `10009:1186` |
| `Type=warning, Outline=False` / `True` | `10009:934` / `10009:1187` |
| `Type=danger, Outline=False` / `True` | `10009:935` / `10009:1188` |
| `Type=disabled, Outline=False` / `True` | `10009:936` / `10009:1189` |

Estructura del set (get_metadata, verificado 2026-07-17): 8 símbolos, **todos
de 4×4 px**, ejes `Type=success|warning|danger|disabled` ×
`Outline=True|False`. Ninguna variante tiene texto, iconos, slots ni estados
de interacción: un único círculo relleno (el anillo de Outline=True desborda
el marco de 4×4 sin cambiar su tamaño). No existe eje de tamaño ni variante
`info`.

## Anatomía medida (get_design_context sobre el set)

- **Dot**: 4×4 px (altura vinculada a `Space/xs`), radio `Radius/radius_round`
  (1000), relleno sólido por tono (capa con `backdrop-blur(12)` heredado del
  tratamiento glass — ver decisión 3).
- **Efectos** (todas las variantes): drop shadow `(0, 1, 1, −0.5)` en color
  `Elevation/shadow` (#00000008) — la capa e1 de la rampa — más INNER_SHADOW
  blanca `(0, 3, 3, 0)` `Color/White/12` (#ffffff1f). Es exactamente el par de
  sombras de `Component_effect/primary_default` (brief §5) sin su blur.
- **Outline=True**: borde de **2 px** `Outline/inverse_black` (#ffffff en
  Light); las capas del anillo se extienden a `inset(-2px)` — el anillo pinta
  FUERA del marco de 4×4.

## Variables vinculadas (get_variable_defs)

| Variable Figma | Valor (Light) | Token Kimen |
|---|---|---|
| `Surface/success_med_em` | `#409b3f` (Success/500) | `{ki.surface.success-med-em}` |
| `Surface/warning_med_em` | `#f8ac3a` (Warning/500) | `{ki.surface.warning-med-em}` |
| `Surface/danger_med_em` | `#f05149` (Danger/500) | `{ki.surface.danger-med-em}` |
| `Surface/disabled_high_em` | `#afb3bb` (Gray/500) | `{ki.surface.disabled-high-em}` |
| `Outline/inverse_black` | `#ffffff` (↔ negro en Dark) | `{ki.outline.inverse-black}` |
| `Space/xs` | `4` | `{ki.space.xs}` |
| `Radius/radius_round` | `1000` | `{ki.radius.round}` |
| `Elevation/shadow` | `#00000008` | `{ki.elevation.shadow}` (vía composite) |
| `Color/White/12` | `#ffffff1f` | (capa inner del composite de efecto) |

(El set-contenedor añade `Surface/s0`, `Outline/high_em`, `Space/12xl`,
`Radius/radius_10xl` y `Elevation/e6` — estilos de la tarjeta de showcase del
set, NO del dot; se descartan.)

## Traducción a tokens de componente

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-status-*` | onmars | material3 |
|---|---|---|---|---|
| Tamaño | 4×4 px (`Space/xs`) | `size` | `{ki.space.xs}` (4px) | `{ki.space.sm}` (~6dp, badge dot M3) |
| Forma | `Radius/radius_round` | `radius` | `{ki.radius.round}` | (hereda round) |
| Efectos | e1 + inner White/12 | `shadow` | `{ki.effect.component.primary.default.shadow}` | level0 transparente (dot M3 plano) |
| Anillo (grosor) | 2 px en Outline=True | `ring-width` | `{ki.space.xxs}` (2px) | (hereda) |
| Anillo (color) | `Outline/inverse_black` | `ring-color` | `{ki.outline.inverse-black}` (blanco L ↔ negro D) | (hereda; el modo M3 dark también lo invierte) |
| Fill neutral | `Surface/disabled_high_em` | `neutral-color` | `{ki.surface.disabled-high-em}` | (cascada semántica M3) |
| Fill success | `Surface/success_med_em` | `success-color` | `{ki.surface.success-med-em}` | (cascada) |
| Fill danger | `Surface/danger_med_em` | `danger-color` | `{ki.surface.danger-med-em}` | (cascada: error tone M3) |
| Fill warning | `Surface/warning_med_em` | `warning-color` | `{ki.surface.warning-med-em}` | (cascada) |
| Fill info | (sin variante en el set) | `info-color` | `{ki.surface.info-med-em}` (extrapolación declarada) | (cascada) |

## Decisiones (alineadas con el spec aprobado)

1. **`Type=disabled` → tono `neutral`**: el vocabulario charter
   (neutral|success|danger|info|warning) no tiene intención "disabled" y el
   dot nunca es interactivo (Assumptions del spec). La variable exacta
   (`Surface/disabled_high_em`, Gray/500 L ↔ White/32 D) se conserva como
   valor del token neutral.
2. **`info` es extrapolación declarada**: el set Figma no lo incluye; el fill
   sigue el patrón med-em/500 verificado en los otros tres tonos (contrato
   001, precedente 010/015). Declarado en la descripción del token para
   ratificación del founder.
3. **Glass con mesura**: el par e1 + inner White/12 se traslada íntegro vía
   `{ki.effect.component.primary.default.shadow}` (la parte box-shadow de
   `Component_effect/primary_default`), pero el `backdrop-blur(12)` de la capa
   de relleno NO se traslada: un dot de 4px no tiene superficie glass que
   desenfocar y el coste de `backdrop-filter` no se justifica (brief §5, nota
   de perf). Registrado como desviación deliberada de fidelidad → coste.
4. **El anillo pinta fuera del marco** (capas Figma a `inset(-2px)` con el
   símbolo fijo en 4×4): en CSS es una capa `box-shadow` de spread
   (precedente focus-ring de ki-switch) apilada sobre `--ki-status-shadow`;
   no desplaza layout. `Outline/inverse_black` invierte por esquema (blanco
   L ↔ negro D, también en el modo M3 dark), de modo que el anillo lee como
   recorte de la superficie bajo el dot.
5. **Sin estados, sin slots, sin texto, sin eje de tamaño**: verificado —
   ninguna variante contiene más que el círculo; `label` existe solo para el
   árbol de accesibilidad (FR-003).
6. **Contraste (FR-008/SC-001), hallazgo a registrar**: los fills 500 exactos
   de Figma no alcanzan 3:1 sobre `s0` claro en todos los tonos — success
   #409b3f ≈ 3.5:1 ✓ y danger #f05149 ≈ 3.5:1 ✓, pero warning #f8ac3a ≈
   1.9:1 ✗, info #13b9ec ≈ 2.3:1 ✗ y neutral #afb3bb ≈ 2.1:1 ✗. El diseño
   MarsUI en sí no satisface la aspiración del spec; esta extracción conserva
   la fidelidad a las variables exactas de Figma (regla del tren) y eleva el
   conflicto FR-008 ↔ fidelidad al founder en el merge gate, como exige la
   Constitutional Surface para deltas de capa semántica. La barrera de
   sentido no depende del color (label/texto adyacente, WCAG 1.4.1) y el
   sweep genérico de contraste (pares `-bg`/`-fg`) no mide indicadores
   `-color` sin texto.
