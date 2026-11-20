# TimeInput implementation plan

1. Scaffold `packages/elements/src/components/ki-time-input` and its two token sources with the component generator.
2. Specify browser and unit evidence for localized parsing, suggestion navigation, validation and reset, the picker button, and the adapter before production code.
3. Use a shadow-root native text input as the focusable combobox and `ElementInternals` for form participation. Share field messaging and anchored overlay placement. Stage the clock dial for later because it exceeds the size budget.
4. Document the theme states and generate the public component, wrapper, and catalog surfaces. Measure contrast and bundle budgets against the repository gates.
