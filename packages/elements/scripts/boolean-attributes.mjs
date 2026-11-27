// Both builds share this client runtime. Stencil normally treats attributes
// on form-associated components like native boolean attributes. Kimen reads
// exact "false" as false and restores the declared default on removal.
import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { isStencilClientRuntime } from './stencil-client-runtime.mjs';

const componentsRoot = fileURLToPath(new URL('../src/components/', import.meta.url));

// Encode only the exceptions to the false default. The number 2 represents
// undefined for optional props that have no initializer.
function booleanDefault(member) {
  if (member.initializer?.kind === ts.SyntaxKind.TrueKeyword) return 1;
  if (member.initializer?.kind === ts.SyntaxKind.FalseKeyword) return 0;
  if (member.initializer !== undefined || member.type === undefined) return undefined;
  const types = ts.isUnionTypeNode(member.type) ? member.type.types : [member.type];
  if (
    types.some(({ kind }) => kind === ts.SyntaxKind.BooleanKeyword) &&
    types.every(
      ({ kind }) =>
        kind === ts.SyntaxKind.BooleanKeyword || kind === ts.SyntaxKind.UndefinedKeyword,
    )
  ) {
    return 2;
  }
  return undefined;
}

function propAttribute(member, propDecorator) {
  const options = propDecorator.arguments[0];
  if (options && ts.isObjectLiteralExpression(options)) {
    const attribute = options.properties.find(
      (property) => ts.isPropertyAssignment(property) && property.name.getText() === 'attribute',
    );
    if (attribute) {
      if (attribute.initializer.kind === ts.SyntaxKind.FalseKeyword) return undefined;
      if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
    }
  }
  return member.name.getText().replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

// Read the defaults directly from @Prop declarations. A shared attribute name
// can use one entry when its default agrees across components.
function readBooleanDefaults() {
  const byAttribute = new Map();
  for (const file of globSync('ki-*/ki-*.{ts,tsx}', { cwd: componentsRoot }).sort()) {
    const tag = basename(dirname(file));
    if (basename(file).replace(/\.tsx?$/u, '') !== tag) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(join(componentsRoot, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const component of source.statements.filter(ts.isClassDeclaration)) {
      for (const member of component.members.filter(ts.isPropertyDeclaration)) {
        const decorator = ts
          .getDecorators(member)
          ?.find(
            ({ expression }) =>
              ts.isCallExpression(expression) && expression.expression.getText() === 'Prop',
          );
        if (!decorator) continue;
        const value = booleanDefault(member);
        const attribute = propAttribute(member, decorator.expression);
        if (attribute === undefined) continue;
        const entries = byAttribute.get(attribute) ?? [];
        entries.push([tag, value ?? 0]);
        byAttribute.set(attribute, entries);
      }
    }
  }
  return Object.fromEntries(
    [...byAttribute].flatMap(([attribute, entries]) => {
      const value = entries[0][1];
      return entries.every(([, other]) => other === value)
        ? value === 0
          ? []
          : [[attribute, value]]
        : entries
            .filter(([, override]) => override !== 0)
            .map(([tag, override]) => [`${tag}/${attribute}`, override]);
    }),
  );
}

// Refuse a moved or changed branch instead of guessing at compiler internals.
// Replacements preserve line positions in Stencil's source map.
const PARSED_EXCEPTION =
  /\bBUILD\d*\.formAssociated && isFormAssociated && typeof propValue === "string"/gu;
const ATTRIBUTE_EXCEPTION =
  /newValue = newValue === null \|\| newValue === "false" && !isFormAssociated \? false : true;/gu;
const VDOM_ATTRIBUTE = /let xlink = false;/gu;

function replaceOnce(source, pattern, replacement, label) {
  const found = source.match(pattern)?.length ?? 0;
  if (found !== 1) {
    throw new Error(
      `boolean-attributes: expected one ${label} in Stencil's client runtime, found ${String(found)}`,
    );
  }
  return source.replace(pattern, () => replacement);
}

export function kimenBooleanAttributes(source, booleanDefaults = readBooleanDefaults()) {
  const parsed = replaceOnce(source, PARSED_EXCEPTION, 'false', 'form-associated boolean parse');
  const attributes = replaceOnce(
    parsed,
    ATTRIBUTE_EXCEPTION,
    [
      'const defaultValue = kimenBooleanDefault(this, attrName);',
      // The browser itself disables a form-associated host if it has any
      // disabled attribute. Clear it even when the prop was already false
      // and Stencil has no render to reflect. Keep presence selectors on
      // other reflected default-off props in sync for the same reason.
      'if (newValue === "false" && defaultValue === false && ((isFormAssociated && attrName === "disabled") || (propMemberFlags & 512))) this.removeAttribute(attrName);',
      'newValue = newValue === null ? defaultValue : newValue !== "false";',
    ].join(' '),
    'form-associated boolean attribute',
  );
  const reflected = replaceOnce(
    attributes,
    VDOM_ATTRIBUTE,
    // Reflect a false override as a string when absence restores a different
    // value. Handle this where VDOM writes the attribute, including first paint.
    'if (newValue === false && flags & 4 && kimenBooleanDefault(elm, memberName) !== false) newValue = "false"; let xlink = false;',
    'VDOM attribute reflection',
  );
  return `const kimenBooleanDefaults = ${JSON.stringify(booleanDefaults)}; const kimenBooleanDefault = (host, attr) => { const value = kimenBooleanDefaults[attr] ?? kimenBooleanDefaults[host.localName + "/" + attr]; return value === 2 ? void 0 : value === 1; }; ${reflected}`;
}

export const booleanAttributes = {
  name: 'kimen-boolean-attributes',
  transform(code, id) {
    if (!isStencilClientRuntime(id)) return null;
    return { code: kimenBooleanAttributes(code), map: null };
  },
};
