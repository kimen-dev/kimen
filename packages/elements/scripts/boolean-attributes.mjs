// How Stencil's runtime reads a boolean attribute, the way Kimen documents
// it. A Rollup plugin of the Stencil build (stencil.config.ts); nothing it
// writes is edited by hand.
//
// Every Kimen component turns a boolean property off from markup with
// `attr="false"`: `<ki-popover arrow="false">`, `<ki-search
// highlight="false">`. Stencil's client runtime makes one exception: on a
// form-associated component it reads every value but a missing attribute as
// true, like a native control's `disabled`. The generic runtime the
// per-component modules used to import never applied it (its build flags
// leave form association off), while the lazy build, compiled with Kimen's
// own flags, did. Once the per-component modules carry a runtime compiled
// with those flags too, this plugin removes the exception from it in every
// build, so a tag reads its attributes the same way whichever entry point
// defined it.
//
// The plugin refuses to guess: if either branch no longer has the shape
// below, the build stops. It moves no line, so the module keeps its source
// map.

import { isStencilClientRuntime } from './stencil-client-runtime.mjs';

// `parsePropertyValue`, for a boolean property set from a string.
const PARSED_EXCEPTION =
  /\bBUILD\d*\.formAssociated && isFormAssociated && typeof propValue === "string"/gu;
// `attributeChangedCallback`, for a boolean attribute.
const ATTRIBUTE_EXCEPTION =
  /newValue = newValue === null \|\| newValue === "false" && !isFormAssociated \? false : true;/gu;

function replaceOnce(source, pattern, replacement, label) {
  const found = source.match(pattern)?.length ?? 0;
  if (found !== 1) {
    throw new Error(
      `boolean-attributes: expected one ${label} in Stencil's client runtime, found ${String(found)}`,
    );
  }
  return source.replace(pattern, replacement);
}

/** Stencil's runtime reading `attr="false"` as false on every component. */
export function kimenBooleanAttributes(source) {
  const parsed = replaceOnce(source, PARSED_EXCEPTION, 'false', 'form-associated boolean parse');
  return replaceOnce(
    parsed,
    ATTRIBUTE_EXCEPTION,
    'newValue = newValue === null || newValue === "false" ? false : true;',
    'form-associated boolean attribute',
  );
}

/** The Rollup plugin: rewrites the client runtime wherever a build bundles it. */
export const booleanAttributes = {
  name: 'kimen-boolean-attributes',
  transform(code, id) {
    if (!isStencilClientRuntime(id)) return null;
    // `map: null` keeps the module's source map: no line moved.
    return { code: kimenBooleanAttributes(code), map: null };
  },
};
