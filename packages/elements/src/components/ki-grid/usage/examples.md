# Grid examples

An automatic grid fills its available space with tracks at least as wide as
`min-column` where room allows. Here the summary takes two tracks when
possible.

```html
<ki-grid min-column="8rem" gap="xl">
  <ki-card data-span="2">Overview</ki-card>
  <ki-card>Orders</ki-card>
  <ki-card>Inventory</ki-card>
  <ki-card>Customers</ki-card>
</ki-grid>
```

For a fixed count, set `columns`. The grid switches to one column when its
own available inline size drops below 30rem.

```html
<ki-grid columns="3" gap="sm">
  <ki-card>Orders</ki-card>
  <ki-card>Inventory</ki-card>
  <ki-card>Customers</ki-card>
</ki-grid>
```
