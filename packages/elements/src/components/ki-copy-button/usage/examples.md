# ki-copy-button examples

## Copy an invite link

```html
<ki-copy-button value="https://kimen.dev/i/4f9a" label="Copy invite link"></ki-copy-button>
```

## Copy what a field currently contains

```html
<ki-input id="token-field" label="Token" value="token-4f9a"></ki-input>
<ki-copy-button from="token-field" variant="secondary">Copy token</ki-copy-button>
```

## Copy a code sample with localized feedback

```html
<pre id="install-command"><code>pnpm add @kimen/elements</code></pre>
<ki-copy-button
  from="install-command"
  copied-label="Copiado"
  copy-error-label="No se pudo copiar"
>Copiar comando</ki-copy-button>
```
