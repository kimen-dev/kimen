# QR — especificación visual exacta (Figma MarsUI) y traducción a tokens

> **Evidencia durable de extracción de diseño (026-ki-qr).**
> Fuente: fichero Figma `vbD864Afs8lTSXUgtABFSs` · Fecha de extracción: 2026-07-17 ·
> Método: `get_design_context` + `get_metadata` + `get_variable_defs` +
> `get_screenshot` (Figma MCP, skill figma-design-to-code) más análisis del SVG
> exportado de cada variante (geometría vectorial exacta).

Contrastado con: `specs/026-ki-qr/spec.md` (Design-source analysis y
Assumptions), `specs/024-ki-indicator/design-extraction.md` (formato y
precedente de construcción calc/derivada sobre tokens),
`specs/021-ki-status/design-extraction.md` (precedente de descarte del marco
de showcase) y `specs/019-ki-avatar` (precedente de ausencia de artefacto M3).

## Representantes extraídos (node-id)

| Representante | Node |
|---|---|
| Set `QR_code` (página Miscellaneous, 376×208) | `16158:27561` |
| `Type=square` (128×128) | `12019:6059` |
| `Type=round` (128×128) | `16158:27560` |

Estructura del set (get_metadata, verificado 2026-07-17): exactamente dos
símbolos sobre el único eje `Type ∈ {square, round}`, ambos de 128×128 px.
Sin ejes de tamaño, color o estado; sin texto, sin slots, sin estados
interactivos. Cada variante es un vector plano con una matriz de muestra
decorativa — la matriz real deriva en runtime del atributo `value` (spec,
Design-source analysis).

## Anatomía medida (SVG exportado de cada variante)

- **`Type=square`**: 412 paths rectangulares independientes, todos con
  `fill #0A0C11`. Retícula de **29×29 módulos** (versión 3 de muestra) con
  módulo de **3.8621 px** (= 112/29) y **zona de silencio de 8 px** por lado
  (128 − 2·8 = 112; ≈ 2 módulos). Módulos y finders comparten el cuadrado
  puro: radio 0. El marco no pinta fondo propio (el `<svg>` exporta
  `fill="none"`): el tile visible es la tarjeta de showcase inferior.
- **`Type=round`**: un único path union even-odd con
  `fill var(--fill-0, #0A0C11)` (variable vinculada al fill). Retícula de
  **25×25 módulos** (versión 2 de muestra) con pitch de **4.4138 px**
  (= 110.345/25) y zona de silencio de **8.83 px = 2.0 módulos exactos**.
  231 módulos de datos como **círculos de ⌀ 3.031 px = 0.687 del pitch**
  (punto encogido, no tangente). Cada finder (3 en total, 9 subpaths) es:
  anillo exterior de **30.90 px (7 módulos) con radio 9.93 px = 2.25
  módulos exactos**; hueco de 22.07 px (5 módulos) con radio 6.18 px
  (1.4 módulos); centro de 13.24 px (3 módulos) con radio 3.53 px
  (0.8 módulos). Los tres radios escalan de forma aproximadamente
  proporcional al tamaño de cada caja (0.32 / 0.28 / 0.27).
- **Marco del set**: la tarjeta blanca redondeada (Surface/s0,
  Outline/high_em, Space/12xl, Radius/radius_10xl, Elevation/e6) es framing
  de showcase, NO anatomía del componente; se descarta (precedente 021/024).

## Variables vinculadas (get_variable_defs)

| Variable Figma | Valor (Light) | Papel | Token Kimen |
|---|---|---|---|
| `Text/high_em` | `#0a0c11` (gray.950) | tinta de los módulos (fill del union `Type=round`; mismo hex en los 412 paths de `Type=square`) | `{ki.surface.black}` — ver Decisiones §2 |
| `Surface/s0` | `#ffffff` | tarjeta de showcase bajo el símbolo transparente | `{ki.surface.white}` como tile propio — ver Decisiones §3 |
| `Space/12xl`, `Radius/radius_10xl`, `Outline/high_em`, `Elevation/e6` | 40 / 40 / `#0000001f` / sombra e6 | framing de showcase | — descartadas (Decisiones §1) |

Ninguna variable está vinculada al tamaño de 128 px del frame ni a la zona
de silencio de 8 px: ambos son geometría sin variable en el fichero.

## Traducción a tokens de componente

El código se dibuja en un espacio de coordenadas interno de **8 px por
módulo** (viewBox = 8·n), de modo que todo radio de forma se expresa con
tokens de la escala real (medio módulo = 4px = `{ki.radius.xs}`), precedente
de construcción derivada de 024.

| Propiedad | Figma (MarsUI/onmars) | Token `--ki-qr-*` | onmars | material3 (sin componente M3: decisión de autor de tema) |
|---|---|---|---|---|
| Tamaño del código | frame 128×128, sin variable vinculada | `size` | `{ki.space.24xl}` (120px, paso más cercano — Decisiones §4) | hereda (cascada 001) |
| Tinta de módulos | `Text/high_em` (#0a0c11) | `color` | `{ki.surface.black}` (estable en ambos esquemas — Decisiones §2) | hereda |
| Tile | transparente sobre `Surface/s0` | `background` | `{ki.surface.white}` (tile propio, estable — Decisiones §3) | hereda |
| Forma de módulo | `Type=square`: radio 0 (default) | `module-radius` | `{ki.radius.0}` · valor round documentado: `{ki.radius.xs}` (4px = medio módulo) | hereda |
| Forma de finder | `Type=square`: radio 0 (default) | `finder-radius` | `{ki.radius.0}` · valor round documentado: `{ki.radius.2xl}` (14px de línea media = 18px de borde exterior, los 2.25 módulos exactos medidos) | hereda |
| Zona de silencio | 8 px medidos (≈ 2 módulos en ambas variantes) | `quiet-zone` | `{ki.space.md}` (8px de padding real) | `{ki.space.3xl}` (16dp, margen generoso — Decisiones §7) |
| Radio del tile | marco cuadrado sin radio propio | `radius` | `{ki.radius.0}` | `{ki.radius.component.lg}` (corner.medium 12dp — Decisiones §7) |

## Decisiones (alineadas con el spec aprobado)

1. **La matriz de muestra no se traslada**: ambas variantes llevan una
   matriz decorativa (versión 3 y versión 2 respectivamente); la matriz real
   deriva del `value` en runtime (FR-001). El marco de showcase se descarta
   (precedente 021/024).
2. **Tinta de módulos estable por obligación de tema**: el fill vinculado
   `Text/high_em` resuelve blanco bajo el esquema oscuro, lo que invertiría
   el código (spec Assumptions: los códigos invertidos escanean mal). La
   obligación de tema del spec (FR-010) exige módulos oscuros sobre tile
   claro en ambos esquemas, así que onmars resuelve `color` al token
   estable `{ki.surface.black}` (#000000 en ambos esquemas); delta de
   fidelidad #0a0c11 → #000000 registrado (no existe semántico estable para
   gray.950). Declarado para ratificación del founder.
3. **El componente posee su tile**: el símbolo Figma es transparente y
   depende de la superficie inferior; un QR funcional no puede depender del
   fondo del consumidor, así que `background` = `{ki.surface.white}` (el
   mismo #ffffff de la tarjeta s0 light), estable bajo el esquema oscuro —
   la obligación de escaneabilidad del spec, no un valor extraído.
4. **Tamaño 128 sin variable y sin paso en la escala**: la escala de
   espacio no tiene paso de 8rem (24xl = 7.5rem = 120px, 25xl = 9rem);
   onmars resuelve `size` a `{ki.space.24xl}` (120px), el paso más cercano
   al frame de 128 px sin variable vinculada; los consumidores escalan por
   el token (spec: sin atributo `size`). Declarado para ratificación del
   founder.
5. **El eje `Type` square|round vive íntegro en los valores de forma**
   (FR-007, precedente 002): square es el default del set (primer variant,
   node más antiguo) y resuelve radio 0; los valores round quedan
   documentados arriba para páginas/temas que los reasignen (S9). El anillo
   del finder se pinta como stroke de un módulo cuyo radio de línea media es
   el token: con el valor round `{ki.radius.2xl}` (14px) el borde exterior
   resulta 18px = los 2.25 módulos medidos, el borde interior emerge de la
   geometría del stroke (10px = 1.25 módulos frente a 1.4 medidos) y el
   centro escala el token ×3/7 (6px = 0.75 módulos frente a 0.8 medidos) —
   reproducción dentro de 0.15 módulos sin valores fuera de tokens
   (precedente calc de 023/024). El encogimiento 0.687 del punto redondo NO se
   traslada en v1: `module-radius` redondea la celda completa (círculos
   tangentes); un token `module-inset` para el gap medido sería MINOR
   aditivo si el founder confirma la geometría exacta. Declarado para
   ratificación del founder.
6. **Zona de silencio como padding real**: 8 px medidos en `Type=square`
   (2.07 módulos) y 8.83 px (2.0 módulos) en `Type=round` — la intención es
   ≈2 módulos; el token la fija como padding de `{ki.space.md}` (8px) sobre
   el tile, preservada a cualquier tamaño (FR-008).
7. **Material 3 no publica componente QR** (spec Assumptions, misma clase
   que avatar): los valores material3 son decisión de autor de tema, no
   extracción — tile redondeado `{ki.radius.component.lg}` (md.sys.shape
   corner.medium, 12dp) y margen generoso `{ki.space.3xl}` (16dp), con
   módulos cuadrados y tinta/tile heredados (cascada 001; la
   escaneabilidad dark-on-light es la misma obligación de tema).
8. **Encoder local vendorizado** (spec Constitutional Surface: decisión que
   requiere firma explícita del founder en cualquiera de las dos opciones):
   adaptación mínima en byte-mode y nivel M fijo de la referencia MIT de
   Project Nayuki (QR-Code-generator v1.8.0), vendorizada dentro del
   componente conforme al Art. X (código pequeño auditable antes que la
   primera dependencia npm de runtime); procedencia, licencia y sha256 del
   fichero de referencia registrados en `NOTICE`. Declarado para
   ratificación del founder.
