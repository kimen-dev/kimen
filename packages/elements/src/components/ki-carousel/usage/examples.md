# Carousel examples

```html
<ki-carousel label="Product tour" slides-per-view="2" slides-per-move="2">
  <ki-carousel-item>Discover the tools</ki-carousel-item>
  <ki-carousel-item>Pick a theme</ki-carousel-item>
  <ki-carousel-item>Set up your workspace</ki-carousel-item>
  <ki-carousel-item>Share your first surface</ki-carousel-item>
</ki-carousel>
```

```js
const carousel = document.querySelector('ki-carousel');
carousel.addEventListener('ki-slide-change', ({ detail }) => {
  console.log(detail.index);
});
await carousel.goTo(3);
```

With per-tag imports, define both `ki-carousel` and `ki-carousel-item`.
