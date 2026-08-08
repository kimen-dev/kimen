`max` caps the visible stack; members beyond the cap are neither rendered nor exposed to assistive technology, and a static "+N" counter accounts exactly for the hidden rest:

```html
<ki-avatar-group max="3">
  <ki-avatar label="Ana García" initials="AG"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
  <ki-avatar label="Iris Toma" initials="IT"></ki-avatar>
  <ki-avatar label="Leo Duarte" initials="LD"></ki-avatar>
  <ki-avatar label="Mia Chen" initials="MC"></ki-avatar>
</ki-avatar-group>
<!-- renders Ana, Sam and Iris, then "+2" -->
```

Without `max` — or with a cap that is not a positive whole number — every member renders and no counter appears (never "+0"):

```html
<ki-avatar-group>
  <ki-avatar label="Ana García" initials="AG"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
</ki-avatar-group>
```

The group's `size` governs every visible member and the counter, overriding member-declared sizes so the stack stays uniform:

```html
<ki-avatar-group size="sm" max="2">
  <ki-avatar label="Ana García" initials="AG" size="xl"></ki-avatar>
  <ki-avatar label="Sam Bel" initials="SB"></ki-avatar>
  <ki-avatar label="Iris Toma" initials="IT"></ki-avatar>
</ki-avatar-group>
```
