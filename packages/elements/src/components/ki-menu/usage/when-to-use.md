# When to use Menu

Use Menu for commands on the same object, account actions, split buttons and
overflow actions. Keep destructive actions at the end after a divider. Pick
a select for a form value, links for navigation, or a dialog or page for
long action lists.

Supply a host-authored trigger with an ID in the same DOM tree. Bind the
catalog action on the menu's declared `ki-select` event. Application DOM
listeners can read the selected item's `value` and optional `checked` from
the event detail.
