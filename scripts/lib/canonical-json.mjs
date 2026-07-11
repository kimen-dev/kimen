import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function invalid(path, reason) {
  return new TypeError(`Cannot encode canonical JSON at ${path}: ${reason}`);
}

function normalize(value, path, ancestors) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw invalid(path, 'numbers must be finite');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw invalid(path, `${typeof value} is not JSON data`);
  }
  if (ancestors.has(value)) {
    throw invalid(path, 'circular reference');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw invalid(`${path}[${index}]`, 'sparse arrays are not JSON data');
        }
      }
      const extraKeys = Object.keys(value).filter((key) => !/^(0|[1-9][0-9]*)$/.test(key));
      if (extraKeys.length > 0 || Object.getOwnPropertySymbols(value).length > 0) {
        throw invalid(path, 'arrays cannot carry named or symbol properties');
      }
      return value.map((item, index) => normalize(item, `${path}[${index}]`, ancestors));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw invalid(path, 'only plain objects are supported');
    }

    const normalized = Object.create(null);
    for (const key of Reflect.ownKeys(value).sort((left, right) => {
      const leftKey = String(left);
      const rightKey = String(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    })) {
      if (typeof key !== 'string') {
        throw invalid(path, 'symbol properties are not JSON data');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw invalid(`${path}.${key}`, 'accessor and non-enumerable properties are unsupported');
      }
      normalized[key] = normalize(descriptor.value, `${path}.${key}`, ancestors);
    }
    return normalized;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJson(value) {
  return `${JSON.stringify(normalize(value, '$', new WeakSet()), null, 2)}\n`;
}

export function sha256(input) {
  if (typeof input !== 'string' && !(input instanceof Uint8Array)) {
    throw new TypeError('SHA-256 input must be a string or Uint8Array');
  }
  const hash = createHash('sha256');
  return (typeof input === 'string' ? hash.update(input, 'utf8') : hash.update(input)).digest(
    'hex',
  );
}

export function canonicalJsonSha256(value) {
  return sha256(canonicalJson(value));
}

export async function sha256File(filePath) {
  return sha256(await readFile(filePath));
}

export async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON file ${filePath}: ${error.message}`, { cause: error });
  }
}

export async function writeCanonicalJsonFile(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, canonicalJson(value), 'utf8');
}
