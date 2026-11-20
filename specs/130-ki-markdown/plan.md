# Implementation plan

1. Derive unit and browser coverage from the behavior contract. Exercise A2UI Text through its neutral conversion and test origin policy on guarded rendering paths.
2. Lex Markdown to a token tree, then render a fixed set of Stencil and native elements. Keep raw HTML in text nodes. Apply the shared scheme and origin policy before constructing links or images.
3. Delegate link and code behavior to the shipped components. Style Markdown structure through component tokens and include native table and note examples in the four visual galleries.
4. Regenerate the component inventory, catalog, wrappers and API. Run the non-browser gates and hand over browser and baseline verification to the integrator.
