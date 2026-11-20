# Pagination examples

Import `@kimen/tokens/css` and register the element with
`defineCustomElement` from `@kimen/elements/components/ki-pagination.js`.

## Replace a results page

```html
<h2 id="results-heading" tabindex="-1">Results page 1</h2>
<ul id="results"><li>Mercury</li><li>Venus</li></ul>
<ki-pagination id="results-pages" page="1" pages="2" label="Planet results pages"></ki-pagination>

<script type="module">
  const pages = [['Mercury', 'Venus'], ['Earth', 'Mars']];
  const pager = document.getElementById('results-pages');
  const heading = document.getElementById('results-heading');
  const results = document.getElementById('results');

  pager.addEventListener('ki-page-change', ({ detail: { page } }) => {
    const items = pages[page - 1].map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    });
    results.replaceChildren(...items);
    heading.textContent = `Results page ${page}`;
    pager.page = page;
    heading.focus();
  });
</script>
```

When fetching asynchronously, update `page` and move focus after the
requested results render. Keep the heading programmatically focusable.

## Let the server render each page

```html
<ki-pagination page="5" pages="12" href-template="?page={page}"
  label="Search results pages"></ki-pagination>
```

Place `{page}` in the path, query, or fragment of a relative or HTTP(S) URL.
The generated anchors support browser link actions. The catalog applies
its URL policy. For a guarded page action, use numbered or compact pagination
in button mode.

## Append results and announce the count

```html
<ul id="recent-results"><li>Mercury</li><li>Venus</li></ul>
<ki-pagination id="recent-pagination" variant="load-more" shown="2" total="4"
  label="More planets"></ki-pagination>

<script type="module">
  const pager = document.getElementById('recent-pagination');
  const results = document.getElementById('recent-results');

  pager.addEventListener('ki-load-more', () => {
    const items = ['Earth', 'Mars'].map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    });
    results.append(...items);
    pager.shown = results.childElementCount;
  });
</script>
```

The last update keeps the same button in place and announces the final
count. Set `previous-label`, `next-label`, and `load-more-label` for
translated controls. Use `page-label`, `compact-label`, and `status-label`
with the named placeholders to translate the generated text.
