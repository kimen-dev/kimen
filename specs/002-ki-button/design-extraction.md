# Button / Icon_button / Status — especificación visual exacta (Figma MarsUI) y delta vs Kimen

> **Evidencia durable de extracción de diseño (002-ki-button).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` (Figma MCP).

Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs`, extraído con `get_design_context` el 2026-07-17.
Contrastado con: `scratchpad/marsui-design-dna.md` (§1 biseles, §5 efectos/focus/radios),
`packages/elements/src/components/ki-button/ki-button.css`,
`packages/tokens/tokens/component/button.tokens.json`,
`packages/elements/src/components/ki-badge/ki-badge.css`,
`packages/tokens/tokens/component/badge.tokens.json` (valores resueltos contra
`primitive/semantic/themes-onmars`, 1rem = 16px).

Representantes extraídos (node-id):

| Representante | Node |
|---|---|
| Button primary md default | `8003:351` |
| Button primary md hover | `8008:280` |
| Button primary md disabled | `8008:546` |
| Button secondary md default | `10067:2035` |
| Button secondary md hover | `10067:2046` |
| Button primary xs default | `8003:371` |
| Button primary xl default | `8003:381` |
| Button_danger primary md default | `10076:1841` |
| Button_success primary md default | `10078:2028` |
| Icon_button primary md default | `10078:3129` |
| Status (set, 8 símbolos) | `10009:933` (931/934/935/936 solid · 1186/1187/1188/1189 outline) |

Nota estructural del set Figma: los ejes del Button son **Type**
(primary / primary_light / secondary / tertiary / quaternary / neutral / flat / primary_flat)
× **Size** (xs/sm/md/lg/xl) × **State** (default/hover/focus/disabled). Los tonos danger y
success NO son un eje del set: viven en sets paralelos `Button_danger` (10076:1687) y
`Button_success` (10078:1874) con los mismos ejes. No existe estado `active/pressed` en Figma.

## 0. Convenciones de traducción Figma → CSS

- `DROP_SHADOW`/`INNER_SHADOW` de Figma (offset, radius=blur, spread) → capa de `box-shadow`
  (`inset` para inner). Los valores canónicos de abajo son los del estilo Figma; el código de
  referencia del MCP a veces colapsa spread en blur al usar `filter: drop-shadow()` (sin spread).
- `BACKGROUND_BLUR radius 24` (estilo `Blur/24`) → el export oficial lo emite como
  `backdrop-filter: blur(12px)` (convención radius/2). Escala completa del brief: 8/16/24/48/96
  → CSS 4/8/12/24/48.
- Color de sombra `Elevation/shadow` = Black/3 = `rgba(0,0,0,0.03)` = `#00000008` (esquema claro).
- Todos los valores de color de abajo son del modo Light.

## 1. Dimensiones por tamaño (Button)

Figma (medidos en los representantes + alturas del set completo):

| Size | Alto | Pad-inline | Pad-block | Gap raíz | Pad-inline del text-wrap | Gap efectivo icono↔texto | Radio | Fuente (size/lh) | Peso | Icono |
|---|---|---|---|---|---|---|---|---|---|---|
| xs | 24 | 6 (`space/sm`) | 4 (`space/xs`) | 0 (`space/zero`) | 4 (`space/xs`) | 4 | 6 (`radius/component/xs`) | caption_1 **10/16** | 600 | **14** |
| sm | 32 | — no extraído — | 4 | — | — | — | 8 (`component/sm`, por patrón) | — | 600 | — |
| md | 40 | 10 (`space/lg`) | 4 | 2 (`space/xxs`) | 4 (`space/xs`) | 6 | 10 (`component/md`) | body_1 13/24 | 600 | 18 |
| lg | 48 | — no extraído — | 4 | — | — | — | 12 (`component/lg`, por patrón) | — | 600 | — |
| xl | 56 | **14** (`space/2xl`) | 4 | 2 (`space/xxs`) | 6 (`space/sm`) | 8 | 14 (`component/xl`) | title_2 18/24 | 600 | 24 |

- Tipografía: Inter, label primario weight `body/medium` **600**, label secundario opcional
  weight `body/normal` **500** (color `text/secondary_on_primary` White/72 sobre primary),
  letter-spacing `none` = 0.
- Los grupos Left/Right admiten imagen circular (12/20/28 px en xs/md/xl, radius round,
  sombra e1) además del icono.

Kimen actual (tokens resueltos):

| Size | Alto | Pad-inline | Pad-block | Gap | Radio | Fuente | Icono | Min-target |
|---|---|---|---|---|---|---|---|---|
| xs | 24 ✓ | 6 ✓ | 0 | 2 | 6 ✓ | caption-2 **12/16** | **16** | 24 |
| sm | 32 ✓ | 8 | 0 | 2 | 8 ✓ | body-1 13/24 | 16 | 24 |
| md | 40 ✓ | 10 ✓ | 0 | 4 | 10 ✓ | body-1 13/24 ✓ | 18 ✓ | 24 |
| lg | 48 ✓ | 12 | 0 | 6 | 12 ✓ | body-2 15/24 | 20 | 24 |
| xl | 56 ✓ | **16** | 0 | 6 | 14 ✓ | title-2 18/24 ✓ | 24 ✓ | 24 |

**Deltas dimensionales:**

1. **xs tipografía**: Figma usa caption_1 (10/16); Kimen usa caption-2 (12/16). Delta −2px de
   font-size. (Ojo: `ki.typography.size.caption-1` existe = `space.lg` 10px.)
2. **xs icono**: Figma 14px; Kimen 16px (`space.3xl`). No existe token space de 14px→ sería
   `space.2xl` (0.875rem).
3. **xl padding-inline**: Figma 14 (`space/2xl`); Kimen 16 (`ki.space.3xl`). Delta +2px.
4. **Gap efectivo icono↔texto**: Figma = gap raíz + padding propio del bloque de texto
   (xs 0+4=4 · md 2+4=6 · xl 2+6=8). Kimen usa un único `gap` (2/4/6): **2px más
   estrecho en los tres tamaños**. Si no se replica el text-wrap con padding, el gap de Kimen
   debería ser 4/6/8 (xs/md/xl) — sm/lg por interpolación 4–6.
5. **Padding-block**: Figma 4px en todos los tamaños; Kimen 0 (con alto fijo el efecto es solo
   de recorte de contenido; delta menor).
6. Alturas y radios por tamaño: **coinciden todos** (24/32/40/48/56; 6/8/10/12/14). ✓ brief §5.

## 2. Variante × estado — colores, biseles y efectos (Button md)

### 2.1 primary · neutral

| Capa | Figma default (`8003:351`) | Figma hover (`8008:280`) | Figma disabled (`8008:546`) |
|---|---|---|---|
| Fondo | `Surface/primary_med_em` **#845abe** (brand 500) | #845abe **+ overlay `hover_overlay` White/5** (`rgba(255,255,255,0.05)`) | `Surface/disabled_base_em` **#f2f2f4** (gray 100) |
| Texto | `text/primary_on_primary` #ffffff (600); secundario White/72 (500) | igual | `text/base_em` **#c3c6cc** (gray 400) |
| Borde (bisel) | 1px `Outline/primary_button_top` **Black/8** `rgba(0,0,0,0.08)` (el export lo emite uniforme; el ADN §1 define el par top Black/8 / bottom **Black/18** — bisel por lado) | igual | **sin borde** |
| Sombras drop | e1: `0 1px 1px -0.5px #00000008` | `0 20px 20px -12px` + `0 3px 3px -1.5px` + `0 1px 1px -0.5px`, todas #00000008 | **ninguna** |
| Inner shadow (bisel superior claro) | `inset 0 3px 3px 0 rgba(255,255,255,0.12)` (White/12) | `inset 0 3px 3px 0 rgba(255,255,255,0.18)` (White/18) | **ninguna** |
| Backdrop blur | Blur 24 (CSS `backdrop-filter: blur(12px)`) | Blur 24 | Blur 24 (se conserva) |
| Estilo compuesto | `Component_effect/primary_default` | `Component_effect/primary_hover` | `Blur/24` |

(Los estilos coinciden 1:1 con el brief §5 ✓. En disabled la imagen del slot va a opacity 16%.)

Kimen actual (resuelto):

| Capa | rest | hover | disabled |
|---|---|---|---|
| Fondo | `surface.primary-high-em` = brand.600 **#5f3993** | brand.500 **#845abe** | `disabled-low-em` = gray.200 **#ececf0** |
| Texto | #ffffff ✓ | #ffffff ✓ | `text.muted` = gray.700 **#5b616d** |
| Borde | transparente | transparente | transparente ✓ |
| Sombra | `0 1px 1px -0.5px #00000008` (única capa; el token rest apunta a `…primary.hover.shadow` migrado) | **idéntica a rest** | none ✓ |
| Inner shadow | **no existe** | **no existe** | — |
| Backdrop blur | **no existe** | — | — |

**Deltas primary:** (a) fondo un paso más oscuro (600 vs 500) en rest, y el hover de Kimen
(500) es el color de REST de Figma — Figma aclara con overlay White/5, Kimen "sube" de 600→500;
(b) falta el bisel completo: borde top Black/8 (+bottom Black/18 según ADN) e inner highlight
White/12→18; (c) falta la elevación de hover (3 capas drop); (d) falta backdrop blur 24;
(e) disabled: Figma gray.100 bg + gray.400 texto — Kimen gray.200 + gray.700 (divergencia
seguramente deliberada por el gate de contraste: #c3c6cc sobre #f2f2f4 ≈ 1.4:1; documentar
como decisión, no como bug); (f) la sombra e1 del rest ✓ coincide (vía token migrado con
nombre engañoso `…primary.hover.shadow`).

### 2.2 secondary · neutral

| Capa | Figma default (`10067:2035`) | Figma hover (`10067:2046`) |
|---|---|---|
| Fondo | `Surface/special/secondary_alpha_base` **rgba(242,242,244,0.8)** (gray.100 al 80% — vidrio) | igual **+ overlay `hover_overlay_inverse` Black/3** `rgba(0,0,0,0.03)` |
| Texto | `text/high_em` **#0a0c11** (gray 950); secundario `text/low_em` #8c929c | igual |
| Borde (bisel) | 1px `Outline/secondary_button_top` **Black/5** `rgba(0,0,0,0.05)` (ADN §1: bottom **Black/12**) | igual |
| Sombras drop | `0 2px 1.5px -0.5px #00000008` | `0 20px 20px -12px` + `0 3px 3px -1.5px` + `0 1px 1px -0.5px` #00000008 |
| Inner shadow | `inset 0 2px 3px 0 rgba(255,255,255,0.03)` (White/3) | `inset 0 2px 3px 0 rgba(255,255,255,0.08)` (White/8) |
| Backdrop blur | Blur 24 (→ 12px CSS) | Blur 24 |
| Estilo | `Component_effect/secondary_default` | `Component_effect/secondary_hover` |

(Coincide con brief §5 ✓.)

Kimen actual: rest bg `primary-base-em` = brand.50 **#f7f4fb** (tinte morado opaco), fg
`primary-high-em` = brand.600 **#5f3993** (texto morado), border transparente, shadow **none**;
hover bg brand.100 #ece4f5, shadow none.

**Deltas secondary (los mayores de todo el componente):** (a) identidad de color equivocada —
Figma es **gris neutro translúcido** (gray.100 @80% + blur) con texto **casi negro** (#0a0c11);
Kimen lo pinta como "morado suave" con texto morado; (b) sin bisel Black/5 (+bottom Black/12)
ni inner White/3; (c) sin sombra rest `0 2px 1.5px -0.5px` ni elevación hover; (d) hover en
Figma = overlay Black/3 sobre el mismo fondo, no salto brand.50→brand.100.

### 2.3 danger (set Button_danger, primary md default `10076:1841`)

- Fondo `Surface/danger_med_em` **#f05149** (danger 500). Texto `text/white` #ffffff;
  secundario White/72. Mismo bisel (`Outline/primary_button_top` Black/8), mismos efectos
  `Component_effect/primary_default` (e1 + inner White/12 + Blur 24), mismo radio/medidas que
  primary md.
- Kimen: `surface.danger-high-em` = danger.700 **#cd2118**; hover danger.800 #a01a13.
- **Delta:** Figma usa la rampa **500** y aclara en hover (overlay); Kimen usa **700** y
  oscurece a 800. Dos pasos de rampa y dirección de hover invertida. Resto de deltas = los de
  primary (bisel/inner/blur/hover-elevación).

### 2.4 success (set Button_success, primary md default `10078:2028`)

- Fondo `Surface/success_med_em` **#409b3f** (success 500). Texto `text/primary_on_success`
  #ffffff; secundario White/72. Bisel y efectos idénticos a primary default.
- Kimen: `surface.success-high-em` = success.700 **#2c6a2b**; hover success.800 #265526.
- **Delta:** idéntico patrón que danger: 500 vs 700 y hover aclarar-vs-oscurecer.

### 2.5 Focus (contraste con brief §5; no extraído por variante)

- Figma `Focus/primary`: drop-shadow spread **3px** de `Outline/primary_base_em_alpha`
  (**#845abe66**, alpha 40%). `Focus/gray`: spread 3px de `Outline/med_em` (Black/8).
- Kimen: `box-shadow 0 0 0 2px` `outline.primary-high-em` = **#845abe opaco** + outline 2px.
- **Delta:** anillo 2px opaco vs 3px al 40%. Existe token `ki.outline.primary-base-em-alpha`
  pero resuelve a alpha-2 (#845abe33, 20%), no al alpha-4 (66) del estilo Focus.

## 3. Icon_button (md default `10078:3129`)

- Caja **40×40** (w=h), padding 0, radio 10 (`radius/component/md`), centrado.
- Icono **20px** (⚠ el Button md usa icono de 18px — el icon-button sube un paso).
- Fondo #845abe + borde 1px Black/8 + `Component_effect/primary_default` (e1 + inner
  White/12 + Blur 24). Estados hover/disabled siguen el mismo sistema del Button.
- Tamaños del set (metadata): 24/32/40/48/56 — iguales a las alturas del Button.
- **Kimen: no existe componente ni modo icon-only.** `ki-button` md con solo icono daría
  ancho = contenido + 20px de padding (min-inline-size 24px), no cuadrado garantizado.
  Falta: modo icon-only (padding 0, inline-size = block-size) y token de icono icon-only
  (20px en md ≠ 18px).

## 4. Status (`10009:933`, 8 símbolos) vs ki-badge

Figma Status es un **punto de estado de 4×4px**, no un badge de texto:

| Símbolo | Node | Fondo |
|---|---|---|
| success / Outline=False | `10009:931` | `Surface/success_med_em` **#409b3f** (500) |
| warning / Outline=False | `10009:934` | `Surface/warning_med_em` **#f8ac3a** (500) |
| danger / Outline=False | `10009:935` | `Surface/danger_med_em` **#f05149** (500) |
| disabled / Outline=False | `10009:936` | `Surface/disabled_high_em` **#afb3bb** (gray 500) |
| success / Outline=True | `10009:1186` | igual + anillo |
| warning / Outline=True | `10009:1187` | igual + anillo |
| danger / Outline=True | `10009:1188` | igual + anillo |
| disabled / Outline=True | `10009:1189` | igual + anillo |

Anatomía común: 4×4, radius round (círculo), drop `0 1px 1px 0 #00000008` (e1 con spread 0),
inner highlight `inset 0 3px 3px 0 rgba(255,255,255,0.12)` (White/12), backdrop Blur 24
(→12px CSS). Variante **Outline=True**: anillo de **2px** `Outline/inverse_black` (= blanco en
esquema claro) alrededor del punto (el overlay del highlight se expande `inset -2px`;
huella visual ≈ 8×8).

ki-badge actual (resuelto): píldora de TEXTO — sm 24px de alto / md **26px**, padding-inline
6/8, radius 1000, Inter 600, 12/16 (sm) y 13/24 (md); border-width 2px transparente; tonos:
neutral (bg gray.100 `s2`… vía `surface.s2`, fg #0a0c11), success (bg success.50 #f4faf3, fg
success.700 #2c6a2b), danger (bg danger.50 #fff3f2, fg danger.700 #cd2118), info (bg info.50
#d0f1fb, fg info.800), warning (bg warning.50 #fffeea, fg warning.800). Sin sombras, sin blur.

**Deltas ki-badge vs Status:**

1. **Desajuste estructural**: Status es un dot-indicator de 4px; ki-badge es una píldora de
   texto. No hay en Kimen ningún equivalente del dot (ni prop `dot` ni `ki-status`); si
   ki-badge pretende cubrir Status, le falta el modo punto completo.
2. Ejes distintos: Figma = {success, warning, danger, **disabled**} × Outline; Kimen =
   {neutral, success, danger, info, warning} sin outline y sin disabled. `info` y `neutral`
   no existen en Status; `disabled` (gray.500 #afb3bb) no existe en ki-badge.
3. Color: Status usa rellenos sólidos de rampa **500**; ki-badge usa bg 50 + texto 700/800
   (paleta soft). Ninguna variante de ki-badge produce los sólidos 500.
4. Efectos: Status lleva e1 + inner White/12 + Blur 24 (mismo lenguaje de bisel que Button);
   ki-badge no tiene ninguna sombra/blur.
5. Anillo Outline=True (2px blanco, `Outline/inverse_black`) sin equivalente.

## 5. Resumen priorizado de deltas (Button + Badge)

1. **secondary está mal mapeado de raíz**: debe ser vidrio gris (gray.100 @80% + blur 12px +
   texto #0a0c11), no morado claro con texto morado.
2. **Rampas de fondo primary/danger/success**: Figma usa el **500** (`*_med_em`) — #845abe /
   #f05149 / #409b3f — y el hover aclara con overlay White/5; Kimen usa 600/700 y oscurece.
3. **Bisel ausente en todas las variantes**: borde 1px top (Black/8 primary · Black/5
   secondary; bottom Black/18 · Black/12 según ADN §1) + inner-shadow blanca
   (`inset 0 3px 3px` White/12→18 primary; `inset 0 2px 3px` White/3→8 secondary).
4. **Efectos compuestos**: falta la pila hover (0 20 20 −12 / 0 3 3 −1.5 / 0 1 1 −0.5 Black/3)
   y el `backdrop-filter: blur(12px)` de `Component_effect/*`; el token de sombra actual
   (una sola capa e1, mismo valor rest y hover) proviene de un migrated con nombre engañoso.
5. **Dimensiones**: xs tipografía 10/16 (no 12/16) e icono 14 (no 16); xl padding-inline 14
   (no 16); gap efectivo icono↔texto 4/6/8 (Kimen 2/4/6, −2px en todos los tamaños).
   Alturas y radios por tamaño ✓ exactos.
6. **Focus**: anillo 3px #845abe66 (40%) vs 2px #845abe opaco actual.
7. **Icon_button**: sin equivalente icon-only en Kimen (40×40, padding 0, icono 20px en md).
8. **Status vs ki-badge**: desajuste estructural completo (dot 4px con rampa 500, bisel,
   blur y variante outline blanca 2px vs píldora de texto soft 50/700); faltan tono disabled
   y modo dot.
9. Divergencia deliberada a conservar: disabled de Kimen (gray.200 + gray.700) es más
   contrastado que el de Figma (gray.100 + gray.400, ~1.4:1) — decisión de accesibilidad a
   ratificar por el founder, no regresión.
