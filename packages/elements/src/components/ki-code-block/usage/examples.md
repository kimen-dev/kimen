# ki-code-block examples

Display a TypeScript snippet with line numbers and a highlighted line.

```html
<ki-code-block language="ts" filename="main.ts" line-numbers highlight="2">// Load the current sample.
const sample = load(3);</ki-code-block>
```

Use plain text for unsupported syntax. In HTML, escape literal angle
brackets so they remain part of the source.

```html
<ki-code-block language="html" filename="example.html" wrap copyable="false">&lt;p&gt;Hello&lt;/p&gt;</ki-code-block>
```

Color a Gherkin contract in English or Spanish with `language="gherkin"`.
Keywords count only where they open a line.

```html
<ki-code-block language="gherkin" filename="pagos.feature"># language: es
Característica: Pagar el carrito
  Escenario: Pagar con tarjeta
    Dado un carrito con 3 productos y un cupón
    Cuando el cliente paga
    Entonces el recibo muestra el total</ki-code-block>
```

The guarded catalog accepts source strings in the default slot.

```json
{
  "version": 1,
  "actions": ["sampleCopied"],
  "root": {
    "component": "ki-code-block",
    "props": { "language": "js", "filename": "index.js", "line-numbers": true },
    "slots": { "": ["const sample = load(3);"] },
    "action": "sampleCopied"
  }
}
```
