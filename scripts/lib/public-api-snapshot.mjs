import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import { buildPublicStylesheetSurface } from './css-token-surface.mjs';
import { createPublicApiSnapshot } from './public-api.mjs';

const ELEMENTS_PACKAGE = '@kimen/elements';
const TOKENS_PACKAGE = '@kimen/tokens';
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const assertRecord = (value, label) => {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
};

const nonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
};

const runtimeExportTarget = (entry, label) => {
  if (typeof entry === 'string') {
    return nonEmptyString(entry, `${label} target`);
  }
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      try {
        return runtimeExportTarget(candidate, label);
      } catch {
        // Conditional export arrays fall through to their next candidate.
      }
    }
    throw new TypeError(`${label} has no runtime target`);
  }
  const record = assertRecord(entry, label);
  for (const condition of ['import', 'browser', 'default', 'node']) {
    if (Object.hasOwn(record, condition)) {
      return runtimeExportTarget(record[condition], `${label}.${condition}`);
    }
  }
  throw new TypeError(`${label} has no import, browser, default, or node runtime target`);
};

const directTarget = (entry, label) => {
  if (typeof entry === 'string') return nonEmptyString(entry, `${label} target`);
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      try {
        return directTarget(candidate, label);
      } catch {
        // Conditional target arrays fall through to their next candidate.
      }
    }
    throw new TypeError(`${label} has no string target`);
  }
  const record = assertRecord(entry, label);
  for (const condition of ['types', 'import', 'browser', 'default', 'node']) {
    if (Object.hasOwn(record, condition)) {
      return directTarget(record[condition], `${label}.${condition}`);
    }
  }
  throw new TypeError(`${label} has no string target`);
};

const typesExportTarget = (entry, label) => {
  if (typeof entry === 'string') return null;
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      const target = typesExportTarget(candidate, label);
      if (target !== null) return target;
    }
    return null;
  }
  const record = assertRecord(entry, label);
  if (Object.hasOwn(record, 'types')) {
    return directTarget(record.types, `${label}.types`);
  }
  for (const condition of ['import', 'browser', 'default', 'node']) {
    if (!Object.hasOwn(record, condition)) continue;
    const target = typesExportTarget(record[condition], `${label}.${condition}`);
    if (target !== null) return target;
  }
  return null;
};

const publicExport = (target) => ({
  target,
  deprecatedSince: null,
  replacement: null,
});

const publicFacet = (
  { type = null, defaultValue = null, required = false, description },
  label,
) => {
  if (type !== null) {
    nonEmptyString(type, `${label} type`);
  }
  nonEmptyString(description, `${label} description`);
  return {
    type,
    default: defaultValue,
    required,
    description,
    deprecatedSince: null,
    replacement: null,
  };
};

const sortedObject = (entries, label, { allowEmptyKey = false } = {}) => {
  const result = {};
  for (const [key, value] of [...entries].sort(([left], [right]) => compareText(left, right))) {
    if (typeof key !== 'string' || (!allowEmptyKey && key.trim() === '')) {
      throw new TypeError(
        `${label} key must be ${allowEmptyKey ? 'a string' : 'a non-empty string'}`,
      );
    }
    if (Object.hasOwn(result, key)) {
      throw new Error(`Duplicate ${label} entry ${key}`);
    }
    result[key] = value;
  }
  return result;
};

const packageIdentity = (value, expectedName) => {
  const pkg = assertRecord(value, `${expectedName} package`);
  if (pkg.name !== expectedName) {
    throw new Error(`Expected package ${expectedName}, received ${String(pkg.name)}`);
  }
  nonEmptyString(pkg.version, `${expectedName} version`);
  assertRecord(pkg.exports, `${expectedName} exports`);
  return pkg;
};

const componentTargets = (componentSubpaths) => {
  if (!Array.isArray(componentSubpaths) || componentSubpaths.length === 0) {
    throw new TypeError('componentSubpaths must contain at least one direct component export');
  }
  return new Map(
    componentSubpaths.map((entry, index) => {
      const record = assertRecord(entry, `componentSubpaths[${index}]`);
      const publicSubpath = nonEmptyString(record.publicSubpath, `componentSubpaths[${index}]`);
      const target = nonEmptyString(record.import, `${publicSubpath} import target`);
      const declaration = nonEmptyString(record.types, `${publicSubpath} declaration target`);
      if (!/^\.\/ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(publicSubpath)) {
        throw new Error(`Invalid direct component subpath ${publicSubpath}`);
      }
      if (target !== `./dist/components/${publicSubpath.slice(2)}.js`) {
        throw new Error(`${publicSubpath} does not target its direct component module`);
      }
      if (declaration !== `./dist/components/${publicSubpath.slice(2)}.d.ts`) {
        throw new Error(`${publicSubpath} does not target its direct component declaration`);
      }
      return [publicSubpath, { target, declaration }];
    }),
  );
};

const packageExports = ({ pkg, components = null }) => {
  const entries = [];
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    if (components !== null && (subpath === './ki-*' || subpath.startsWith('./ki-'))) {
      continue;
    }
    entries.push([
      subpath,
      publicExport(runtimeExportTarget(entry, `${pkg.name} export ${subpath}`)),
    ]);
  }
  if (components !== null) {
    for (const [subpath, module] of components) {
      entries.push([subpath, publicExport(module.target)]);
    }
  }
  return sortedObject(entries, `${pkg.name} export`);
};

const moduleDefinitions = ({ pkg, components = null }) => {
  const entries = [];
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    if (components !== null && (subpath === './ki-*' || subpath.startsWith('./ki-'))) continue;
    entries.push([
      subpath,
      {
        target: runtimeExportTarget(entry, `${pkg.name} export ${subpath}`),
        declaration: typesExportTarget(entry, `${pkg.name} export ${subpath}`),
      },
    ]);
  }
  if (components !== null) entries.push(...components.entries());
  return sortedObject(entries, `${pkg.name} module`);
};

const resolvePackageTarget = (packageRoot, target, label) => {
  const root = resolve(nonEmptyString(packageRoot, `${label} packageRoot`));
  const relativeTarget = nonEmptyString(target, `${label} target`);
  if (!relativeTarget.startsWith('./')) {
    throw new Error(`${label} target must be package-relative`);
  }
  const absoluteTarget = resolve(root, relativeTarget);
  const relativePath = relative(root, absoluteTarget);
  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} target escapes its package root`);
  }
  return absoluteTarget;
};

const declarationInput = (sources, packageName) => {
  const record = assertRecord(sources, `${packageName} declaration sources`);
  const packageRoot = resolve(
    nonEmptyString(record.packageRoot, `${packageName} declaration packageRoot`),
  );
  if (record.files === undefined) return { packageRoot, files: null };
  const files = assertRecord(record.files, `${packageName} declaration files`);
  return {
    packageRoot,
    files: new Map(
      Object.entries(files).map(([target, source]) => [
        resolvePackageTarget(packageRoot, target, `${packageName} declaration file`),
        nonEmptyString(source, `${packageName} declaration ${target}`),
      ]),
    ),
  };
};

const compilerOptions = Object.freeze({
  // Published Stencil declarations intentionally mix explicit `.js`
  // specifiers with the loader's generated extensionless export-star. Bundler
  // resolution is the consumer-compatible mode that resolves both forms.
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
  skipLibCheck: true,
  noEmit: true,
});

const createDeclarationHost = ({ packageRoot, files }) => {
  const host = ts.createCompilerHost(compilerOptions, true);
  if (files === null) return host;

  const virtualDirectories = new Set([packageRoot]);
  for (const fileName of files.keys()) {
    let directory = dirname(fileName);
    while (directory.startsWith(packageRoot)) {
      virtualDirectories.add(directory);
      if (directory === packageRoot) break;
      directory = dirname(directory);
    }
  }
  const defaultFileExists = host.fileExists.bind(host);
  const defaultReadFile = host.readFile.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  const defaultDirectoryExists = host.directoryExists?.bind(host);
  const defaultRealpath = host.realpath?.bind(host);

  host.fileExists = (fileName) => files.has(resolve(fileName)) || defaultFileExists(fileName);
  host.readFile = (fileName) => files.get(resolve(fileName)) ?? defaultReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = files.get(resolve(fileName));
    return source === undefined
      ? defaultGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(
          fileName,
          source,
          languageVersion,
          true,
          ts.getScriptKindFromFileName(fileName),
        );
  };
  host.directoryExists = (directory) =>
    virtualDirectories.has(resolve(directory)) || defaultDirectoryExists?.(directory) === true;
  host.realpath = (path) => {
    const absolutePath = resolve(path);
    if (files.has(absolutePath) || virtualDirectories.has(absolutePath)) return absolutePath;
    return defaultRealpath?.(path) ?? path;
  };
  host.getCurrentDirectory = () => packageRoot;
  return host;
};

const hasPrivateModifier = (node) =>
  !ts.isConstructorDeclaration(node) &&
  ((node.name !== undefined && ts.isPrivateIdentifier(node.name)) ||
    (ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)));

const printableDeclaration = (declaration) => {
  if (ts.isClassDeclaration(declaration)) {
    return ts.factory.updateClassDeclaration(
      declaration,
      declaration.modifiers,
      declaration.name,
      declaration.typeParameters,
      declaration.heritageClauses,
      declaration.members.filter((member) => !hasPrivateModifier(member)),
    );
  }
  if (ts.isVariableDeclaration(declaration)) {
    const declarationList = declaration.parent;
    const statement = declarationList.parent;
    if (ts.isVariableDeclarationList(declarationList) && ts.isVariableStatement(statement)) {
      return ts.factory.updateVariableStatement(
        statement,
        statement.modifiers,
        ts.factory.updateVariableDeclarationList(declarationList, [declaration]),
      );
    }
  }
  return declaration;
};

const declarationPrinter = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: true,
});

export const normalizePrintedSignature = (source) =>
  source
    .trim()
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/^export interface /u, 'interface ');

const printSignature = (declaration) =>
  normalizePrintedSignature(
    declarationPrinter.printNode(
      ts.EmitHint.Unspecified,
      printableDeclaration(declaration),
      declaration.getSourceFile(),
    ),
  );

const isTypeOnlyAlias = (symbol) => {
  const specifiers = (symbol.declarations ?? []).filter(ts.isExportSpecifier);
  return (
    specifiers.length > 0 &&
    specifiers.every(
      (specifier) =>
        specifier.isTypeOnly ||
        (ts.isExportDeclaration(specifier.parent.parent) && specifier.parent.parent.isTypeOnly),
    )
  );
};

const symbolKinds = (symbol, typeOnly, label) => {
  const kinds = [];
  if (!typeOnly && (symbol.flags & ts.SymbolFlags.Namespace) !== 0) kinds.push('namespace');
  if (typeOnly || (symbol.flags & ts.SymbolFlags.Type) !== 0) kinds.push('type');
  if (!typeOnly && (symbol.flags & ts.SymbolFlags.Value) !== 0) kinds.push('value');
  if (kinds.length === 0) {
    throw new Error(`${label} is not a public namespace, type, or value`);
  }
  return kinds;
};

const publicModuleSymbols = ({ checker, sourceFile, label }) => {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile) ?? sourceFile.symbol;
  if (!moduleSymbol) throw new Error(`${label} declaration is not an external module`);
  return sortedObject(
    checker.getExportsOfModule(moduleSymbol).map((exportedSymbol) => {
      const typeOnly = isTypeOnlyAlias(exportedSymbol);
      const symbol =
        (exportedSymbol.flags & ts.SymbolFlags.Alias) !== 0
          ? checker.getAliasedSymbol(exportedSymbol)
          : exportedSymbol;
      const declarations = [...(symbol.declarations ?? [])].sort(
        (left, right) =>
          compareText(left.getSourceFile().fileName, right.getSourceFile().fileName) ||
          left.pos - right.pos,
      );
      if (declarations.length === 0) {
        throw new Error(`${label} symbol ${exportedSymbol.name} has no resolvable declaration`);
      }
      const signatures = [...new Set(declarations.map(printSignature).filter(Boolean))];
      if (signatures.length === 0) {
        throw new Error(`${label} symbol ${exportedSymbol.name} has no public signature`);
      }
      return [
        nonEmptyString(exportedSymbol.name, `${label} symbol name`),
        {
          kinds: symbolKinds(symbol, typeOnly, `${label} symbol ${exportedSymbol.name}`),
          signature: signatures.join('\n'),
        },
      ];
    }),
    `${label} symbol`,
  );
};

const packageModules = ({ packageName, definitions, sources }) => {
  const entries = Object.entries(definitions);
  const declarationTargets = entries
    .map(([, definition]) => definition.declaration)
    .filter((target) => target !== null);
  if (declarationTargets.length === 0) {
    return sortedObject(
      entries.map(([subpath, definition]) => [
        subpath,
        { target: definition.target, declaration: null, symbols: {} },
      ]),
      `${packageName} public module`,
    );
  }

  const input = declarationInput(sources, packageName);
  const host = createDeclarationHost(input);
  const rootNames = declarationTargets.map((target) => {
    const fileName = resolvePackageTarget(input.packageRoot, target, `${packageName} declaration`);
    if (!host.fileExists(fileName)) {
      throw new Error(`${packageName} declaration ${target} does not exist`);
    }
    return fileName;
  });
  const program = ts.createProgram({ rootNames, options: compilerOptions, host });
  const syntaxError = program.getSyntacticDiagnostics()[0];
  if (syntaxError) {
    throw new Error(
      `${packageName} declaration is invalid: ${ts.flattenDiagnosticMessageText(
        syntaxError.messageText,
        '\n',
      )}`,
    );
  }
  const checker = program.getTypeChecker();
  return sortedObject(
    entries.map(([subpath, definition]) => {
      if (definition.declaration === null) {
        return [subpath, { target: definition.target, declaration: null, symbols: {} }];
      }
      const fileName = resolvePackageTarget(
        input.packageRoot,
        definition.declaration,
        `${packageName} declaration`,
      );
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) {
        throw new Error(`${packageName} declaration ${definition.declaration} was not loaded`);
      }
      return [
        subpath,
        {
          target: definition.target,
          declaration: definition.declaration,
          symbols: publicModuleSymbols({
            checker,
            sourceFile,
            label: `${packageName} module ${subpath}`,
          }),
        },
      ];
    }),
    `${packageName} public module`,
  );
};

const legacyRootSymbols = ({ rootContract, componentTargetBySubpath, deprecatedSince }) => {
  const contract = assertRecord(rootContract, 'legacy root contract');
  if (!Array.isArray(contract.values) || !Array.isArray(contract.namedTypes)) {
    throw new TypeError('legacy root contract must contain values and namedTypes arrays');
  }
  if (!Array.isArray(contract.typeStars) || contract.typeStars.length !== 0) {
    throw new Error('legacy root contract must expand every type-star export');
  }

  return sortedObject(
    [...contract.values, ...contract.namedTypes].map((entry, index) => {
      const record = assertRecord(entry, `legacy root symbol ${index}`);
      const name = nonEmptyString(record.name, `legacy root symbol ${index} name`);
      const replacement = nonEmptyString(record.replacement, `${name} replacement`);
      const prefix = `${ELEMENTS_PACKAGE}/`;
      if (!replacement.startsWith(prefix)) {
        throw new Error(`${name} replacement must be a direct ${ELEMENTS_PACKAGE} subpath`);
      }
      const publicSubpath = `./${replacement.slice(prefix.length)}`;
      const componentModule = componentTargetBySubpath.get(publicSubpath);
      if (componentModule === undefined) {
        throw new Error(`${name} replacement ${replacement} is not a component export`);
      }
      return [name, { target: componentModule.target, deprecatedSince, replacement }];
    }),
    'legacy root symbol',
  );
};

const docsRequiredness = (docs) => {
  const document = assertRecord(docs, 'Stencil docs');
  if (!Array.isArray(document.components)) {
    throw new TypeError('Stencil docs components must be an array');
  }
  return new Map(
    document.components.map((component, index) => {
      const record = assertRecord(component, `Stencil docs component ${index}`);
      const tag = nonEmptyString(record.tag, `Stencil docs component ${index} tag`);
      if (!Array.isArray(record.props)) {
        throw new TypeError(`${tag} Stencil props must be an array`);
      }
      return [
        tag,
        new Map(
          record.props.map((property, propertyIndex) => {
            const prop = assertRecord(property, `${tag} prop ${propertyIndex}`);
            return [
              nonEmptyString(prop.name, `${tag} prop ${propertyIndex} name`),
              prop.required === true,
            ];
          }),
        ),
      ];
    }),
  );
};

const facetMap = (facets, keyOf, entryOf, label, options) => {
  if (!Array.isArray(facets)) {
    throw new TypeError(`${label} must be an array`);
  }
  return sortedObject(
    facets.map((facet, index) => {
      const record = assertRecord(facet, `${label}[${index}]`);
      return [keyOf(record, index), entryOf(record, index)];
    }),
    label,
    options,
  );
};

const nullableDefault = (record) => (Object.hasOwn(record, 'default') ? record.default : null);

const optionalBoolean = (record, key, fallback, label) => {
  if (!Object.hasOwn(record, key)) return fallback;
  if (typeof record[key] !== 'boolean') {
    throw new TypeError(`${label} ${key} must be a boolean`);
  }
  return record[key];
};

const methodParameter = (parameter, index, label, docsParameter = null) => {
  const record = assertRecord(parameter, `${label} parameter ${index}`);
  const docsRecord = docsParameter === null ? null : assertRecord(docsParameter, `${label} docs`);
  const rawName = nonEmptyString(record.name, `${label} parameter ${index} name`);
  const nameImpliesOptional = rawName.endsWith('?');
  const name = nonEmptyString(
    nameImpliesOptional ? rawName.slice(0, -1) : rawName,
    `${label} parameter ${index} name`,
  );
  const type = nonEmptyString(
    record.type?.text ?? docsRecord?.type,
    `${label} parameter ${name} type`,
  );
  const hasDefault = Object.hasOwn(record, 'default') || Object.hasOwn(docsRecord ?? {}, 'default');
  const defaultValue = Object.hasOwn(record, 'default') ? record.default : docsRecord?.default;
  if (hasDefault && defaultValue !== null && typeof defaultValue !== 'string') {
    throw new TypeError(`${label} parameter ${name} default must be a string`);
  }
  const optional = optionalBoolean(
    record,
    'optional',
    optionalBoolean(
      docsRecord ?? {},
      'optional',
      nameImpliesOptional || hasDefault,
      `${label} parameter ${name}`,
    ),
    `${label} parameter ${name}`,
  );
  const rest = optionalBoolean(
    record,
    'rest',
    optionalBoolean(docsRecord ?? {}, 'rest', false, `${label} parameter ${name}`),
    `${label} parameter ${name}`,
  );

  return {
    name,
    type,
    optional,
    default: hasDefault ? defaultValue : null,
    rest,
  };
};

const methodContract = (method, label, docsMethod = null) => {
  const record = assertRecord(method, label);
  const docsRecord = docsMethod === null ? null : assertRecord(docsMethod, `${label} docs`);
  const name = nonEmptyString(record.name, `${label} name`);
  const returnType = nonEmptyString(record.return?.type?.text, `${label} return type`);
  if (!Array.isArray(record.parameters)) {
    throw new TypeError(`${label} parameters must be an array`);
  }
  const docsParameters = docsRecord?.parameters ?? docsRecord?.complexType?.parameters ?? [];
  if (!Array.isArray(docsParameters)) {
    throw new TypeError(`${label} docs parameters must be an array`);
  }
  if (docsRecord !== null && docsParameters.length !== record.parameters.length) {
    throw new Error(`${label} CEM and Stencil docs must contain the same parameters`);
  }
  const parameters = record.parameters.map((parameter, index) => {
    const docsParameter = docsParameters[index] ?? null;
    if (
      docsParameter !== null &&
      nonEmptyString(docsParameter.name, `${label} docs parameter ${index} name`).replace(
        /\?$/u,
        '',
      ) !== nonEmptyString(parameter.name, `${label} parameter ${index} name`).replace(/\?$/u, '')
    ) {
      throw new Error(`${label} CEM and Stencil docs parameter order must match`);
    }
    return methodParameter(parameter, index, label, docsParameter);
  });
  const signatureParameters = parameters.map((parameter) => {
    const rest = parameter.rest ? '...' : '';
    const optional = parameter.optional ? '?' : '';
    const defaultValue = parameter.default === null ? '' : ` = ${String(parameter.default)}`;
    return `${rest}${parameter.name}${optional}: ${parameter.type}${defaultValue}`;
  });

  return {
    name,
    returnType,
    parameters,
    signature: `${name}(${signatureParameters.join(', ')}) => ${returnType}`,
  };
};

/**
 * Complete the generated CEM's structured method contract from Stencil docs.
 * The returned manifest is a deep clone so callers cannot accidentally mutate
 * the docs-json-derived input while producing another surface.
 */
export function completeCemMethodSignatures({ manifest, docs }) {
  const completed = JSON.parse(JSON.stringify(assertRecord(manifest, 'Custom Elements Manifest')));
  const document = assertRecord(docs, 'Stencil docs');
  if (!Array.isArray(completed.modules) || !Array.isArray(document.components)) {
    throw new TypeError('CEM modules and Stencil docs components must be arrays');
  }
  const docsByTag = new Map(
    document.components.map((component, index) => {
      const record = assertRecord(component, `Stencil docs component ${index}`);
      const tag = nonEmptyString(record.tag, `Stencil docs component ${index} tag`);
      const methods = record.methods ?? [];
      if (!Array.isArray(methods)) throw new TypeError(`${tag} Stencil methods must be an array`);
      return [
        tag,
        new Map(
          methods.map((method, methodIndex) => {
            const entry = assertRecord(method, `${tag} Stencil method ${methodIndex}`);
            return [nonEmptyString(entry.name, `${tag} Stencil method ${methodIndex} name`), entry];
          }),
        ),
      ];
    }),
  );

  for (const [moduleIndex, module] of completed.modules.entries()) {
    const moduleRecord = assertRecord(module, `manifest module ${moduleIndex}`);
    if (!Array.isArray(moduleRecord.declarations)) {
      throw new TypeError(`manifest module ${moduleIndex} declarations must be an array`);
    }
    for (const declaration of moduleRecord.declarations) {
      if (declaration?.customElement !== true) continue;
      const tag = nonEmptyString(declaration.tagName, 'custom element tagName');
      const docsMethods = docsByTag.get(tag);
      if (docsMethods === undefined) throw new Error(`${tag} is absent from Stencil docs`);
      if (!Array.isArray(declaration.members)) {
        throw new TypeError(`${tag} manifest members must be an array`);
      }
      const seen = new Set();
      for (const member of declaration.members) {
        if (member?.kind !== 'method') continue;
        const methodName = nonEmptyString(member.name, `${tag} method name`);
        const docsMethod = docsMethods.get(methodName);
        if (docsMethod === undefined) {
          throw new Error(`${tag}.${methodName} is absent from Stencil docs methods`);
        }
        const contract = methodContract(member, `${tag}.${methodName}`, docsMethod);
        member.parameters = contract.parameters.map((parameter, index) => {
          const completedParameter = {
            name: parameter.name,
            type: { text: parameter.type },
            description: member.parameters[index]?.description ?? '',
            optional: parameter.optional,
            rest: parameter.rest,
          };
          if (parameter.default !== null) completedParameter.default = parameter.default;
          return completedParameter;
        });
        member.signature = contract.signature;
        seen.add(methodName);
      }
      for (const methodName of docsMethods.keys()) {
        if (!seen.has(methodName)) {
          throw new Error(`${tag}.${methodName} is absent from CEM methods`);
        }
      }
    }
  }
  return completed;
}

const componentSurface = ({ declaration, requiredByName }) => {
  const tag = nonEmptyString(declaration.tagName, 'custom element tagName');
  const fields = declaration.members.filter((member) => member.kind === 'field');
  const methods = declaration.members.filter((member) => member.kind === 'method');
  const fieldNames = new Set(fields.map(({ name }) => name));
  for (const propertyName of requiredByName.keys()) {
    if (!fieldNames.has(propertyName)) {
      throw new Error(`${tag} Stencil property ${propertyName} is absent from the manifest`);
    }
  }

  return {
    description: nonEmptyString(declaration.description, `${tag} description`),
    properties: facetMap(
      fields,
      (field) => nonEmptyString(field.name, `${tag} field name`),
      (field) =>
        publicFacet(
          {
            type: field.type?.text ?? null,
            defaultValue: nullableDefault(field),
            required: requiredByName.get(field.name) === true,
            description: field.description,
          },
          `${tag}.${field.name}`,
        ),
      `${tag} properties`,
    ),
    attributes: facetMap(
      declaration.attributes,
      (attribute) => nonEmptyString(attribute.name, `${tag} attribute name`),
      (attribute) => {
        const fieldName = nonEmptyString(attribute.fieldName, `${tag}.${attribute.name} fieldName`);
        if (!fieldNames.has(fieldName)) {
          throw new Error(
            `${tag} attribute ${attribute.name} references unknown field ${fieldName}`,
          );
        }
        return publicFacet(
          {
            type: attribute.type?.text ?? null,
            defaultValue: nullableDefault(attribute),
            required: requiredByName.get(fieldName) === true,
            description: attribute.description,
          },
          `${tag}[${attribute.name}]`,
        );
      },
      `${tag} attributes`,
    ),
    events: facetMap(
      declaration.events,
      (event) => nonEmptyString(event.name, `${tag} event name`),
      (event) =>
        publicFacet(
          { type: event.type?.text ?? null, description: event.description },
          `${tag}.${event.name}`,
        ),
      `${tag} events`,
    ),
    methods: facetMap(
      methods,
      (method) => nonEmptyString(method.name, `${tag} method name`),
      (method) => {
        const contract = methodContract(method, `${tag}.${method.name}`);
        return {
          ...publicFacet(
            { type: contract.returnType, description: method.description },
            `${tag}.${method.name}`,
          ),
          signature: contract.signature,
          parameters: contract.parameters,
        };
      },
      `${tag} methods`,
    ),
    slots: facetMap(
      declaration.slots,
      (slot) => {
        if (typeof slot.name !== 'string') throw new TypeError(`${tag} slot name must be a string`);
        return slot.name;
      },
      (slot) => publicFacet({ description: slot.description }, `${tag} slot ${slot.name}`),
      `${tag} slots`,
      { allowEmptyKey: true },
    ),
    parts: facetMap(
      declaration.cssParts,
      (part) => nonEmptyString(part.name, `${tag} part name`),
      (part) => publicFacet({ description: part.description }, `${tag} part ${part.name}`),
      `${tag} parts`,
    ),
    cssProperties: facetMap(
      declaration.cssProperties,
      (property) => nonEmptyString(property.name, `${tag} CSS property name`),
      (property) =>
        publicFacet({ description: property.description }, `${tag} CSS property ${property.name}`),
      `${tag} CSS properties`,
    ),
  };
};

const componentSurfaces = ({ manifest, docs, componentTargetBySubpath }) => {
  const document = assertRecord(manifest, 'Custom Elements Manifest');
  if (document.schemaVersion !== '1.0.0' || !Array.isArray(document.modules)) {
    throw new Error('Custom Elements Manifest must use schemaVersion 1.0.0 and a modules array');
  }
  const requiredByTag = docsRequiredness(docs);
  const modulesByPath = new Map(
    document.modules.map((module, index) => {
      const record = assertRecord(module, `manifest module ${index}`);
      return [nonEmptyString(record.path, `manifest module ${index} path`), record];
    }),
  );

  const entries = [];
  for (const [subpath, componentModule] of componentTargetBySubpath) {
    const tag = subpath.slice(2);
    const target = componentModule.target;
    const manifestPath = target.slice(2);
    const module = modulesByPath.get(manifestPath);
    if (module === undefined) {
      const taggedModule = document.modules.find(
        (candidate) => candidate?.declarations?.[0]?.tagName === tag,
      );
      if (taggedModule !== undefined) {
        throw new Error(
          `${tag} manifest path must equal its published module target ${manifestPath}`,
        );
      }
      throw new Error(`${tag} is absent from the Custom Elements Manifest`);
    }
    if (!Array.isArray(module.declarations) || module.declarations.length !== 1) {
      throw new Error(`${tag} manifest module must contain exactly one declaration`);
    }
    const declaration = assertRecord(module.declarations[0], `${tag} declaration`);
    if (
      declaration.kind !== 'class' ||
      declaration.customElement !== true ||
      declaration.tagName !== tag
    ) {
      throw new Error(`${tag} manifest declaration is not its custom-element class`);
    }
    if (!Array.isArray(declaration.members)) {
      throw new TypeError(`${tag} manifest members must be an array`);
    }
    for (const facet of ['attributes', 'events', 'slots', 'cssParts', 'cssProperties']) {
      if (!Array.isArray(declaration[facet])) {
        throw new TypeError(`${tag} manifest ${facet} must be an array`);
      }
    }
    const requiredByName = requiredByTag.get(tag);
    if (requiredByName === undefined) {
      throw new Error(`${tag} is absent from Stencil docs`);
    }
    entries.push([tag, componentSurface({ declaration, requiredByName })]);
    modulesByPath.delete(manifestPath);
    requiredByTag.delete(tag);
  }
  if (modulesByPath.size > 0 || requiredByTag.size > 0) {
    throw new Error(
      'Manifest, Stencil docs, and component inventory must name the same components',
    );
  }
  return sortedObject(entries, 'component');
};

const tokenSurface = ({ tokenInventory, defaultTokenComposition }) => {
  const inventory = assertRecord(tokenInventory, 'token inventory');
  if (!Array.isArray(inventory.publicTokens)) {
    throw new TypeError('token inventory publicTokens must be an array');
  }
  const composition = assertRecord(defaultTokenComposition, 'onmars-light composition');
  if (composition.id !== 'onmars-light' || !Array.isArray(composition.records)) {
    throw new Error('default token composition must be the parsed onmars-light composition');
  }
  const defaults = new Map(
    composition.records
      .filter((record) => record.public === true)
      .map((record) => [record.cssName, record]),
  );
  return sortedObject(
    inventory.publicTokens.map((token, index) => {
      const record = assertRecord(token, `public token ${index}`);
      const cssName = nonEmptyString(record.cssName, `public token ${index} CSS name`);
      const resolved = defaults.get(cssName);
      if (
        resolved === undefined ||
        resolved.path !== record.path ||
        resolved.resolvedValue == null
      ) {
        throw new Error(`${cssName} has no matching onmars-light resolved default`);
      }
      return [
        cssName,
        publicFacet(
          {
            type: record.type ?? null,
            defaultValue: resolved.resolvedValue,
            description: record.description,
          },
          cssName,
        ),
      ];
    }),
    'public token',
  );
};

/** Build only the declaration-derived module surface for a package snapshot. */
export function buildPublicModuleSurface({
  packageName,
  packageJson,
  declarationSources,
  componentSubpaths = null,
}) {
  const pkg = packageIdentity(packageJson, packageName);
  const components = componentSubpaths === null ? null : componentTargets(componentSubpaths);
  return packageModules({
    packageName,
    definitions: moduleDefinitions({ pkg, components }),
    sources: declarationSources,
  });
}

/** Build the complete v1 repository candidate from derived, validated inputs. */
export function buildRepositoryPublicApiSnapshot({
  elementsPackage,
  tokensPackage,
  componentSubpaths,
  rootContract,
  docs,
  manifest,
  tokenInventory,
  defaultTokenComposition,
  stylesheetSources,
  declarationSources,
  browserBaseline,
  legacyRootDeprecatedSince = '0.0.0',
}) {
  const elements = packageIdentity(elementsPackage, ELEMENTS_PACKAGE);
  const tokens = packageIdentity(tokensPackage, TOKENS_PACKAGE);
  nonEmptyString(legacyRootDeprecatedSince, 'legacy root deprecation version');
  if (!Array.isArray(browserBaseline) || browserBaseline.length === 0) {
    throw new TypeError('browserBaseline must be a non-empty array');
  }
  const componentTargetBySubpath = componentTargets(componentSubpaths);
  const sources = assertRecord(declarationSources, 'declarationSources');
  const elementModuleDefinitions = moduleDefinitions({
    pkg: elements,
    components: componentTargetBySubpath,
  });
  const tokenModuleDefinitions = moduleDefinitions({ pkg: tokens });
  const tokenExports = packageExports({ pkg: tokens });
  const completedManifest = completeCemMethodSignatures({ manifest, docs });
  const publicTokenNames = assertRecord(tokenInventory, 'token inventory').publicTokens?.map(
    (token, index) =>
      nonEmptyString(
        assertRecord(token, `public token ${index}`).cssName,
        `public token ${index} CSS name`,
      ),
  );

  return createPublicApiSnapshot({
    packages: {
      [ELEMENTS_PACKAGE]: {
        version: elements.version,
        exports: packageExports({ pkg: elements, components: componentTargetBySubpath }),
        modules: packageModules({
          packageName: ELEMENTS_PACKAGE,
          definitions: elementModuleDefinitions,
          sources: sources[ELEMENTS_PACKAGE],
        }),
        rootSymbols: legacyRootSymbols({
          rootContract,
          componentTargetBySubpath,
          deprecatedSince: legacyRootDeprecatedSince,
        }),
        components: componentSurfaces({
          manifest: completedManifest,
          docs,
          componentTargetBySubpath,
        }),
      },
      [TOKENS_PACKAGE]: {
        version: tokens.version,
        exports: tokenExports,
        modules: packageModules({
          packageName: TOKENS_PACKAGE,
          definitions: tokenModuleDefinitions,
          sources: sources[TOKENS_PACKAGE],
        }),
        rootSymbols: {},
        tokens: tokenSurface({ tokenInventory, defaultTokenComposition }),
        ...(stylesheetSources === undefined
          ? {}
          : {
              stylesheets: buildPublicStylesheetSurface({
                packageExports: tokenExports,
                publicTokenNames,
                stylesheetSources,
              }),
            }),
      },
    },
    browserBaseline,
  });
}
