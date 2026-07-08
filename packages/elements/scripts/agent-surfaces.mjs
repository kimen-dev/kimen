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

    for (const prop of component.props ?? []) {
      for (const reference of Object.values(prop.complexType?.references ?? {})) {
        if (reference.path) {
          reference.path = normalizePath(reference.path, options.packageRoot);
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

export function buildManifest(docs) {
  return {
    schemaVersion: '1.0.0',
    readme: '',
    modules: (docs.components ?? []).map((component) => {
      const className = classNameFromTag(component.tag);
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
              parameters:
                method.signature?.map((parameter) => ({
                  name: parameter.name,
                  type: { text: parameter.type },
                  description: parameter.docs ?? '',
                })) ?? [],
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
        cssProperties: (component.styles ?? []).map((style) => ({
          name: style.name ?? style.annotation,
          description: style.docs ?? '',
        })),
      };

      for (const key of FACET_KEYS) {
        declaration[key] ??= [];
      }

      if (component.deprecation) {
        declaration.deprecated = component.deprecation;
      }

      return {
        kind: 'javascript-module',
        path: component.filePath,
        declarations: [declaration],
        exports: [
          {
            kind: 'js',
            name: className,
            declaration: { name: className, module: component.filePath },
          },
          {
            kind: 'custom-element-definition',
            name: component.tag,
            declaration: { name: className, module: component.filePath },
          },
        ],
      };
    }),
  };
}

export function buildLlmsTxt(docs, pkg, preamble) {
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
      renderList(
        'CSS custom properties',
        (component.styles ?? []).map(
          (style) => `\`${style.name ?? style.annotation}\`: ${oneLine(style.docs ?? '')}`,
        ),
      ),
    );
  }

  return `${lines.join('\n')}\n`;
}

function normalizePath(value, packageRoot) {
  const posixValue = value.replaceAll('\\', '/');
  if (!path.isAbsolute(value) && !/^[A-Z]:\//i.test(posixValue)) {
    return posixValue;
  }

  const marker = '/packages/elements/';
  const markerIndex = posixValue.indexOf(marker);
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
