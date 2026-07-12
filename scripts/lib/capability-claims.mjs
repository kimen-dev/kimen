const SCHEMA_VERSION = 1;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const STATES = new Set(['available', 'hardening', 'planned']);

const compareText = (left, right) => left.localeCompare(right);

function assertRecord(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(record, allowed, label) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} contains unknown field ${key}`);
    }
  }
}

function assertId(value, label) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase kebab-case ID`);
  }
  return value;
}

function assertText(value, label) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }
  return value;
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  const unique = new Set();
  for (const entry of value) {
    assertId(entry, `${label} entry`);
    if (unique.has(entry)) {
      throw new Error(`${label} contains duplicate ${entry}`);
    }
    unique.add(entry);
  }
  return [...unique].sort(compareText);
}

function validatePath(path, label) {
  if (
    typeof path !== 'string' ||
    path === '' ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new TypeError(`${label} must be a safe repository-relative path`);
  }
  return path;
}

function normalizePolicy(policy, manifest) {
  if (policy === undefined) {
    return {
      mandatoryEvidenceIds: new Set(
        manifest.capabilities.flatMap((capability) => capability.evidence ?? []),
      ),
      requiredDestinationPaths: new Set(
        manifest.destinations.map((destination) => destination.path),
      ),
    };
  }
  const record = assertRecord(policy, 'capability policy');
  return {
    mandatoryEvidenceIds: new Set(
      uniqueStrings(record.mandatoryEvidenceIds, 'mandatory evidence IDs'),
    ),
    requiredDestinationPaths: new Set(
      (record.requiredDestinationPaths ?? []).map((path) =>
        validatePath(path, 'required destination path'),
      ),
    ),
  };
}

function normalizeManifest(manifest, policy) {
  const record = assertRecord(manifest, 'capability manifest');
  assertExactKeys(
    record,
    new Set(['schemaVersion', 'destinations', 'capabilities']),
    'capability manifest',
  );
  if (record.schemaVersion !== SCHEMA_VERSION) {
    throw new TypeError(`capability manifest schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(record.destinations) || record.destinations.length === 0) {
    throw new TypeError('capability manifest destinations must be a non-empty array');
  }
  if (!Array.isArray(record.capabilities) || record.capabilities.length === 0) {
    throw new TypeError('capability manifest capabilities must be a non-empty array');
  }

  const destinationIds = new Set();
  const destinationPaths = new Set();
  const destinations = record.destinations.map((value) => {
    const destination = assertRecord(value, 'capability destination');
    assertExactKeys(destination, new Set(['id', 'path']), 'capability destination');
    const id = assertId(destination.id, 'capability destination ID');
    const path = validatePath(destination.path, `destination ${id} path`);
    if (destinationIds.has(id)) {
      throw new Error(`duplicate capability destination ID ${id}`);
    }
    if (destinationPaths.has(path)) {
      throw new Error(`duplicate capability destination path ${path}`);
    }
    destinationIds.add(id);
    destinationPaths.add(path);
    return { id, path };
  });

  const normalizedPolicy = normalizePolicy(policy, record);
  for (const path of normalizedPolicy.requiredDestinationPaths) {
    if (!destinationPaths.has(path)) {
      throw new Error(`${path} is a required capability destination`);
    }
  }

  const capabilityIds = new Set();
  const populatedDestinations = new Set();
  const capabilities = record.capabilities.map((value) => {
    const capability = assertRecord(value, 'capability claim');
    assertExactKeys(
      capability,
      new Set(['id', 'state', 'evidence', 'destinations', 'availableText', 'plannedText']),
      'capability claim',
    );
    const id = assertId(capability.id, 'capability ID');
    if (capabilityIds.has(id)) {
      throw new Error(`duplicate capability ID ${id}`);
    }
    capabilityIds.add(id);
    if (!STATES.has(capability.state)) {
      throw new TypeError(`${id} state must be available, hardening, or planned`);
    }
    const evidence = uniqueStrings(capability.evidence, `${id} evidence`);
    const capabilityDestinations = uniqueStrings(capability.destinations, `${id} destinations`);
    if (capabilityDestinations.length === 0) {
      throw new Error(`${id} must populate at least one destination`);
    }
    for (const destination of capabilityDestinations) {
      if (!destinationIds.has(destination)) {
        throw new Error(`${id} references unknown destination ${destination}`);
      }
      populatedDestinations.add(destination);
    }
    for (const evidenceId of evidence) {
      if (!normalizedPolicy.mandatoryEvidenceIds.has(evidenceId)) {
        throw new Error(`${id} evidence ${evidenceId} is not a mandatory gate`);
      }
    }

    const availableText = assertText(capability.availableText, `${id} availableText`);
    const plannedText = assertText(capability.plannedText, `${id} plannedText`);
    if (capability.state === 'available') {
      if (evidence.length === 0) {
        throw new Error(`${id} available capability requires evidence`);
      }
      if (availableText.trim() === '') {
        throw new Error(`${id} available capability requires availableText`);
      }
      if (plannedText !== '') {
        throw new Error(`${id} available capability must have empty plannedText`);
      }
      if (/\b(?:planned|future|later|hardening|incomplete|not yet)\b/iu.test(availableText)) {
        throw new Error(`${id} availableText must not describe incomplete or planned work`);
      }
    } else if (capability.state === 'hardening') {
      if (evidence.length === 0) {
        throw new Error(`${id} hardening capability requires evidence`);
      }
      if (availableText !== '') {
        throw new Error(`${id} hardening capability must have empty availableText`);
      }
      if (!/\b(?:hardening|incomplete|not yet available)\b/iu.test(plannedText)) {
        throw new Error(`${id} hardening plannedText must name incomplete hardening`);
      }
    } else {
      if (evidence.length !== 0) {
        throw new Error(`${id} planned capability must not claim gate evidence`);
      }
      if (availableText !== '') {
        throw new Error(`${id} planned capability must have empty availableText`);
      }
      const unqualifiedText = plannedText.replaceAll(
        /\bnot yet (?:available|implemented)\b/giu,
        '',
      );
      if (/\b(?:available|implemented|ships?|provides?|ready)\b/iu.test(unqualifiedText)) {
        throw new Error(`${id} plannedText must not present the capability as available`);
      }
      if (!/\b(?:planned|future|later|not yet (?:available|implemented))\b/iu.test(plannedText)) {
        throw new Error(`${id} plannedText must describe the capability as planned or future`);
      }
    }
    return {
      id,
      state: capability.state,
      evidence,
      destinations: capabilityDestinations,
      availableText,
      plannedText,
    };
  });

  for (const destination of destinationIds) {
    if (!populatedDestinations.has(destination)) {
      throw new Error(`${destination} destination is not populated by any capability`);
    }
  }

  destinations.sort((left, right) => compareText(left.id, right.id));
  capabilities.sort((left, right) => compareText(left.id, right.id));
  return { schemaVersion: SCHEMA_VERSION, destinations, capabilities };
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/gu, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        throw new Error('Unexpected HTML escape character');
    }
  });
}

function claimText(capability) {
  return capability.state === 'available' ? capability.availableText : capability.plannedText;
}

function renderBlock(destination, capabilities) {
  const claims = capabilities
    .filter((capability) => capability.destinations.includes(destination.id))
    .map((capability) => ({
      id: capability.id,
      state: capability.state,
      text: claimText(capability),
    }));
  const start = `kimen:capabilities:${destination.id}:start`;
  const end = `kimen:capabilities:${destination.id}:end`;

  if (destination.path.endsWith('.json')) {
    return `${JSON.stringify(
      {
        generatedFrom: 'docs/capabilities.json',
        marker: { start, end },
        claims,
      },
      null,
      2,
    )}\n`;
  }
  if (destination.path.endsWith('.mdx')) {
    return [
      `{/* ${start} */}`,
      ...claims.map((claim) => `- **${claim.state}** — ${claim.text}`),
      `{/* ${end} */}`,
      '',
    ].join('\n');
  }
  if (destination.path.endsWith('.html')) {
    return [
      `      <!-- ${start} -->`,
      '      <section class="section" aria-labelledby="capability-status-title">',
      '        <h2 id="capability-status-title">Capability status</h2>',
      `        <ul data-kimen-capabilities="${escapeHtml(destination.id)}">`,
      ...claims.map(
        (claim) =>
          `          <li data-capability="${escapeHtml(claim.id)}" data-state="${claim.state}">${escapeHtml(claim.text)}</li>`,
      ),
      '        </ul>',
      '      </section>',
      `      <!-- ${end} -->`,
      '',
    ].join('\n');
  }
  return [
    `<!-- ${start} -->`,
    ...claims.map((claim) => `- **${claim.state}** — ${claim.text}`),
    `<!-- ${end} -->`,
    '',
  ].join('\n');
}

/** Validate and normalize the source-of-truth capability manifest. */
export function validateCapabilityManifest(manifest, policy) {
  normalizeManifest(manifest, policy);
}

/** Render one deterministic generated block for every declared destination. */
export function renderCapabilityBlocks(manifest) {
  const normalized = normalizeManifest(manifest);
  return Object.fromEntries(
    normalized.destinations.map((destination) => [
      destination.id,
      renderBlock(destination, normalized.capabilities),
    ]),
  );
}

/** Reject a missing, extra, or byte-drifted generated block. */
export function validateCapabilityBlocks({ manifest, blocks }) {
  const actual = assertRecord(blocks, 'capability blocks');
  const expected = renderCapabilityBlocks(manifest);
  for (const id of Object.keys(expected)) {
    if (!Object.hasOwn(actual, id)) {
      throw new Error(`${id} capability block is missing`);
    }
    if (actual[id] !== expected[id]) {
      throw new Error(`${id} capability block has manual drift and is out of sync`);
    }
  }
  for (const id of Object.keys(actual)) {
    if (!Object.hasOwn(expected, id)) {
      throw new Error(`${id} is an undeclared capability block`);
    }
  }
}

function validateRevision(value, label) {
  const revision = assertRecord(value, label);
  assertExactKeys(revision, new Set(['sha', 'worktreeDigest']), label);
  if (typeof revision.sha !== 'string' || !SHA_PATTERN.test(revision.sha)) {
    throw new TypeError(`${label} sha must be 40 lowercase hexadecimal digits`);
  }
  if (
    revision.worktreeDigest !== null &&
    (typeof revision.worktreeDigest !== 'string' || !DIGEST_PATTERN.test(revision.worktreeDigest))
  ) {
    throw new TypeError(`${label} worktreeDigest must be null or a SHA-256 digest`);
  }
  return revision;
}

/** Verify that every available claim has green proof for this exact revision. */
export function evaluateCapabilityEvidence({
  manifest,
  evidenceRecord,
  currentRevision,
  mandatoryEvidenceIds,
}) {
  const requiredIds = uniqueStrings(mandatoryEvidenceIds, 'mandatory evidence IDs');
  const normalized = normalizeManifest(manifest, {
    mandatoryEvidenceIds: requiredIds,
    requiredDestinationPaths: manifest.destinations.map(({ path }) => path),
  });
  const evidence = assertRecord(evidenceRecord, 'capability evidence record');
  assertExactKeys(
    evidence,
    new Set(['schemaVersion', 'revision', 'gates']),
    'capability evidence record',
  );
  if (evidence.schemaVersion !== SCHEMA_VERSION) {
    throw new TypeError(`capability evidence schemaVersion must be ${SCHEMA_VERSION}`);
  }
  const current = validateRevision(currentRevision, 'current revision');
  const recorded = validateRevision(evidence.revision, 'evidence revision');
  if (recorded.sha !== current.sha) {
    throw new Error('capability evidence is stale and does not match the current Git SHA');
  }
  if (recorded.worktreeDigest !== current.worktreeDigest) {
    throw new Error('capability evidence worktree digest is stale for the current worktree');
  }
  if (!Array.isArray(evidence.gates)) {
    throw new TypeError('capability evidence gates must be an array');
  }
  const allowed = new Set(requiredIds);
  const gates = new Map();
  for (const value of evidence.gates) {
    const gate = assertRecord(value, 'capability gate evidence');
    assertExactKeys(gate, new Set(['id', 'status']), 'capability gate evidence');
    const id = assertId(gate.id, 'capability gate evidence ID');
    if (!allowed.has(id)) {
      throw new Error(`${id} evidence is not a mandatory gate`);
    }
    if (gates.has(id)) {
      throw new Error(`duplicate capability gate evidence ${id}`);
    }
    if (typeof gate.status !== 'string' || gate.status === '') {
      throw new TypeError(`${id} gate evidence status must be non-empty`);
    }
    gates.set(id, gate.status);
  }

  const availableCapabilityIds = [];
  for (const capability of normalized.capabilities) {
    if (capability.state !== 'available') {
      continue;
    }
    for (const id of capability.evidence) {
      if (!gates.has(id)) {
        throw new Error(`${id} evidence is missing for available capability ${capability.id}`);
      }
      if (gates.get(id) !== 'green') {
        throw new Error(`${id} evidence must be green for available capability ${capability.id}`);
      }
    }
    availableCapabilityIds.push(capability.id);
  }
  return { decision: 'pass', availableCapabilityIds };
}
