import { isDeepStrictEqual } from 'node:util';

import { canonicalJson, canonicalJsonSha256 } from './canonical-json.mjs';

const RELEASE_RANK = Object.freeze({ patch: 0, minor: 1, major: 2 });
const SNAPSHOT_SCHEMA_VERSION = 1;
const ELEMENTS_PACKAGE = '@kimen/elements';
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PACKAGE_KEYS = new Set([
  'version',
  'exports',
  'modules',
  'components',
  'rootSymbols',
  'tokens',
  'stylesheets',
]);
const COMPONENT_FACETS = new Set([
  'properties',
  'attributes',
  'events',
  'methods',
  'slots',
  'parts',
  'cssProperties',
]);

function assertRecord(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function assertNullableString(value, label) {
  if (value !== null && (typeof value !== 'string' || value.trim() === '')) {
    throw new TypeError(`${label} must be null or a non-empty string`);
  }
}

function parseSemver(value, label) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a semantic version`);
  }
  const match = SEMVER_PATTERN.exec(value);
  if (!match) {
    throw new TypeError(`${label} must be a semantic version`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

function exportTarget(entry, label) {
  const record = assertRecord(entry, label);
  if (typeof record.target !== 'string' || record.target.trim() === '') {
    throw new TypeError(`${label}.target must be a non-empty string`);
  }
  if (!Object.hasOwn(record, 'deprecatedSince') || !Object.hasOwn(record, 'replacement')) {
    throw new TypeError(`${label} must carry deprecatedSince and replacement metadata`);
  }
  assertNullableString(record.deprecatedSince, `${label}.deprecatedSince`);
  assertNullableString(record.replacement, `${label}.replacement`);
  if (record.deprecatedSince !== null) {
    parseSemver(record.deprecatedSince, `${label}.deprecatedSince`);
  }
  return record.target;
}

function matchExportPattern(exports, publicSubpath) {
  const matches = [];
  for (const [key, entry] of Object.entries(exports)) {
    const firstStar = key.indexOf('*');
    if (firstStar === -1 || firstStar !== key.lastIndexOf('*')) continue;
    const prefix = key.slice(0, firstStar);
    const suffix = key.slice(firstStar + 1);
    if (!publicSubpath.startsWith(prefix) || !publicSubpath.endsWith(suffix)) continue;
    const matched = publicSubpath.slice(prefix.length, publicSubpath.length - suffix.length);
    if (matched === '') continue;
    const target = exportTarget(entry, `export ${key}`);
    if (target.indexOf('*') === -1 || target.indexOf('*') !== target.lastIndexOf('*')) continue;
    const wildcardIndex = target.indexOf('*');
    matches.push({
      key,
      target: `${target.slice(0, wildcardIndex)}${matched}${target.slice(wildcardIndex + 1)}`,
      specificity: prefix.length + suffix.length,
    });
  }
  matches.sort(
    (left, right) => right.specificity - left.specificity || left.key.localeCompare(right.key),
  );
  return matches[0]?.target ?? null;
}

function resolveExportTarget(exports, publicSubpath) {
  if (Object.hasOwn(exports, publicSubpath)) {
    return exportTarget(exports[publicSubpath], `export ${publicSubpath}`);
  }
  return matchExportPattern(exports, publicSubpath);
}

function validateRootSymbols(packageName, packageSurface) {
  const exports = assertRecord(packageSurface.exports, `${packageName}.exports`);
  for (const [subpath, entry] of Object.entries(exports)) {
    exportTarget(entry, `${packageName}.exports.${subpath}`);
  }

  const rootSymbols = packageSurface.rootSymbols ?? {};
  assertRecord(rootSymbols, `${packageName}.rootSymbols`);
  for (const [symbol, value] of Object.entries(rootSymbols)) {
    const entry = assertRecord(value, `${packageName}.rootSymbols.${symbol}`);
    if (typeof entry.target !== 'string' || entry.target.trim() === '') {
      throw new TypeError(`${symbol} target must be a non-empty string`);
    }
    if (typeof entry.deprecatedSince !== 'string' || entry.deprecatedSince.trim() === '') {
      throw new TypeError(`${symbol} must be deprecated with deprecatedSince metadata`);
    }
    parseSemver(entry.deprecatedSince, `${symbol}.deprecatedSince`);
    if (typeof entry.replacement !== 'string' || entry.replacement.trim() === '') {
      throw new TypeError(`${symbol} must name a direct-subpath replacement`);
    }

    const packagePrefix = `${packageName}/`;
    if (!entry.replacement.startsWith(packagePrefix)) {
      throw new TypeError(`${symbol} replacement must be a direct ${packageName} subpath export`);
    }
    const replacementSuffix = entry.replacement.slice(packagePrefix.length);
    const segments = replacementSuffix.split('/');
    if (
      replacementSuffix === '' ||
      replacementSuffix.includes('*') ||
      segments.some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      throw new TypeError(`${symbol} replacement must be a concrete direct subpath export`);
    }
    const publicSubpath = `./${replacementSuffix}`;
    const resolvedTarget = resolveExportTarget(exports, publicSubpath);
    const targetAlreadyExported = Object.entries(exports).some(
      ([subpath, exportEntry]) =>
        !subpath.includes('*') && exportTarget(exportEntry, `export ${subpath}`) === entry.target,
    );
    if (resolvedTarget !== null && resolvedTarget !== entry.target) {
      throw new TypeError(
        `${symbol} replacement ${entry.replacement} must resolve to its declared export target`,
      );
    }
    if (resolvedTarget === null && targetAlreadyExported) {
      throw new TypeError(
        `${symbol} replacement ${entry.replacement} does not name the export for its target`,
      );
    }
  }
}

function validateModules(packageName, packageSurface) {
  if (packageSurface.modules === undefined) return;
  const modules = assertRecord(packageSurface.modules, `${packageName}.modules`);
  for (const [subpath, value] of Object.entries(modules)) {
    const module = assertRecord(value, `${packageName}.modules.${subpath}`);
    if (typeof module.target !== 'string' || module.target.trim() === '') {
      throw new TypeError(`${packageName}.modules.${subpath}.target must be a non-empty string`);
    }
    if (module.declaration !== null && typeof module.declaration !== 'string') {
      throw new TypeError(`${packageName}.modules.${subpath}.declaration must be null or a string`);
    }
    const symbols = assertRecord(module.symbols, `${packageName}.modules.${subpath}.symbols`);
    for (const [symbolName, symbolValue] of Object.entries(symbols)) {
      const symbol = assertRecord(
        symbolValue,
        `${packageName}.modules.${subpath}.symbols.${symbolName}`,
      );
      if (!Array.isArray(symbol.kinds) || symbol.kinds.length === 0) {
        throw new TypeError(
          `${packageName}.modules.${subpath}.${symbolName}.kinds must be an array`,
        );
      }
      if (typeof symbol.signature !== 'string' || symbol.signature.trim() === '') {
        throw new TypeError(
          `${packageName}.modules.${subpath}.${symbolName}.signature must be non-empty`,
        );
      }
    }
  }
}

function validateStylesheets(packageName, packageSurface) {
  if (packageSurface.stylesheets === undefined) return;
  const stylesheets = assertRecord(packageSurface.stylesheets, `${packageName}.stylesheets`);
  for (const [subpath, value] of Object.entries(stylesheets)) {
    const stylesheet = assertRecord(value, `${packageName}.stylesheets.${subpath}`);
    if (typeof stylesheet.target !== 'string' || stylesheet.target.trim() === '') {
      throw new TypeError(`${packageName}.stylesheets.${subpath}.target must be non-empty`);
    }
    const exportedTarget = resolveExportTarget(packageSurface.exports, subpath);
    if (exportedTarget !== stylesheet.target) {
      throw new TypeError(
        `${packageName}.stylesheets.${subpath}.target must match its public export`,
      );
    }
    const contexts = assertRecord(
      stylesheet.contexts,
      `${packageName}.stylesheets.${subpath}.contexts`,
    );
    if (Object.keys(contexts).length === 0) {
      throw new TypeError(`${packageName}.stylesheets.${subpath}.contexts must not be empty`);
    }
    for (const [contextName, values] of Object.entries(contexts)) {
      if (contextName.trim() === '') {
        throw new TypeError(
          `${packageName}.stylesheets.${subpath} context names must be non-empty`,
        );
      }
      const tokens = assertRecord(
        values,
        `${packageName}.stylesheets.${subpath}.contexts.${contextName}`,
      );
      for (const [tokenName, tokenValue] of Object.entries(tokens)) {
        if (!/^--ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(tokenName)) {
          throw new TypeError(
            `${packageName}.stylesheets.${subpath} has invalid token ${tokenName}`,
          );
        }
        if (typeof tokenValue !== 'string' || tokenValue.trim() === '') {
          throw new TypeError(
            `${packageName}.stylesheets.${subpath}.${contextName}.${tokenName} must be non-empty`,
          );
        }
      }
    }
  }
}

function validateSurface(surface, label = 'surface') {
  const record = assertRecord(surface, label);
  const packages = assertRecord(record.packages, `${label}.packages`);
  if (!Array.isArray(record.browserBaseline)) {
    throw new TypeError(`${label}.browserBaseline must be an array`);
  }
  const browsers = new Set();
  for (const browser of record.browserBaseline) {
    if (typeof browser !== 'string' || browser.trim() === '') {
      throw new TypeError(`${label}.browserBaseline entries must be non-empty strings`);
    }
    if (browsers.has(browser)) {
      throw new TypeError(`${label}.browserBaseline must not contain duplicate ${browser}`);
    }
    browsers.add(browser);
  }

  for (const [packageName, value] of Object.entries(packages)) {
    const packageSurface = assertRecord(value, `${label}.packages.${packageName}`);
    parseSemver(packageSurface.version, `${packageName}.version`);
    validateRootSymbols(packageName, packageSurface);
    validateModules(packageName, packageSurface);
    validateStylesheets(packageName, packageSurface);
    if (packageSurface.components !== undefined) {
      assertRecord(packageSurface.components, `${packageName}.components`);
    }
    if (packageSurface.tokens !== undefined) {
      assertRecord(packageSurface.tokens, `${packageName}.tokens`);
    }
  }
  return record;
}

function normalizeSurface(surface) {
  const normalized = JSON.parse(canonicalJson(surface));
  validateSurface(normalized);
  normalized.browserBaseline.sort((left, right) => left.localeCompare(right));
  return JSON.parse(canonicalJson(normalized));
}

function validateSnapshot(snapshot, label) {
  const record = assertRecord(snapshot, `${label} snapshot`);
  if (record.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new TypeError(`${label} snapshot schemaVersion must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  validateSurface(record.surface, `${label} surface`);
  if (typeof record.surfaceSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.surfaceSha256)) {
    throw new TypeError(`${label} surfaceSha256 digest must be 64 lowercase hexadecimal digits`);
  }
  if (canonicalJsonSha256(record.surface) !== record.surfaceSha256) {
    throw new Error(`${label} surfaceSha256 digest does not match its canonical surface`);
  }
  return record;
}

function changedUnknownKeys(before, after, knownKeys, path, addChange, packageName = null) {
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!knownKeys.has(key) && !isDeepStrictEqual(before[key], after[key])) {
      addChange('major', `${path}.${key}`, 'unknown', packageName);
    }
  }
}

function simpleUnion(type) {
  if (typeof type !== 'string') return null;
  const members = type.split('|').map((member) => member.trim());
  if (
    members.some(
      (member) =>
        member === '' ||
        !/^(?:'[^']*'|"[^"]*"|-?(?:0|[1-9]\d*)(?:\.\d+)?|true|false|null|undefined|[A-Za-z_$][\w$]*)$/.test(
          member,
        ),
    )
  ) {
    return null;
  }
  return new Set(members);
}

function classifyTypeChange(before, after) {
  const beforeMembers = simpleUnion(before);
  const afterMembers = simpleUnion(after);
  if (beforeMembers && afterMembers) {
    const beforeInAfter = [...beforeMembers].every((member) => afterMembers.has(member));
    const afterInBefore = [...afterMembers].every((member) => beforeMembers.has(member));
    if (beforeInAfter && afterInBefore) return 'patch';
    if (beforeInAfter) return 'minor';
  }
  return 'major';
}

function compareEntry(
  before,
  after,
  path,
  addChange,
  packageName,
  { ignoreTypeDefault = false } = {},
) {
  const knownKeys = new Set([
    'type',
    'default',
    'required',
    'description',
    'deprecatedSince',
    'replacement',
    'target',
    'signature',
    'parameters',
  ]);
  if (!isDeepStrictEqual(before.description, after.description)) {
    addChange('patch', `${path}.description`, 'documentation', packageName);
  }
  if (!ignoreTypeDefault && !isDeepStrictEqual(before.type, after.type)) {
    addChange(classifyTypeChange(before.type, after.type), `${path}.type`, 'type', packageName);
  }
  if (!ignoreTypeDefault && !isDeepStrictEqual(before.default, after.default)) {
    addChange('major', `${path}.default`, 'default', packageName);
  }
  if (!isDeepStrictEqual(before.required, after.required)) {
    addChange(
      before.required === true && after.required === false ? 'minor' : 'major',
      `${path}.required`,
      'requiredness',
      packageName,
    );
  }
  if (!isDeepStrictEqual(before.target, after.target)) {
    addChange('major', `${path}.target`, 'target', packageName);
  }
  for (const contractKey of ['signature', 'parameters']) {
    if (isDeepStrictEqual(before[contractKey], after[contractKey])) continue;
    const enriched = before[contractKey] === undefined && after[contractKey] !== undefined;
    addChange(
      enriched ? 'patch' : 'major',
      `${path}.${contractKey}`,
      enriched ? 'contract-enrichment' : 'signature',
      packageName,
    );
  }
  for (const metadata of ['deprecatedSince', 'replacement']) {
    if (isDeepStrictEqual(before[metadata], after[metadata])) continue;
    const introduced =
      (before[metadata] === null || before[metadata] === undefined) &&
      typeof after[metadata] === 'string' &&
      after[metadata].trim() !== '';
    addChange(introduced ? 'minor' : 'major', `${path}.${metadata}`, 'deprecation', packageName);
  }
  changedUnknownKeys(before, after, knownKeys, path, addChange, packageName);
}

function compareEntryMap(before, after, path, packageName, addChange, removals, options = {}) {
  const beforeMap = assertRecord(before ?? {}, `${path} baseline`);
  const afterMap = assertRecord(after ?? {}, `${path} candidate`);
  for (const key of new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)])) {
    const entryPath = `${path}.${key}`;
    if (!Object.hasOwn(afterMap, key)) {
      addChange('major', entryPath, 'removed', packageName);
      removals.push({ path: entryPath, packageName, entry: beforeMap[key] });
    } else if (!Object.hasOwn(beforeMap, key)) {
      const entry = assertRecord(afterMap[key], `${entryPath} candidate`);
      addChange(entry.required === true ? 'major' : 'minor', entryPath, 'added', packageName);
    } else {
      compareEntry(
        assertRecord(beforeMap[key], `${entryPath} baseline`),
        assertRecord(afterMap[key], `${entryPath} candidate`),
        entryPath,
        addChange,
        packageName,
        options,
      );
    }
  }
}

function compareComponents(before, after, path, packageName, addChange, removals) {
  const beforeComponents = assertRecord(before ?? {}, `${path} baseline`);
  const afterComponents = assertRecord(after ?? {}, `${path} candidate`);
  for (const tag of new Set([...Object.keys(beforeComponents), ...Object.keys(afterComponents)])) {
    const componentPath = `${path}.${tag}`;
    if (!Object.hasOwn(afterComponents, tag)) {
      addChange('major', componentPath, 'removed', packageName);
      removals.push({ path: componentPath, packageName, entry: beforeComponents[tag] });
      continue;
    }
    if (!Object.hasOwn(beforeComponents, tag)) {
      addChange('minor', componentPath, 'added', packageName);
      continue;
    }
    const beforeComponent = assertRecord(beforeComponents[tag], `${componentPath} baseline`);
    const afterComponent = assertRecord(afterComponents[tag], `${componentPath} candidate`);
    if (!isDeepStrictEqual(beforeComponent.description, afterComponent.description)) {
      addChange('patch', `${componentPath}.description`, 'documentation', packageName);
    }
    for (const facet of COMPONENT_FACETS) {
      compareEntryMap(
        beforeComponent[facet],
        afterComponent[facet],
        `${componentPath}.${facet}`,
        packageName,
        addChange,
        removals,
      );
    }
    changedUnknownKeys(
      beforeComponent,
      afterComponent,
      new Set(['description', ...COMPONENT_FACETS]),
      componentPath,
      addChange,
      packageName,
    );
  }
}

function compareRootSymbols(before, after, path, packageName, addChange, removals, newRootSymbols) {
  const beforeSymbols = assertRecord(before ?? {}, `${path} baseline`);
  const afterSymbols = assertRecord(after ?? {}, `${path} candidate`);
  for (const symbol of new Set([...Object.keys(beforeSymbols), ...Object.keys(afterSymbols)])) {
    const symbolPath = `${path}.${symbol}`;
    if (!Object.hasOwn(afterSymbols, symbol)) {
      addChange('major', symbolPath, 'removed', packageName);
      removals.push({ path: symbolPath, packageName, entry: beforeSymbols[symbol] });
    } else if (!Object.hasOwn(beforeSymbols, symbol)) {
      addChange('major', symbolPath, 'added-root-symbol', packageName);
      newRootSymbols.push(symbolPath);
    } else {
      compareEntry(
        assertRecord(beforeSymbols[symbol], `${symbolPath} baseline`),
        assertRecord(afterSymbols[symbol], `${symbolPath} candidate`),
        symbolPath,
        addChange,
        packageName,
      );
    }
  }
}

function compareModules(before, after, path, packageName, addChange, removals) {
  const beforeModules = assertRecord(before ?? {}, `${path} baseline`);
  const afterModules = assertRecord(after ?? {}, `${path} candidate`);
  for (const subpath of new Set([...Object.keys(beforeModules), ...Object.keys(afterModules)])) {
    const modulePath = `${path}.${subpath}`;
    if (!Object.hasOwn(afterModules, subpath)) {
      addChange('major', modulePath, 'removed', packageName);
      removals.push({ path: modulePath, packageName, entry: beforeModules[subpath] });
      continue;
    }
    if (!Object.hasOwn(beforeModules, subpath)) {
      addChange('minor', modulePath, 'added', packageName);
      continue;
    }
    const beforeModule = assertRecord(beforeModules[subpath], `${modulePath} baseline`);
    const afterModule = assertRecord(afterModules[subpath], `${modulePath} candidate`);
    for (const key of ['target', 'declaration']) {
      if (!isDeepStrictEqual(beforeModule[key], afterModule[key])) {
        addChange('major', `${modulePath}.${key}`, key, packageName);
      }
    }
    const beforeSymbols = assertRecord(
      beforeModule.symbols ?? {},
      `${modulePath}.symbols baseline`,
    );
    const afterSymbols = assertRecord(afterModule.symbols ?? {}, `${modulePath}.symbols candidate`);
    for (const symbol of new Set([...Object.keys(beforeSymbols), ...Object.keys(afterSymbols)])) {
      const symbolPath = `${modulePath}.symbols.${symbol}`;
      if (!Object.hasOwn(afterSymbols, symbol)) {
        addChange('major', symbolPath, 'removed', packageName);
        removals.push({ path: symbolPath, packageName, entry: beforeSymbols[symbol] });
      } else if (!Object.hasOwn(beforeSymbols, symbol)) {
        addChange('minor', symbolPath, 'added', packageName);
      } else if (!isDeepStrictEqual(beforeSymbols[symbol], afterSymbols[symbol])) {
        addChange('major', symbolPath, 'signature', packageName);
      }
    }
    changedUnknownKeys(
      beforeModule,
      afterModule,
      new Set(['target', 'declaration', 'symbols']),
      modulePath,
      addChange,
      packageName,
    );
  }
}

function compareStylesheets(before, after, path, packageName, addChange) {
  const beforeStylesheets = assertRecord(before ?? {}, `${path} baseline`);
  const afterStylesheets = assertRecord(after ?? {}, `${path} candidate`);
  for (const subpath of new Set([
    ...Object.keys(beforeStylesheets),
    ...Object.keys(afterStylesheets),
  ])) {
    const stylesheetPath = `${path}.${subpath}`;
    if (!Object.hasOwn(afterStylesheets, subpath)) {
      addChange('major', stylesheetPath, 'removed', packageName);
      continue;
    }
    if (!Object.hasOwn(beforeStylesheets, subpath)) {
      addChange('minor', stylesheetPath, 'added', packageName);
      continue;
    }
    const beforeStylesheet = assertRecord(beforeStylesheets[subpath], `${stylesheetPath} baseline`);
    const afterStylesheet = assertRecord(afterStylesheets[subpath], `${stylesheetPath} candidate`);
    if (beforeStylesheet.target !== afterStylesheet.target) {
      addChange('major', `${stylesheetPath}.target`, 'target', packageName);
    }
    const beforeContexts = assertRecord(
      beforeStylesheet.contexts,
      `${stylesheetPath}.contexts baseline`,
    );
    const afterContexts = assertRecord(
      afterStylesheet.contexts,
      `${stylesheetPath}.contexts candidate`,
    );
    for (const context of new Set([
      ...Object.keys(beforeContexts),
      ...Object.keys(afterContexts),
    ])) {
      const contextPath = `${stylesheetPath}.contexts.${context}`;
      if (!Object.hasOwn(afterContexts, context)) {
        addChange('major', contextPath, 'removed', packageName);
        continue;
      }
      if (!Object.hasOwn(beforeContexts, context)) {
        addChange('minor', contextPath, 'added', packageName);
        continue;
      }
      const beforeTokens = assertRecord(beforeContexts[context], `${contextPath} baseline`);
      const afterTokens = assertRecord(afterContexts[context], `${contextPath} candidate`);
      for (const token of new Set([...Object.keys(beforeTokens), ...Object.keys(afterTokens)])) {
        const tokenPath = `${contextPath}.${token}`;
        if (!Object.hasOwn(afterTokens, token)) {
          addChange('major', tokenPath, 'removed', packageName);
        } else if (!Object.hasOwn(beforeTokens, token)) {
          addChange('minor', tokenPath, 'added', packageName);
        } else if (beforeTokens[token] !== afterTokens[token]) {
          addChange('major', tokenPath, 'effective-value', packageName);
        }
      }
    }
    changedUnknownKeys(
      beforeStylesheet,
      afterStylesheet,
      new Set(['target', 'contexts']),
      stylesheetPath,
      addChange,
      packageName,
    );
  }
}

function comparePackage(packageName, before, after, addChange, removals, newRootSymbols) {
  const path = `packages.${packageName}`;
  compareEntryMap(
    before.exports,
    after.exports,
    `${path}.exports`,
    packageName,
    addChange,
    removals,
  );
  compareComponents(
    before.components,
    after.components,
    `${path}.components`,
    packageName,
    addChange,
    removals,
  );
  compareModules(
    before.modules,
    after.modules,
    `${path}.modules`,
    packageName,
    addChange,
    removals,
  );
  compareEntryMap(before.tokens, after.tokens, `${path}.tokens`, packageName, addChange, removals, {
    ignoreTypeDefault: before.stylesheets !== undefined && after.stylesheets !== undefined,
  });
  compareStylesheets(
    before.stylesheets,
    after.stylesheets,
    `${path}.stylesheets`,
    packageName,
    addChange,
  );
  compareRootSymbols(
    before.rootSymbols,
    after.rootSymbols,
    `${path}.rootSymbols`,
    packageName,
    addChange,
    removals,
    newRootSymbols,
  );
  changedUnknownKeys(before, after, PACKAGE_KEYS, path, addChange, packageName);
}

function classifySnapshots(baseline, candidate) {
  const changes = [];
  const removals = [];
  const newRootSymbols = [];
  let release = 'patch';
  const addChange = (changeRelease, path, kind, packageName = null) => {
    if (RELEASE_RANK[changeRelease] > RELEASE_RANK[release]) release = changeRelease;
    changes.push({ release: changeRelease, path, kind, packageName });
  };

  const beforeSurface = baseline.surface;
  const afterSurface = candidate.surface;
  const beforeBrowsers = new Set(beforeSurface.browserBaseline);
  const afterBrowsers = new Set(afterSurface.browserBaseline);
  for (const browser of beforeBrowsers) {
    if (!afterBrowsers.has(browser)) {
      addChange('major', `browserBaseline.${browser}`, 'removed', ELEMENTS_PACKAGE);
    }
  }
  for (const browser of afterBrowsers) {
    if (!beforeBrowsers.has(browser)) {
      addChange('minor', `browserBaseline.${browser}`, 'added', ELEMENTS_PACKAGE);
    }
  }

  const beforePackages = beforeSurface.packages;
  const afterPackages = afterSurface.packages;
  for (const packageName of new Set([
    ...Object.keys(beforePackages),
    ...Object.keys(afterPackages),
  ])) {
    if (!Object.hasOwn(afterPackages, packageName)) {
      addChange('major', `packages.${packageName}`, 'removed', packageName);
      removals.push({
        path: `packages.${packageName}`,
        packageName,
        entry: beforePackages[packageName],
      });
    } else if (!Object.hasOwn(beforePackages, packageName)) {
      addChange('minor', `packages.${packageName}`, 'added', packageName);
    } else {
      comparePackage(
        packageName,
        beforePackages[packageName],
        afterPackages[packageName],
        addChange,
        removals,
        newRootSymbols,
      );
    }
  }
  changedUnknownKeys(
    beforeSurface,
    afterSurface,
    new Set(['packages', 'browserBaseline']),
    'surface',
    addChange,
  );
  return { release, changes, removals, newRootSymbols };
}

function validatePackages(packages, label) {
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new TypeError(`${label} packages must be a non-empty array`);
  }
  const unique = new Set();
  for (const packageName of packages) {
    if (typeof packageName !== 'string' || packageName.trim() === '' || unique.has(packageName)) {
      throw new TypeError(`${label} packages must contain unique non-empty package names`);
    }
    unique.add(packageName);
  }
  return [...unique].sort((left, right) => left.localeCompare(right));
}

function validateDeclarationCommon(declaration) {
  const record = assertRecord(declaration, 'API change declaration');
  if (record.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new TypeError(`API change declaration schemaVersion must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  const packages = validatePackages(record.packages, 'API change declaration');
  if (!Object.hasOwn(RELEASE_RANK, record.release)) {
    throw new TypeError('API change declaration release must be patch, minor, or major');
  }
  if (typeof record.reason !== 'string' || record.reason.trim() === '') {
    throw new TypeError('API change declaration reason must be non-empty');
  }
  return { record, packages };
}

function changedPackages(classification) {
  const affected = new Set();
  for (const change of classification.changes) {
    if (typeof change.packageName === 'string') affected.add(change.packageName);
  }
  return [...affected].sort((left, right) => left.localeCompare(right));
}

function validateBoundDeclaration(declaration, baseline, candidate, classification) {
  const { record, packages } = validateDeclarationCommon(declaration);
  if (record.firstRelease === true) {
    throw new TypeError('first-release declaration cannot be used with a baseline');
  }
  if (record.baselineSha256 !== baseline.surfaceSha256) {
    throw new Error('API change declaration baseline digest is stale');
  }
  if (record.candidateSha256 !== candidate.surfaceSha256) {
    throw new Error('API change declaration candidate digest is stale');
  }
  for (const packageName of packages) {
    const baselinePackage = baseline.surface.packages[packageName];
    const candidatePackage = candidate.surface.packages[packageName];
    if (!baselinePackage || !candidatePackage) {
      throw new Error(`API change declaration package ${packageName} is absent from a snapshot`);
    }
    if (record.baselineVersion !== baselinePackage.version) {
      throw new Error(`API change declaration baseline version is stale for ${packageName}`);
    }
  }
  const affectedPackages = changedPackages(classification);
  if (!isDeepStrictEqual(packages, affectedPackages)) {
    throw new Error(
      `API change declaration packages must exactly match changed packages: ${affectedPackages.join(', ')}`,
    );
  }
  return record;
}

function validateFirstReleaseDeclaration(declaration, candidate) {
  if (!declaration) {
    throw new Error('A missing baseline requires an explicit first-release declaration');
  }
  const { record, packages } = validateDeclarationCommon(declaration);
  if (record.firstRelease !== true) {
    throw new Error('A missing baseline requires firstRelease: true');
  }
  if (record.baselineVersion !== null || record.baselineSha256 !== null) {
    throw new Error('A first-release declaration must have a null baseline version and digest');
  }
  if (record.candidateSha256 !== candidate.surfaceSha256) {
    throw new Error('First-release declaration candidate digest is stale');
  }
  const candidatePackages = Object.keys(candidate.surface.packages).sort((left, right) =>
    left.localeCompare(right),
  );
  if (!isDeepStrictEqual(packages, candidatePackages)) {
    throw new Error('First-release declaration must name every candidate package exactly');
  }
  if (record.release !== 'minor') {
    throw new Error('First-release declaration must classify the initial surface as minor');
  }
  return record;
}

function deprecationIsAtLeastOneMinorOld(deprecatedSince, baselineVersion) {
  const deprecated = parseSemver(deprecatedSince, 'removed API deprecatedSince');
  const baseline = parseSemver(baselineVersion, 'removed API baseline version');
  return (
    baseline.major > deprecated.major ||
    (baseline.major === deprecated.major && baseline.minor > deprecated.minor)
  );
}

function removalReason(removal, baseline) {
  const entry = removal.entry;
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return `${removal.path} was removed without deprecation and replacement metadata`;
  }
  if (typeof entry.deprecatedSince !== 'string' || entry.deprecatedSince.trim() === '') {
    return `${removal.path} was removed without prior deprecation metadata`;
  }
  if (typeof entry.replacement !== 'string' || entry.replacement.trim() === '') {
    return `${removal.path} was removed without replacement metadata`;
  }
  const baselineVersion = baseline.surface.packages[removal.packageName]?.version;
  if (
    !baselineVersion ||
    !deprecationIsAtLeastOneMinorOld(entry.deprecatedSince, baselineVersion)
  ) {
    return `${removal.path} deprecation must ship for at least one prior minor before removal`;
  }
  return null;
}

/** Create the v1 canonical, digest-bearing public API envelope. */
export function createPublicApiSnapshot(surface) {
  const normalizedSurface = normalizeSurface(surface);
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    surface: normalizedSurface,
    surfaceSha256: canonicalJsonSha256(normalizedSurface),
  };
}

/** Classify a digest-valid candidate relative to a digest-valid baseline. */
export function classifyPublicApiChange({ baseline, candidate }) {
  const validBaseline = validateSnapshot(baseline, 'baseline');
  const validCandidate = validateSnapshot(candidate, 'candidate');
  return classifySnapshots(validBaseline, validCandidate);
}

/** Bind a declaration to both snapshots and decide whether the candidate may proceed. */
export function evaluatePublicApiChange({ baseline, candidate, declaration }) {
  const validCandidate = validateSnapshot(candidate, 'candidate');
  if (baseline === null) {
    validateFirstReleaseDeclaration(declaration, validCandidate);
    return { release: 'minor', decision: 'passed', reasons: [], changes: [] };
  }

  const validBaseline = validateSnapshot(baseline, 'baseline');
  const classification = classifySnapshots(validBaseline, validCandidate);
  const validDeclaration = declaration
    ? validateBoundDeclaration(declaration, validBaseline, validCandidate, classification)
    : null;
  const reasons = [];

  if (!validDeclaration && classification.release === 'major') {
    reasons.push('A breaking public API change requires a digest-bound MAJOR declaration');
  } else if (
    validDeclaration &&
    RELEASE_RANK[validDeclaration.release] < RELEASE_RANK[classification.release]
  ) {
    reasons.push(
      `Declared ${validDeclaration.release} is lower than actual ${classification.release}`,
    );
  }
  for (const path of classification.newRootSymbols) {
    reasons.push(`${path} is a new symbol in the frozen legacy root barrel`);
  }
  if (validDeclaration?.release === 'major') {
    for (const removal of classification.removals) {
      const reason = removalReason(removal, validBaseline);
      if (reason) reasons.push(reason);
    }
  }
  for (const change of classification.changes) {
    if (change.packageName === null) {
      reasons.push(`${change.path} is an unknown global or unowned public-surface change`);
    }
  }

  return {
    ...classification,
    decision: reasons.length === 0 ? 'passed' : 'blocked',
    reasons,
  };
}
