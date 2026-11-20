# Search examples

```html
<ki-search label="Search Kimen" placeholder="Search Kimen" name="q">
  <ki-search-suggestion value="ki-dialog" description="Component">
    Dialog
  </ki-search-suggestion>
  <ki-search-suggestion recent>button tokens</ki-search-suggestion>
  <section slot="results" aria-label="Results"></section>
</ki-search>
```

```js
const search = document.querySelector('ki-search');

search.addEventListener('ki-input', ({ detail }) => {
  // Load suggestions for detail.value and update the direct children.
});

search.addEventListener('ki-search', ({ detail }) => {
  search.querySelector('[slot="results"]').textContent = `Query: ${detail.value}`;
});
```

Use `ki-clear` to clear host-rendered content and `ki-remove-recent` to
update saved history. Set `loading` during a request. The results slot stays
visible while suggestions load. To offer voice search, supply a button
with an accessible name in the trailing slot and handle its activation.
