The fallback chain is content, never a mode switch: a portrait that loads wins, `initials` render verbatim otherwise, and a built-in generic figure covers the rest; `label` exposes the avatar as a named non-interactive image:

```html
<ki-avatar label="Ana García" src="/avatars/ana.png" initials="AG"></ki-avatar>
<ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
<ki-avatar label="Guest"></ki-avatar>
```

Beside a visible name the avatar is decorative — omit `label` so assistive technology hears the name exactly once:

```html
<p><ki-avatar initials="AG" size="sm"></ki-avatar> Ana García</p>
```

`size` steps over the shared scale (`xxs` to `xl`, default `md`); an unrecognized value keeps the medium metrics:

```html
<ki-avatar label="Ana García" initials="AG" size="xs"></ki-avatar>
<ki-avatar label="Ana García" initials="AG"></ki-avatar>
<ki-avatar label="Ana García" initials="AG" size="xl"></ki-avatar>
```
