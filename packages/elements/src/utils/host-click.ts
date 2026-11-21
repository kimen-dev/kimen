// A click dispatched at a control's host itself never reaches the native input
// inside its shadow tree: `host.click()` from a script, or the activation of a
// page `<label>` that labels the host, targets the host and stops there, so
// nothing toggled and neither `input` nor `change` fired. A native checkbox or
// radio toggles on `click()`. The host hands such a click on to its input, as
// `input.click()` would be.
//
// A click that started inside the shadow tree (the visible control, the slotted
// label) already reaches the input through the shadow `<label>`, so only a
// click whose first target is the host is forwarded. The forwarded click stays
// inside the shadow tree: the page has already heard the host's click once.

type InputSource = () => HTMLInputElement | null | undefined;

function stopAtInput(event: Event): void {
  event.stopPropagation();
}

/** Forward host-targeted clicks to the control's native input. Returns the cleanup. */
export function forwardHostClick(host: HTMLElement, input: InputSource): () => void {
  const onClick = (event: Event): void => {
    if (event.composedPath()[0] !== host || event.defaultPrevented) {
      return;
    }
    const control = input();
    if (!control) {
      return;
    }
    // A disabled input ignores click() and fires nothing, as a native one does.
    control.addEventListener('click', stopAtInput);
    try {
      control.click();
    } finally {
      control.removeEventListener('click', stopAtInput);
    }
  };
  host.addEventListener('click', onClick);
  return () => {
    host.removeEventListener('click', onClick);
  };
}
