# Avatar + Avatar_group — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (019-ki-avatar).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_metadata` + `get_design_context` + `get_screenshot`
> (Figma MCP, skill figma-design-to-code).

Contrastado con: `scratchpad/marsui-design-dna.md` (§1 rampas y em-pattern, §4
tipografía, §5 efectos), `packages/tokens/tokens/component/icon-button.tokens.json`
(precedente de rampa por tamaño), `packages/tokens/tokens/component/badge.tokens.json`
(precedente de tokens tipográficos), `specs/021-ki-status/design-extraction.md`
(formato y decisión glass-con-mesura) y el spec aprobado `specs/019-ki-avatar/spec.md`.

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `avatar` (18 símbolos Type×Size, página Avatars) | `10010:1415` |
| `Type=image, Size=md` | `10011:947` |
| `Type=text, Size=xxs` / `xs` / `sm` / `lg` / `xl` / `md` | `10010:1416` / `10108:6226` / `10011:906` / `10011:971` / `10012:933` / `10011:950` |
| `Type=icon, Size=xxs` / `xs` / `sm` / `lg` / `xl` / `md` | `10010:1424` / `10108:6230` / `10011:913` / `10011:975` / `10012:937` / `10011:954` |
| Set `Avatar_group` (5 símbolos Size, página Avatars) | `10087:2600` |
| `Size=xs` / `sm` / `md` / `lg` / `xl` | `10087:2579` / `10087:2601` / `10087:2701` / `10090:2873` / `10090:2973` |

Estructura de los sets (get_metadata, verificado 2026-07-17):

- `avatar`: 18 símbolos, ejes `Type=image|text|icon` × `Size=xxs|xs|sm|md|lg|xl`,
  marcos exactos **20/24/32/40/48/56 px**, todos circulares. Sin estados de
  interacción, sin slots. Los tres símbolos xxs llevan descripción de uso en
  Figma: "Intended for special cases only; not recommended for standalone use".
- `Avatar_group`: 5 símbolos, eje único `Size=xs|sm|md|lg|xl`, alturas
  **20/32/40/48/56 px** (cinco pasos: no existe marco de 24 px). Cada marco
  muestra 6 avatares solapados; los de 32–56 px añaden un contador "+5"; el
  marco de 20 px NO tiene contador (skew registrado en decisión 6).

## Anatomía medida — `avatar` (get_design_context por representante)

Caja: círculo `Radius/radius_round` (1000). Tres modos de contenido:

- **image**: `<img>` object-cover llenando la caja (capa con `backdrop-blur(12)`
  del tratamiento glass). Sin borde, sin gradiente, sin sombras propias.
- **text**: fondo **gradiente vertical** `Surface/primary_med_em` (#845abe) →
  `Surface/primary_low_em_alpha` (rgba(132,90,190,0.2)), borde **1 px**
  `Outline/base_em` (Black/3), `backdrop-blur(12)`; iniciales centradas, color
  `Text/primary_on_primary` (blanco), familia `Typeface/family/body` (Inter),
  peso `Typeface/weight/body/medium` (600), letter-spacing none. "A" en xxs,
  "AT" desde xs.
- **icon**: fondo sólido `Surface/primary_med_em`, sin borde, `backdrop-blur(12)`;
  glifo `Icon/User` centrado (dos paths sólidos en blanco, vector con insets
  8.33 %/10.42 % de su caja de icono). Los hex #f2409c/#e7531e visibles en la
  página son el modo de acento Tertiary/Quaternary del Color Type — la
  VARIABLE vinculada es siempre `Surface/primary_med_em` (brief §1: el
  primario Kimen onmars es #845abe).

Los marcos superponen además un dot de presencia (`Status`) y un check
`Icon/Verification_tick` en las esquinas: artefactos por capas, NO ejes del
set — fuera de v1 (Adornments del spec, deferral compartido con 010/021).

### Rampas por tamaño (verificadas símbolo a símbolo)

| Size | Caja (Space) | Icono User (Space) | Estilo texto | font/line |
|---|---|---|---|---|
| xxs | 20 (`5xl`) | 14 (`2xl`) | UI/Caption 1/medium | `caption_1` 10 / 16 |
| xs | 24 (`7xl`) | 14 (`2xl`) | UI/Caption 1/medium | `caption_1` 10 / 16 |
| sm | 32 (`10xl`) | 18 (`4xl`) | UI/Caption 2/medium | `caption_2` 12 / 16 |
| md | 40 (`12xl`) | 20 (`5xl`) | UI/Para/medium | `body_1` 13 / para 20 |
| lg | 48 (`14xl`) | 24 (`7xl`) | UI/Body 2/medium | `body_2` 15 / 24 |
| xl | 56 (`16xl`) | 28 (`9xl`) | UI/Title 2/medium | `title_2` 18 / 24 |

Nota: la rampa de icono del avatar NO es la del icon-button (022:
16/18/20/24/28 para cajas 24–56). El avatar comparte 18/20/24/28 en sm–xl
pero baja a **14** en xs y xxs (verificado en ambos símbolos).

## Anatomía medida — `Avatar_group`

- Fila flex; cada avatar solapa al siguiente con margen negativo; **z-order
  invertido**: el primer miembro pinta ENCIMA del segundo (verificado en el
  screenshot del set: el avatar izquierdo queda completo, cada siguiente se
  mete debajo del anterior; el contador queda en la capa inferior).
- **Sin anillo separador**: ningún marco del set añade borde/anillo blanco
  entre miembros (los avatares text llevan su propio borde Outline/base_em).
- **Solape**: −8 px (`Space/md`) en los marcos de 20 y 32 px; −12 px
  (`Space/xl`) en 40/48/56 px.
- **Contador "+N"**: instancia del Button **secundario** de MarsUI en forma
  estática — altura = tamaño del avatar, radio `Radius/component/radius_*`
  (=1000 en modo Round), fondo `Surface/special/secondary_alpha_base`, borde
  1 px `Outline/secondary_button_top`, efecto `Component_effect/secondary_default`
  (drop (0,2,1.5,−0.5) `Elevation/shadow` + inner White/3 (0,2,3)), texto
  `Text/high_em`, familia body, peso 600.

| Marco (altura) | Solape | Contador padding-inline | Contador font |
|---|---|---|---|
| xs (20) | −8 (`Space/md`) | (sin contador en el marco) | — |
| sm (32) | −8 (`Space/md`) | 8 (`Space/md`) | `body_1` 13 |
| md (40) | −12 (`Space/xl`) | 10 (`Space/lg`) | `body_1` 13 |
| lg (48) | −12 (`Space/xl`) | 12 (`Space/xl`) | `body_2` 15 |
| xl (56) | −12 (`Space/xl`) | 14 (`Space/2xl`) | `title_2` 18 |

## Traducción a tokens de componente

`--ki-avatar-*` (por tamaño `{xxs|xs|sm|md|lg|xl}`):

| Propiedad | Token | onmars | material3 |
|---|---|---|---|
| Caja | `{size}-size` | `{ki.space.{5xl|7xl|10xl|12xl|14xl|16xl}}` | (hereda) |
| Iniciales | `{size}-font-size` | `{ki.typography.size.{caption-1×2|caption-2|body-1|body-2|title-2}}` | (hereda) |
| Glifo | `{size}-icon-size` | `{ki.space.{2xl|2xl|4xl|5xl|7xl|9xl}}` | (hereda) |
| Forma | `radius` | `{ki.radius.round}` | (hereda round — convención M3) |
| Superficie | `bg` | `{ki.surface.primary-med-em}` (gradiente aplanado, decisión 2) | (cascada semántica) |
| Contenido | `fg` | `{ki.text.primary-on-primary}` | (cascada) |
| Borde | `border-width` / `border-color` | `{ki.size.border.hairline}` / `{ki.outline.base-em}` | width hereda / color → `{ki.outline.none}` (M3 sin hairline) |
| Tipo | `font-family` / `font-weight` | `{ki.typography.family.body}` / `{ki.typography.weight.body.medium}` | (hereda) |

`--ki-avatar-group-*` (por tamaño):

| Propiedad | Token | onmars | material3 |
|---|---|---|---|
| Solape | `{size}-overlap` | `{ki.space.md}` (xxs/xs/sm) · `{ki.space.xl}` (md/lg/xl) | (hereda) |
| Contador pad | `{size}-counter-padding-inline` | `{ki.space.{xs|sm|md|lg|xl|2xl}}` (xxs/xs sintetizados) | (hereda) |
| Contador font | `{size}-counter-font-size` | `{ki.typography.size.{caption-1|caption-1|body-1|body-1|body-2|title-2}}` | (hereda) |
| Anillo | `ring-width` / `ring-color` | `{ki.space.zero}` / `{ki.outline.none}` (sin anillo en MarsUI) | (hereda) |
| Contador | `counter-bg` / `counter-fg` | `{ki.surface.special.secondary-alpha-base}` / `{ki.text.high-em}` | (cascada) |
| Contador borde | `counter-border-width` / `counter-border-color` | `{ki.size.border.hairline}` / `{ki.outline.secondary-button-top}` | color → `{ki.outline.none}` |
| Contador forma | `counter-radius` | `{ki.radius.round}` | (hereda) |
| Contador efecto | `counter-shadow` | `{ki.effect.component.secondary.default.shadow}` | level0 transparente (M3 plano, precedente 021) |

## Decisiones (alineadas con el spec aprobado)

1. **Type=image|text|icon → cadena de fallback en runtime** (FR-001): los tres
   tipos son estados de contenido de un elemento, sin atributo `type`. El
   glifo `Icon/User` se incorpora como SVG embebido con los paths EXACTOS del
   asset exportado por Figma (viewBox 20, insets 8.33 %/10.42 %), relleno
   `currentColor` desde `--ki-avatar-fg` — el componente no puede depender de
   una URL remota para su figura integrada.
2. **Gradiente aplanado a `bg` sólido**: el modo text usa un gradiente
   primary_med_em → primary_low_em_alpha(20 %); el pipeline de tokens Kimen no
   modela gradientes y el spec define un único `--ki-avatar-bg` familiar. Se
   conserva el color de arranque exacto (`Surface/primary_med_em`, el mismo
   sólido del modo icon), lo que además hace medible el par bg/fg del gate de
   contraste (blanco sobre #845abe ≈ 5:1 ✓). Desviación deliberada declarada
   para ratificación del founder.
3. **Glass con mesura** (precedente 021 decisión 3): el `backdrop-blur(12)` de
   las capas de relleno y el blur 24 del efecto del contador NO se trasladan;
   las sombras del contador sí (par exacto de `Component_effect/secondary_default`
   vía composite). El avatar en sí no lleva sombras en ningún símbolo.
4. **Borde solo en los modos de superficie**: el hairline `Outline/base_em`
   está en el modo text (no en image ni icon). Kimen lo aplica a la superficie
   token (modos iniciales y glifo) y lo retira cuando el retrato cubre la caja
   — un borde 1 px Black/3 sobre el glifo es imperceptible y unifica la
   superficie; desviación menor declarada.
5. **Z-order invertido del grupo**: el primer miembro pinta encima del
   siguiente y el contador debajo de todos (verificado en screenshot). Se
   implementa con z-index descendente asignado por el grupo a los miembros
   visibles (coordinación de composite, precedente 007) — no existe CSS puro
   por-índice para N arbitrario. El contador queda estático (capa base).
6. **Skew de vocabulario y pasos sintetizados** (Assumptions del spec): el
   marco de 20 px del grupo se llama "xs" en Figma pero usa las métricas xxs
   del avatar → vocabulario unificado xxs–xl en ambos elementos. El paso xs
   (24 px) del grupo, el contador de los tamaños xxs/xs (padding `xs|sm`,
   font `caption-1`) y el propio contador a 20 px no existen en ningún marco:
   derivados de las rampas verificadas, declarados en las descripciones de
   los tokens para revisión del founder.
7. **El contador es texto estático, nunca un Button**: el marco usa una
   instancia del Button secundario como artefacto visual; el spec (FR-006,
   Assumptions) exige contador no interactivo. Se traduce la apariencia
   (counter-* tokens) sin la semántica ni los estados del botón.
8. **Adornos fuera de v1**: presencia y verificación de los marcos son capas
   superpuestas, no ejes del set (Type × Size verificado) — deferral
   compartido con 010/021, documentado como when-NOT-to-use.
