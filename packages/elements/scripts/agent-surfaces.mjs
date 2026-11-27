import path from 'node:path';
import { buildStateTokenTable } from './contract-tokens.mjs';

const FACET_KEYS = ['attributes', 'members', 'events', 'slots', 'cssParts', 'cssProperties'];
const GENUI_FULL_HEADING = '## GenUI layer';

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

    // Stencil 4.45 lists every named <slot> render() returns, documented or
    // not. A slot the component fills itself (`@managedSlot`) is not authoring
    // surface, so it never reaches the manifest, llms.txt or the catalog.
    const managed = new Set(managedSlotsFor(component).map((slot) => slot.name));
    if (managed.size > 0 && Array.isArray(component.slots)) {
      component.slots = component.slots.filter((slot) => !managed.has(slot.name));
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
      violations.push(
        ...boundViolations(tag, prop),
        ...formatViolations(tag, prop),
        ...attributeTypeViolations(tag, prop),
      );
    }

    for (const event of component.events ?? []) {
      if (isBlank(event.docs)) {
        violations.push(`${tag}.${event.event ?? event.name}: event has no documentation`);
      }
    }

    const declaredEvents = new Set(
      (component.events ?? []).map((event) => event.event ?? event.name),
    );
    for (const docsTag of component.docsTags ?? []) {
      if (docsTag.name !== 'event' || isBlank(docsTag.text)) {
        continue;
      }
      const nativeEvent = parseNativeEventTag(docsTag.text);
      if (nativeEvent === null) {
        violations.push(`${tag}.@event: expected "<event-name> - <description>"`);
      } else if (declaredEvents.has(nativeEvent.name)) {
        violations.push(`${tag}.@event ${nativeEvent.name}: event is declared more than once`);
      } else {
        declaredEvents.add(nativeEvent.name);
      }
    }

    for (const method of component.methods ?? []) {
      if (isBlank(method.docs)) {
        violations.push(`${tag}.${method.name}: method has no documentation`);
      }
    }

    const publicSlots = new Set(
      (component.docsTags ?? [])
        .filter((docsTag) => docsTag.name === 'slot' && !isBlank(docsTag.text))
        .map((docsTag) => /^(\S+)\s+-/u.exec(docsTag.text.trim())?.[1])
        .filter((name) => name !== undefined && name !== '-'),
    );
    for (const docsTag of component.docsTags ?? []) {
      if (docsTag.name !== 'managedSlot' || isBlank(docsTag.text)) {
        continue;
      }
      const managedSlot = parseManagedSlotTag(docsTag.text);
      if (managedSlot === null) {
        violations.push(`${tag}.@managedSlot: expected "<slot-name> - <reason>"`);
      } else if (publicSlots.has(managedSlot.name)) {
        violations.push(
          `${tag}.@managedSlot ${managedSlot.name}: slot is also documented as public with @slot`,
        );
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
  const sources = new Map(
    (inputs.tokenInventory?.publicTokens ?? [])
      .filter(({ layer }) => layer === 'component')
      .map(({ cssName, component, path: tokenPath }) => [
        cssName,
        { component, family: tokenPath.split('.')[1] },
      ]),
  );
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
        ...compactObject({ catalogAction: getDocsTag(component, 'catalogAction') || undefined }),
        attributes: (component.props ?? [])
          .filter((prop) => prop.attr)
          .map((prop) =>
            compactObject({
              name: prop.attr,
              fieldName: prop.name,
              type: { text: attributeType(prop) },
              default: prop.default,
              description: prop.docs ?? '',
              required: requiredFlag(prop),
              deprecatedValues: deprecatedValues(prop),
              ...numericBounds(prop),
              format: propFormat(prop),
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
              required: requiredFlag(prop),
              deprecatedValues: deprecatedValues(prop),
              ...numericBounds(prop),
              format: propFormat(prop),
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
        events: [
          ...(component.events ?? []).map((event) => ({
            name: event.event ?? event.name,
            type: {
              text: event.complexType?.original
                ? `CustomEvent<${event.complexType.original}>`
                : 'CustomEvent',
            },
            description: event.docs ?? '',
          })),
          ...nativeEventsFor(component).map((event) => ({
            name: event.name,
            type: { text: 'Event' },
            description: event.description,
          })),
        ],
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

      const tokenStates = buildStateTokenTable(declaration, sources);
      if (tokenStates.length > 0) declaration.tokenStates = tokenStates;

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
    const usage = usageText(component);
    lines.push(
      '',
      `### ${component.tag}`,
      '',
      oneLine(component.docs ?? ''),
      '',
      `When to use: ${getDocsTag(component, 'whenToUse')}`,
      `When NOT to use: ${getDocsTag(component, 'whenNotToUse')}`,
      ...(usage === null ? [] : ['', `Examples:\n\n${usage}`]),
      ...componentFacets(component, inputs).flatMap(([label, entries]) => [
        '',
        renderList(label, entries),
      ]),
      ...stateTokenSection(component, '####'),
    );
  }

  return `${lines.join('\n')}\n`;
}

/**
 * The size an index may reach (FR-011): about four thousand tokens at four
 * bytes each, so an agent can always afford to read it before it has chosen
 * anything. A test holds both committed indexes to it.
 */
// Raised from 16 KiB on 2026-11-20 when document 2 roughly doubled the component
// count (approved to publish): about six thousand tokens still fit an agent's first read.
export const LLMS_INDEX_MAX_BYTES = 24_576;

// The names the indexes link. They are part of the published contract: the
// package ships the documents at these paths and the site serves them, with
// the complete summary, at these URLs.
const DOCUMENTS_DIRECTORY = 'llms';
const FULL_FILE = 'llms-full.txt';

const INDEX_NOTE = [
  'This file is an index: read it first, then only the documents the task',
  'needs. Each entry under Components says when to use that component; its',
  'document is the complete contract — attributes, slots, parts, events,',
  'methods, CSS custom properties and examples.',
].join('\n');

/**
 * llms.txt as the llms.txt convention defines it (https://llmstxt.org/): an
 * H1, a blockquote summary, body text without headings, then H2 sections
 * that are lists of `[name](url): notes` links. `options.base` prefixes
 * every document link: empty for the index shipped in the package (relative
 * paths inside the tarball), the site origin for the repository index the
 * site publishes. `options.genUi` — the validated GenUI source and the
 * packages it names, `{ genUi, packages }` — adds the GenUI guides; the
 * packaged index omits it because those packages are not in the tarball.
 * `options.fullSummary` links llms-full.txt, which only the site serves: the
 * package ships the documents the index links, not the same text again in one
 * file.
 */
export function buildLlmsIndex(docs, pkg, preamble, options = {}) {
  const base = options.base ?? '';
  const documentUrl = (file) => `${base}${DOCUMENTS_DIRECTORY}/${file}`;
  const { body, sections } = splitPreamble(preamble);
  const { genUi = {}, packages: genUiPackages = [] } = options.genUi ?? {};
  const genUiSources = new Map(genUiPackages.map((entry) => [entry.directory, entry]));
  const blocks = [
    `# ${pkg.name} — Kimen web components`,
    `> ${pkg.description}`,
    body,
    (genUi.intro ?? []).join('\n'),
    INDEX_NOTE,
    linkSection(
      'Components',
      (docs.components ?? []).map((component) =>
        linkEntry(
          component.tag,
          documentUrl(componentDocumentFile(component)),
          firstSentence(getDocsTag(component, 'whenToUse')),
        ),
      ),
    ),
    linkSection(
      'Generative UI',
      (genUi.packages ?? []).map((entry) =>
        linkEntry(
          genUiSources.get(entry.directory).packageJson.name,
          documentUrl(genUiDocumentFile(entry)),
          firstSentence(entry.whenToUse ?? ''),
        ),
      ),
    ),
    linkSection(
      'Guides',
      sections.map((section) =>
        linkEntry(section.title, documentUrl(section.file), firstSentence(section.text)),
      ),
    ),
    linkSection('Optional', [
      ...(options.fullSummary === true
        ? [
            linkEntry(
              FULL_FILE,
              `${base}${FULL_FILE}`,
              'everything in one file — this guidance and every component contract. Large: fetch it only when the whole library is needed at once.',
            ),
          ]
        : []),
      ...(options.manifestHref === undefined
        ? []
        : [
            linkEntry(
              'custom-elements.json',
              options.manifestHref,
              'the same component contracts as a Custom Elements Manifest (JSON).',
            ),
          ]),
    ]),
  ];

  return `${blocks.filter((block) => block !== '').join('\n\n')}\n`;
}

/**
 * The Markdown documents the packaged index links, as [file name, content]
 * pairs: one per published component (FR-012) and one per `##` section of
 * the preamble template (the guides, FR-015).
 */
export function buildLlmsDocuments(docs, preamble, inputs = {}) {
  const { sections } = splitPreamble(preamble);
  const booleanGuide = sections.find(({ file }) => file === 'boolean-attributes.md');
  return [
    ...(docs.components ?? []).map((component) => [
      componentDocumentFile(component),
      buildComponentDocument(component, inputs, booleanGuide),
    ]),
    ...sections.map((section) => [section.file, `# ${section.title}\n\n${section.text}\n`]),
  ];
}

/**
 * One guide per GenUI package, from the same validated source as the GenUI
 * layer of the repository llms-full.txt (FR-015).
 */
export function buildGenUiDocuments(genUi, packages) {
  const sources = new Map(packages.map((entry) => [entry.directory, entry]));

  return (genUi.packages ?? []).map((entry) => {
    const { packageJson } = sources.get(entry.directory);
    return [
      genUiDocumentFile(entry),
      `${[
        `# ${packageJson.name}`,
        `> ${oneLine(packageJson.description)}`,
        `## When to use\n\n${oneLine(entry.whenToUse ?? '')}`,
        `## When not to use\n\n${oneLine(entry.whenNotToUse ?? '')}`,
        documentSection('Entry points', genUiEntryPoints(entry)),
      ].join('\n\n')}\n`,
    ];
  });
}

function buildComponentDocument(component, inputs, booleanGuide) {
  const usage = usageText(component);

  return `${[
    `# ${component.tag}`,
    `> ${oneLine(component.docs ?? '')}`,
    `## When to use\n\n${getDocsTag(component, 'whenToUse')}`,
    `## When not to use\n\n${getDocsTag(component, 'whenNotToUse')}`,
    ...(usage === null ? [] : [`## Examples\n\n${usage}`]),
    documentSection('Token stylesheets', tokenStylesheetsFor(component.tag)),
    ...(booleanGuide ? [`[${booleanGuide.title}](${booleanGuide.file}).`] : []),
    ...componentFacets(component, inputs).map(([label, entries]) =>
      documentSection(label, entries),
    ),
    ...stateTokenSection(component, '##'),
  ].join('\n\n')}\n`;
}

// Spec 166: the core and one sheet per tag, named like the element import, are
// the default (since 2026-11-26); the full sheet is the simple alternative.
function tokenStylesheetsFor(tag) {
  return [
    `\`@kimen/tokens/css/core\` once per page and \`@kimen/tokens/css/${tag}\`: the default, only the tokens ${tag} needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.`,
    '`@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.',
  ];
}

// Every facet of a component as [label, one-line entries], in the order the
// complete summary and the component document both render them.
function componentFacets(component, inputs) {
  const stateTokens = new Set((component.tokenStates ?? []).flatMap(({ tokens }) => tokens));
  return [
    ['Attributes', (component.props ?? []).filter((prop) => prop.attr).map(renderAttribute)],
    [
      'Slots',
      (component.slots ?? []).map(
        (slot) => `${slot.name ? `\`${slot.name}\`` : '(default)'}: ${oneLine(slot.docs ?? '')}`,
      ),
    ],
    [
      'Parts',
      (component.parts ?? []).map((part) => `\`${part.name}\`: ${oneLine(part.docs ?? '')}`),
    ],
    [
      'Events',
      [
        ...(component.events ?? []).map(renderEvent),
        ...nativeEventsFor(component).map(
          (event) => `\`${event.name}\` (Event): ${oneLine(event.description)}`,
        ),
      ],
    ],
    ['Methods', (component.methods ?? []).map(renderMethod)],
    [
      stateTokens.size === 0 ? 'CSS custom properties' : 'Other CSS custom properties',
      (inputs.cssPropertiesByTag === undefined && component.cssProperties
        ? component.cssProperties
        : cssPropertiesFor(component, inputs)
      )
        .filter(({ name }) => !stateTokens.has(name))
        .map((style) => {
          const description = `\`${style.name}\`: ${oneLine(style.description)}`;
          return style.default === undefined
            ? description
            : `${description} Default: ${tokenDefault(style)}.`;
        }),
    ],
  ];
}

function tokenDefault(property) {
  const base = `\`${property.default}\``;
  return property.material3Default === undefined
    ? base
    : `onmars ${base}, material3 \`${property.material3Default}\``;
}

function stateTokenSection(component, level) {
  const groups = component.tokenStates;
  if (!groups?.length) return [];
  const byName = new Map(component.cssProperties.map((property) => [property.name, property]));
  const rows = groups.flatMap(({ variant, tone, state, tokens }) =>
    tokens.map((name) => {
      const property = byName.get(name);
      return [
        variant ?? '—',
        tone ?? '—',
        state,
        `\`${name}\``,
        tokenDefault(property),
        oneLine(property.description),
      ];
    }),
  );
  return [
    [
      `${level} CSS custom properties by variant and state`,
      '',
      '| Variant | Tone | State | Token | Default | Description |',
      '| --- | --- | --- | --- | --- | --- |',
      ...rows.map((cells) => `| ${cells.map((cell) => cell.replaceAll('|', '\\|')).join(' | ')} |`),
    ].join('\n'),
  ];
}

function componentDocumentFile(component) {
  return `${component.tag}.md`;
}

function genUiDocumentFile(entry) {
  return `${entry.directory.split('/').filter(Boolean).at(-1)}.md`;
}

function genUiEntryPoints(entry) {
  return (entry.entryPoints ?? []).map(
    (entryPoint) =>
      `\`${entryPoint.signature ?? entryPoint.name}\`: ${oneLine(entryPoint.summary ?? '')}`,
  );
}

// A facet with no entries is stated ("None."), never omitted: an agent must
// be able to tell "no events" from "events not documented here".
function documentSection(label, entries) {
  return `## ${label}\n\n${
    entries.length === 0 ? 'None.' : entries.map((entry) => `- ${entry}`).join('\n')
  }`;
}

function linkEntry(name, url, note) {
  return `- [${name}](${url}): ${note}`;
}

function linkSection(title, entries) {
  return entries.length === 0 ? '' : `## ${title}\n\n${entries.join('\n')}`;
}

// The preamble template is one hand-written source with two readers: the text
// before its first `##` heading is the body of the index, and every `##`
// section is a guide the index links (llms-full.txt keeps the template
// verbatim). A `##` inside fenced code is content, not a heading.
function splitPreamble(preamble) {
  const body = [];
  const sections = [];
  let current = body;
  let fenced = false;

  for (const line of trimOneTrailingLf(preamble).split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced;
    }
    const heading = fenced ? null : /^## (\S.*)$/u.exec(line);
    if (heading === null) {
      current.push(line);
    } else {
      current = [];
      sections.push({ title: heading[1].trim(), lines: current });
    }
  }

  return {
    body: body.join('\n').trim(),
    sections: sections.map(({ title, lines }) => ({
      title,
      file: `${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-|-$/gu, '')}.md`,
      text: lines.join('\n').trim(),
    })),
  };
}

// The index annotates a link with the first sentence of the guidance it
// points at: a verbatim prefix, never a second wording (Art. I). A sentence
// ends at a period followed by a capitalized word; "e.g." and "i.e." do not
// end one, and a text with no such period is its own first sentence.
function firstSentence(value) {
  const text = oneLine(value);
  const end = /(?<!\b(?:e\.g|i\.e))\.(?=\s+[A-Z])/u.exec(text);
  return end === null ? text : text.slice(0, end.index + 1);
}

/**
 * Validates the hand-written GenUI surface source (docs/genui-surfaces.json)
 * against the real packages before anything renders into the repository
 * surfaces (the root llms.txt, llms-full.txt and llms/ guides; Art. I: the
 * artifacts stay generated, only their sources are hand-written).
 * `packages` carries one loaded entry per genUi package, aligned by
 * directory: { directory, packageJson, indexSource }.
 */
export function validateGenUiSurfaces(genUi, packages) {
  const violations = [];
  const sources = new Map(packages.map((entry) => [entry.directory, entry]));

  if (!Array.isArray(genUi.packages) || genUi.packages.length === 0) {
    return ['genui-surfaces: packages must be a non-empty array'];
  }

  for (const entry of genUi.packages) {
    const directory = entry.directory ?? '<unknown>';
    const source = sources.get(entry.directory);
    if (source === undefined) {
      violations.push(`${directory}: package sources were not loaded`);
      continue;
    }
    if (isBlank(source.packageJson?.name)) {
      violations.push(`${directory}: package.json name is empty`);
    }
    if (isBlank(source.packageJson?.description)) {
      violations.push(`${directory}: package.json description is empty`);
    }
    for (const tagName of ['whenToUse', 'whenNotToUse']) {
      if (isBlank(entry[tagName])) {
        violations.push(`${directory}: missing ${tagName} guidance`);
      }
    }
    if (!Array.isArray(entry.entryPoints) || entry.entryPoints.length === 0) {
      violations.push(`${directory}: entry points are empty`);
      continue;
    }
    for (const entryPoint of entry.entryPoints) {
      if (isBlank(entryPoint.name)) {
        violations.push(`${directory}: entry point has no name`);
        continue;
      }
      if (isBlank(entryPoint.summary)) {
        violations.push(`${directory}.${entryPoint.name}: entry point summary is empty`);
      }
      // Identifier presence in the package entry module: src/index.ts is
      // (by repo convention) a pure re-export surface, so a documented symbol
      // that no longer appears there was renamed or removed — fail loudly
      // instead of shipping a stale agent surface. Exact-identifier matching
      // via a literal tokenizer (no dynamic RegExp: semgrep ReDoS rule).
      const exportedIdentifiers = new Set(source.indexSource.match(/[$\w]+/gu) ?? []);
      if (!exportedIdentifiers.has(entryPoint.name)) {
        violations.push(
          `${directory}.${entryPoint.name}: entry point is not exported from src/index.ts`,
        );
      }
    }
  }

  return violations;
}

/**
 * The GenUI layer section appended to the ROOT llms-full.txt only: the
 * surfaces shipped inside the @kimen/elements tarball stay elements-only,
 * because the GenUI packages are separate packages that are not in it.
 */
export function buildGenUiSection(genUi, packages) {
  const sources = new Map(packages.map((entry) => [entry.directory, entry]));
  const lines = [GENUI_FULL_HEADING, '', (genUi.intro ?? []).join('\n')];

  for (const entry of genUi.packages ?? []) {
    const { packageJson } = sources.get(entry.directory);
    lines.push(
      '',
      `### ${packageJson.name}`,
      '',
      oneLine(packageJson.description),
      '',
      `When to use: ${oneLine(entry.whenToUse ?? '')}`,
      `When NOT to use: ${oneLine(entry.whenNotToUse ?? '')}`,
      '',
      renderList('Entry points', genUiEntryPoints(entry)),
    );
  }

  return `${lines.join('\n')}\n`;
}

/**
 * The root llms-full.txt: the full elements summary first (unchanged bytes),
 * then the GenUI layer section separated by a blank line.
 */
export function buildRootLlmsTxt(llmsTxt, genUiSection) {
  return `${llmsTxt}\n${genUiSection}`;
}

function cssPropertiesFor(component, inputs) {
  if (inputs.cssPropertiesByTag !== undefined) {
    return (inputs.cssPropertiesByTag[component.tag] ?? []).map((style) => {
      const defaults = inputs.tokenDefaults?.get(style.name);
      if (inputs.tokenDefaults && !defaults) {
        throw new Error(`${component.tag}: ${style.name} has no default in the built token sheets`);
      }
      return { name: style.name, description: style.description ?? '', ...defaults };
    });
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

// A component that re-dispatches a native DOM event from its host (the form
// controls' composed `change`) declares it with an `@event <name> - <text>`
// JSDoc tag on the component class: Stencil's docs-json records only
// `@Event()` emitters, so the tag is the contract's single source for the
// native event, and the manifest, llms.txt and catalog derive from it (Art. I).
const NATIVE_EVENT_TAG = /^([a-z][a-z0-9-]*)\s+-\s+(\S[\s\S]*)$/u;

function parseNativeEventTag(text) {
  const match = NATIVE_EVENT_TAG.exec(text.trim());
  return match === null ? null : { name: match[1], description: match[2] };
}

function nativeEventsFor(component) {
  return (component.docsTags ?? [])
    .filter((docsTag) => docsTag.name === 'event' && !isBlank(docsTag.text))
    .map((docsTag) => parseNativeEventTag(docsTag.text))
    .filter((event) => event !== null);
}

// A named slot the component fills itself (ki-tabs stamps `slot="tab"` on
// its ki-tab children) is coordination, not API (spec 014). It is declared
// with `@managedSlot <name> - <reason>` so it is excluded on purpose: an
// undeclared slot without `@slot` documentation still fails the build.
const MANAGED_SLOT_TAG = /^([a-z][a-z0-9-]*)\s+-\s+(\S[\s\S]*)$/u;

function parseManagedSlotTag(text) {
  const match = MANAGED_SLOT_TAG.exec(text.trim());
  return match === null ? null : { name: match[1], reason: match[2] };
}

function managedSlotsFor(component) {
  return (component.docsTags ?? [])
    .filter((docsTag) => docsTag.name === 'managedSlot' && !isBlank(docsTag.text))
    .map((docsTag) => parseManagedSlotTag(docsTag.text))
    .filter((slot) => slot !== null);
}

// A prop declared with `!` in the component class is required by contract;
// Stencil's docs-json records it as `required: true`. The manifest carries
// the flag only when set (a Kimen extension field, like whenToUse), so the
// catalog can reject a spec that omits the prop (spec 027 S15/S16) without a
// second analysis pass over component source (Art. I).
function requiredFlag(prop) {
  return prop.required === true ? true : undefined;
}

// @deprecatedValue keeps the literal in the component contract while the
// catalog omits it from the enum offered to new authors.
function deprecatedValues(prop) {
  const values = (prop.docsTags ?? [])
    .filter((docsTag) => docsTag.name === 'deprecatedValue')
    .map((docsTag) => docsTag.text?.trim() ?? '');
  return values.length === 0 ? undefined : values;
}

// A number prop declares its inclusive bounds with `@minimum <n>` and
// `@maximum <n>` JSDoc tags on the prop itself: Stencil's docs-json carries
// every prop tag verbatim, so the bound sits beside the type it constrains
// and the manifest, the catalog and the emitter schema derive from that one
// declaration (Art. I). A malformed tag fails the build (validateDocs);
// the manifest carries the bound as a number, only when declared.
const BOUND_TAGS = ['minimum', 'maximum'];
const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/u;

function boundTags(prop, name) {
  return (prop.docsTags ?? []).filter((docsTag) => docsTag.name === name);
}

function parseBound(text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  return PLAIN_DECIMAL.test(trimmed) ? Number(trimmed) : null;
}

// The one scalar type a prop declares, ignoring the `undefined` an optional
// prop adds; null for a union of several types.
function soleType(prop) {
  const parts = String(prop.type ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== 'undefined');
  return parts.length === 1 ? parts[0] : null;
}

function numericBounds(prop) {
  const bounds = {};
  for (const name of BOUND_TAGS) {
    const value = parseBound(boundTags(prop, name)[0]?.text);
    if (value !== null) {
      bounds[name] = value;
    }
  }
  return bounds;
}

function boundViolations(tag, prop) {
  const subject = `${tag}.${prop.name}`;
  const violations = [];
  for (const name of BOUND_TAGS) {
    const tags = boundTags(prop, name);
    if (tags.length === 0) {
      continue;
    }
    if (tags.length > 1) {
      violations.push(`${subject}: @${name} is declared more than once`);
    } else if (soleType(prop) !== 'number') {
      violations.push(`${subject}: @${name} applies to number props only`);
    } else if (parseBound(tags[0].text) === null) {
      violations.push(
        `${subject}: @${name} must be a finite number, received ${JSON.stringify(tags[0].text ?? '')}`,
      );
    }
  }
  const { minimum, maximum } = numericBounds(prop);
  if (
    violations.length === 0 &&
    minimum !== undefined &&
    maximum !== undefined &&
    minimum > maximum
  ) {
    violations.push(`${subject}: @minimum ${String(minimum)} is above @maximum ${String(maximum)}`);
  }
  return violations;
}

// A string prop the browser may load or navigate to declares it with
// `@format url` on the prop: the catalog then holds its value to the URL
// policy (scheme allowlist, allowed origins) because the contract says so,
// not because of what the prop happens to be called (spec 027 FR-018).
// A string prop that names another element by id declares `@format idref`:
// the catalog then resolves it only to a node of the same spec (spec 152).
// A string prop named like a URL attribute that is never a URL declares
// `@format text`, which keeps it out of the URL policy (spec 154).
// `url`, `idref` and `text` are the only formats; anything else fails the build.
const PROP_FORMATS = new Set(['url', 'idref', 'text']);

function formatTags(prop) {
  return (prop.docsTags ?? []).filter((docsTag) => docsTag.name === 'format');
}

function propFormat(prop) {
  const [tag] = formatTags(prop);
  const format = tag === undefined ? '' : String(tag.text ?? '').trim();
  return PROP_FORMATS.has(format) ? format : undefined;
}

function formatViolations(tag, prop) {
  const subject = `${tag}.${prop.name}`;
  const tags = formatTags(prop);
  if (tags.length === 0) {
    return [];
  }
  if (tags.length > 1) {
    return [`${subject}: @format is declared more than once`];
  }
  const format = propFormat(prop);
  if (format === undefined) {
    return [
      `${subject}: @format must be "url", "idref" or "text", received ${JSON.stringify(tags[0].text ?? '')}`,
    ];
  }
  return soleType(prop) === 'string'
    ? []
    : [`${subject}: @format ${format} applies to string props only`];
}

// An observed attribute may deserialize text to a richer property value.
// Document the attribute's string type while preserving its property type.
function attributeTypeTags(prop) {
  return (prop.docsTags ?? []).filter((tag) => tag.name === 'attributeType');
}

function attributeType(prop) {
  return attributeTypeTags(prop).length > 0 ? 'string' : prop.type;
}

function attributeTypeViolations(tag, prop) {
  const tags = attributeTypeTags(prop);
  if (tags.length === 0) return [];
  const subject = `${tag}.${prop.name}`;
  if (!prop.attr || tags.length !== 1 || tags[0].text?.trim() !== 'string') {
    return [`${subject}: expected one @attributeType string on an observed attribute`];
  }
  return [];
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

// Stencil docs-json carries each component's usage/*.md files verbatim in
// `usage`. They render under an Examples label, sorted by file name with
// codepoint order (locale-independent, so artifacts stay byte-identical
// across machines). scripts/consumer-contract.mjs runs the executable (ts/js)
// fences of the packaged llms.txt on release; since that file became an index
// it carries the preamble's fences only, and the usage examples here reach
// the component documents and the site's llms-full.txt, which that contract does not
// read (specs/017-agent-surfaces/research.md D13).
function usageText(component) {
  const entries = Object.entries(component.usage ?? {})
    .filter(([, text]) => typeof text === 'string' && text.trim().length > 0)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  if (entries.length === 0) {
    return null;
  }

  return entries.map(([, text]) => text.trim()).join('\n\n');
}

function renderList(label, entries) {
  if (entries.length === 0) {
    return `${label}: none`;
  }

  return `${label}:\n${entries.map((entry) => `- ${entry}`).join('\n')}`;
}

// An attribute line states what the contract declares beyond the type, in
// the words the catalog enforces: `required`, the inclusive `minimum` /
// `maximum` of a number, and `URL` for a value the URL policy governs.
function renderAttribute(prop) {
  const { minimum, maximum } = numericBounds(prop);
  const facts = [
    attributeType(prop),
    ...(requiredFlag(prop) === true ? ['required'] : []),
    ...(prop.default === undefined ? [] : [`default ${prop.default}`]),
    ...(minimum === undefined ? [] : [`minimum ${String(minimum)}`]),
    ...(maximum === undefined ? [] : [`maximum ${String(maximum)}`]),
    ...(propFormat(prop) === 'url' ? ['URL'] : []),
    ...(propFormat(prop) === 'idref' ? ['ID of another element of the same spec'] : []),
  ];
  return `\`${prop.attr}\` (${facts.join(', ')}): ${oneLine(prop.docs ?? '')}`;
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
