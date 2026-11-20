# Keyboard primitives for component authors

Import these internal functions directly from `utils/`. Supply the current
roster in navigation order. The component owns focus, selection, ARIA state,
and whether to prevent the browser's default key behavior.

- `getKeyboardIntent(key, orientation, direction)` maps arrows to `next` and
  `previous`, Home and End to `first` and `last`, Enter and Space to `activate`,
  and Escape to `close`. Use `horizontal`, `vertical`, or `both`. Horizontal
  arrows follow the supplied `ltr` or `rtl` direction. Handle only the intents
  the component's pattern calls for. `isNavigationIntent` narrows to the four
  movement intents.
- `rovingFocusIndex(items, currentIndex, intent, { isFocusable, wrap })` returns
  a destination in the original roster or `null`. All items are eligible and
  movement stops at the ends by default. Pass `-1` when there is no current item.
  Next then starts at the beginning and previous at the end. Set `wrap: true`
  to continue around the list. Use `isFocusable` to exclude items, or leave
  `aria-disabled` items eligible when the pattern requires them to be reachable.
- `rovingTabIndex(index, tabStopIndex)` gives the chosen item `0` and other
  items `-1`. Pass `-1` as the tab stop when there is no eligible item. With
  `aria-activedescendant`, keep DOM focus on the controlling element and use
  the destination to update the active item reference.
- Keep the prefix and last accepted key time per widget. After accepting a
  printable key, call `extendTypeahead(text, key, elapsedMs)`. A gap over
  500 ms starts a fresh prefix. Pass the returned text to
  `typeaheadIndex(items, text, currentIndex, isFocusable)`, with `label` on
  each item. The search skips `disabled` items by default. Menu can set
  `isFocusable` so all its focusable items can match. The
  case-insensitive search wraps once. One character starts after the
  current item and a longer prefix can refine the current match. A repeated
  initial cycles through matches if the full prefix misses. The result is `-1`
  on a miss. The widget chooses when to clear the buffer.

## Patterns

| Components | How to use the primitives | APG pattern |
| --- | --- | --- |
| Menu | Use vertical wrapping, Home and End, and type-ahead. Popup items can all keep `tabindex="-1"` and receive focus programmatically. Leave `aria-disabled` items focusable and guard activation. Keep separators and group labels out of the roster. Handle the filter field, Escape, Tab and trigger focus in the menu. | [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), [Menu and Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) |
| RadioGroup, SegmentedControl, Rating | Use wrapping arrow navigation to focus and select. Use the selected eligible item as the tab stop. Rating uses this in input mode. | [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [Rating Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio-rating/) |
| Tabs | Use horizontal wrapping and Home and End. Skip disabled and duplicate tabs. `ki-tabs` selects when focus moves. | [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) |
| Toolbar, ButtonGroup in toolbar mode | Use the configured orientation, one tab stop, and Home and End. Keep separators out of the roster and let controls handle their own activation. | [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) |
| Tree | Supply the flattened visible nodes. Use vertical movement, Home and End, and type-ahead. Handle Left and Right for parent and branch traversal in the tree. | [Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) |
| InteractiveList in listbox mode | Use vertical movement and type-ahead. Keep focus and selection distinct in multiple-selection mode. | [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) |
| Select, Combobox | Use vertical navigation and update `aria-activedescendant` while DOM focus stays on the trigger or input. `ki-select` uses type-ahead on its trigger and stops arrow movement at the ends. Editable Combobox uses the input's text and preserves native editing keys. | [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [Select-only Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) |

Stepper uses native links and CodeInput uses a single native input. Their
current designs use the browser's Tab and editing behavior.
