# Public contract

| Prop | Type | Default |
| --- | --- | --- |
| `page` | Number, 1-based | 1 |
| `pages` | Number of result pages | Unset |
| `variant` | `pages\|compact\|load-more` | `pages` |
| `siblings`, `boundaries` | Nonnegative numbers up to 10 | 1 each |
| `shown`, `total` | Nonnegative counts | Unset |
| `label` | Navigation landmark name | Pagination |
| `href-template` | HTTP(S) or relative URL template with `{page}` | Unset |
| `previous-label`, `next-label`, `load-more-label` | Control names | Previous page, Next page, Load more |
| `page-label`, `compact-label`, `status-label` | Text templates | Page {page}, Page {page} of {pages}, Showing {shown} of {total} results |

`ki-page-change` carries `{ page: number }`. Cancelling the event cancels
navigation from plain link activation. `ki-load-more` requests another batch
without a payload. Consumers update results and the controlled values. After
a page change, move focus to the new results heading once it is available.

Parts expose the navigation, list, page, gap, previous and next controls,
compact count, load-more control, and status. There are no slots.
