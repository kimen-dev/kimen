import path from 'node:path';

const FACET_KEYS = ['attributes', 'members', 'events', 'slots', 'cssParts', 'cssProperties'];

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function normalizeDocs(docs, options = {}) {
  const normalized = JSON.parse(JSON.stringify(docs));
  delete normalized.timestamp;

  for (const component of normalized.components ?? []) {
    for (const key of ['filePath', 'dirPath', 'readmePath', 'usagesDir']) {
      if (component[key]) {
        component[key] = normalizePath(component[key], options.packageRoot);
      }
    }

    // Review round 1: events and methods carry the same complexType.references
    // shape as props — walk every facet generically so the first evented
    // component cannot commit absolute paths (FR-006/FR-007).
    for (const facet of [component.props ?? [], component.events ?? [], component.methods ?? []]) {
      for (const member of facet) {
        for (const reference of Object.values(member.complexType?.references ?? {})) {
          if (reference.path) {
            reference.path = normalizePath(reference.path, options.packageRoot);
          }
        }
      }
    }
  }

  return normalized;
}

export function validateDocs(docs) {
  const violations = [];

  for (const component of docs.components ?? []) {
    const tag = component.tag ?? '<unknown>';
    if (isBlank(component.docs)) {
      violations.push(`${tag}: component has no documentation`);
    }

    for (const tagName of ['whenToUse', 'whenNotToUse']) {
      if (
        !component.docsTags?.some((docsTag) => docsTag.name === tagName && !isBlank(docsTag.text))
      ) {
        violations.push(`${tag}: missing @${tagName} guidance tag`);
      }
    }

    for (const docsTag of component.docsTags ?? []) {
      if (isBlank(docsTag.text)) {
        violations.push(`${tag}.@${docsTag.name}: documentation tag has empty text`);
      }
    }

    for (const prop of component.props ?? []) {
      if (isBlank(prop.docs)) {
        violations.push(`${tag}.${prop.name}: property has no documentation`);
      }
    }

    for (const event of component.events ?? []) {
      if (isBlank(event.docs)) {
        violations.push(`${tag}.${event.event ?? event.name}: event has no documentation`);
      }
    }

    for (const method of component.methods ?? []) {
      if (isBlank(method.docs)) {
        violations.push(`${tag}.${method.name}: method has no documentation`);
      }
    }

    for (const slot of component.slots ?? []) {
      if (isBlank(slot.docs)) {
        violations.push(`${tag}.slot[${slot.name || 'default'}]: slot has no documentation`);
      }
    }

    for (const part of component.parts ?? []) {
      if (isBlank(part.docs)) {
        violations.push(`${tag}.part[${part.name}]: part has no documentation`);
      }
    }

    for (const style of component.styles ?? []) {
      if (isBlank(style.docs)) {
        violations.push(
          `${tag}.${style.name ?? style.annotation ?? 'style'}: CSS property has no documentation`,
        );
      }
    }
  }

  return violations;
}

export function buildManifest(docs, inputs = {}) {
  return {
    schemaVersion: '1.0.0',
    readme: '',
    modules: (docs.components ?? []).map((component) => {
      const className = classNameFromTag(component.tag);
      const modulePath = resolvePublishedModulePath(
        component.tag,
        component.filePath,
        inputs.packageExports,
      );
      const cssProperties = cssPropertiesFor(component, inputs);
      const declaration = {
        kind: 'class',
        name: className,
        customElement: true,
        tagName: component.tag,
        description: component.docs ?? '',
        whenToUse: getDocsTag(component, 'whenToUse'),
        whenNotToUse: getDocsTag(component, 'whenNotToUse'),
        attributes: (component.props ?? [])
          .filter((prop) => prop.attr)
          .map((prop) =>
            compactObject({
              name: prop.attr,
              fieldName: prop.name,
              type: { text: prop.type },
              default: prop.default,
              description: prop.docs ?? '',
            }),
          ),
        members: [
          ...(component.props ?? []).map((prop) =>
            compactObject({
              kind: 'field',
              name: prop.name,
              privacy: 'public',
              type: { text: prop.type },
              default: prop.default,
              description: prop.docs ?? '',
              attribute: prop.attr,
              reflects: Boolean(prop.reflectToAttr),
            }),
          ),
          ...(component.methods ?? []).map((method) =>
            compactObject({
              kind: 'method',
              name: method.name,
              privacy: 'public',
              description: method.docs ?? '',
              return: { type: { text: method.complexType?.return ?? 'void' } },
              // docs-json puts a method's parameters in `parameters`; `signature`
              // is the string form and has no `.map` (data-model.md member shape).
              parameters: (method.parameters ?? []).map((parameter) => ({
                name: parameter.name,
                type: { text: parameter.type },
                description: parameter.docs ?? '',
              })),
            }),
          ),
        ],
        events: (component.events ?? []).map((event) => ({
          name: event.event ?? event.name,
          type: {
            text: event.complexType?.original
              ? `CustomEvent<${event.complexType.original}>`
              : 'CustomEvent',
          },
          description: event.docs ?? '',
        })),
        slots: (component.slots ?? []).map((slot) => ({
          name: slot.name ?? '',
          description: slot.docs ?? '',
        })),
        cssParts: (component.parts ?? []).map((part) => ({
          name: part.name,
          description: part.docs ?? '',
        })),
        cssProperties,
      };

      for (const key of FACET_KEYS) {
        declaration[key] ??= [];
      }

      if (component.deprecation) {
        declaration.deprecated = component.deprecation;
      }

      return {
        kind: 'javascript-module',
        path: modulePath,
        declarations: [declaration],
        exports: [
          {
            kind: 'js',
            name: className,
            declaration: { name: className, module: modulePath },
          },
          {
            kind: 'custom-element-definition',
            name: component.tag,
            declaration: { name: className, module: modulePath },
          },
        ],
      };
    }),
  };
}

export function buildLlmsTxt(docs, pkg, preamble, inputs = {}) {
  const lines = [
    `# ${pkg.name} — Kimen web components`,
    '',
    `> ${pkg.description}`,
    '',
    trimOneTrailingLf(preamble),
    '',
    '## Components',
  ];

  for (const component of docs.components ?? []) {
    lines.push(
      '',
      `### ${component.tag}`,
      '',
      oneLine(component.docs ?? ''),
      '',
      `When to use: ${getDocsTag(component, 'whenToUse')}`,
      `When NOT to use: ${getDocsTag(component, 'whenNotToUse')}`,
      '',
      renderList(
        'Attributes',
        (component.props ?? []).filter((prop) => prop.attr).map(renderAttribute),
      ),
      '',
      renderList(
        'Slots',
        (component.slots ?? []).map(
          (slot) => `${slot.name ? `\`${slot.name}\`` : '(default)'}: ${oneLine(slot.docs ?? '')}`,
        ),
      ),
      '',
      renderList(
        'Parts',
        (component.parts ?? []).map((part) => `\`${part.name}\`: ${oneLine(part.docs ?? '')}`),
      ),
      '',
      renderList('Events', (component.events ?? []).map(renderEvent)),
      '',
      renderList('Methods', (component.methods ?? []).map(renderMethod)),
      '',
      renderList(
        'CSS custom properties',
        cssPropertiesFor(component, inputs).map(
          (style) => `\`${style.name}\`: ${oneLine(style.description)}`,
        ),
      ),
    );
  }

  return `${lines.join('\n')}\n`;
}

function cssPropertiesFor(component, inputs) {
  if (inputs.cssPropertiesByTag !== undefined) {
    return (inputs.cssPropertiesByTag[component.tag] ?? []).map((style) => ({
      name: style.name,
      description: style.description ?? '',
    }));
  }

  return (component.styles ?? [])
    .filter((style) => (style.annotation ?? 'prop') === 'prop')
    .map((style) => ({
      name: style.name ?? style.annotation,
      description: style.docs ?? '',
    }));
}

function exportTargetForImport(entry) {
  if (typeof entry === 'string') {
    return entry;
  }
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      const target = exportTargetForImport(candidate);
      if (target !== null) {
        return target;
      }
    }
    return null;
  }
  if (entry === null || typeof entry !== 'object') {
    return null;
  }

  for (const condition of ['import', 'browser', 'default', 'node']) {
    if (Object.hasOwn(entry, condition)) {
      const target = exportTargetForImport(entry[condition]);
      if (target !== null) {
        return target;
      }
    }
  }
  return null;
}

function matchExportPattern(pattern, subpath) {
  const starIndex = pattern.indexOf('*');
  if (starIndex === -1) {
    return pattern === subpath ? '' : null;
  }
  if (pattern.indexOf('*', starIndex + 1) !== -1) {
    return null;
  }
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) {
    return null;
  }
  return subpath.slice(prefix.length, subpath.length - suffix.length);
}

function resolvePublishedModulePath(tag, sourcePath, packageExports) {
  if (packageExports === undefined) {
    return sourcePath;
  }
  const subpath = `./${tag}`;
  const entries = Object.entries(packageExports);
  const exact = entries.find(([key]) => key === subpath);
  const candidates = exact === undefined ? entries.filter(([key]) => key.includes('*')) : [exact];

  for (const [key, entry] of candidates) {
    const substitution = matchExportPattern(key, subpath);
    if (substitution === null) {
      continue;
    }
    const target = exportTargetForImport(entry);
    if (target === null) {
      continue;
    }
    const resolved = target.replaceAll('*', substitution).replace(/^\.\//u, '');
    if (resolved.length > 0 && !resolved.includes('*')) {
      return resolved;
    }
  }

  throw new Error(`${tag}: no published JavaScript export resolves its module path`);
}

function normalizePath(value, packageRoot) {
  const posixValue = value.replaceAll('\\', '/');
  if (!path.isAbsolute(value) && !/^[A-Z]:\//i.test(posixValue)) {
    return posixValue;
  }

  const marker = '/packages/elements/';
  const markerIndex = posixValue.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return posixValue.slice(markerIndex + marker.length);
  }

  if (packageRoot) {
    return path.relative(packageRoot, value).replaceAll('\\', '/');
  }

  return posixValue.replace(/^\/+/, '');
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function getDocsTag(component, name) {
  return component.docsTags?.find((docsTag) => docsTag.name === name)?.text ?? '';
}

function classNameFromTag(tag) {
  return tag
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function trimOneTrailingLf(value) {
  return value.replace(/\n$/, '');
}

function oneLine(value) {
  return value.replace(/\s*\n\s*/g, ' ').trim();
}

function renderList(label, entries) {
  if (entries.length === 0) {
    return `${label}: none`;
  }

  return `${label}:\n${entries.map((entry) => `- ${entry}`).join('\n')}`;
}

function renderAttribute(prop) {
  const defaultText = prop.default === undefined ? '' : `, default ${prop.default}`;
  return `\`${prop.attr}\` (${prop.type}${defaultText}): ${oneLine(prop.docs ?? '')}`;
}

function renderEvent(event) {
  const eventType = event.complexType?.original
    ? `CustomEvent<${event.complexType.original}>`
    : 'CustomEvent';
  return `\`${event.event ?? event.name}\` (${eventType}): ${oneLine(event.docs ?? '')}`;
}

function renderMethod(method) {
  const params = (method.parameters ?? []).map((parameter) => parameter.name).join(', ');
  const returnType = method.complexType?.return ?? 'void';
  return `\`${method.name}(${params})\` (${returnType}): ${oneLine(method.docs ?? '')}`;
}
