// @spec:019-agent-skills-canonical
import { createHash } from 'node:crypto';

const CANONICAL_PATH = '.agents/skills';
const COMPATIBILITY_PATH = '.claude/skills';
const EXPECTED_LINK_TARGET = '../.agents/skills';
const MIGRATION_CONTRACT_PATH =
  'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json';
const MIGRATION_DERIVATION = 'validated-source-plus-declared-final-hashes';

export const agentSkillFindingCodes = Object.freeze([
  'AGENT_SKILLS_CANONICAL_MISSING',
  'AGENT_SKILLS_CANONICAL_TYPE',
  'AGENT_SKILLS_ENTRY_MISSING',
  'AGENT_SKILLS_ENTRY_TYPE',
  'AGENT_SKILLS_IGNORED',
  'AGENT_SKILLS_UNTRACKED',
  'AGENT_SKILLS_COMPAT_MISSING',
  'AGENT_SKILLS_COMPAT_NOT_LINK',
  'AGENT_SKILLS_COMPAT_ABSOLUTE',
  'AGENT_SKILLS_COMPAT_BROKEN',
  'AGENT_SKILLS_COMPAT_CYCLE',
  'AGENT_SKILLS_COMPAT_ESCAPE',
  'AGENT_SKILLS_COMPAT_TARGET',
  'AGENT_SKILLS_GIT_MODE',
  'AGENT_SKILLS_GUIDANCE_DRIFT',
  'AGENT_SKILLS_MIGRATION_CONTRACT',
  'AGENT_SKILLS_MIGRATION_HASH',
  'AGENT_SKILLS_MIGRATION_SOURCE',
  'AGENT_SKILLS_TOOLING_VENDOR_WRITE',
]);
const agentSkillFindingCodeSet = new Set(agentSkillFindingCodes);

function compareByPathThenCode(left, right) {
  return left.path.localeCompare(right.path) || left.code.localeCompare(right.code);
}

function finding(code, path) {
  if (!agentSkillFindingCodeSet.has(code)) {
    throw new Error(`undeclared agent skill finding code: ${code}`);
  }
  return { code, path };
}

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isGitOid = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');

function summarizeHashes(hashes) {
  const entries = Object.entries(hashes).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  return {
    artifactCount: entries.length,
    pathSetSha256: sha256(entries.map(([path]) => `${path}\n`).join('')),
    skillCount: new Set(entries.map(([path]) => path.split('/', 1)[0])).size,
    treeSha256: sha256(entries.map(([path, hash]) => `${path}\0${hash}\n`).join('')),
  };
}

function digestSummaryMatches(source, summary) {
  return (
    source.skillCount === summary.skillCount &&
    source.artifactCount === summary.artifactCount &&
    source.pathSetSha256 === summary.pathSetSha256 &&
    source.treeSha256 === summary.treeSha256
  );
}

function historicalDigestFieldsAreValid(source, expectedRootPath) {
  return (
    source?.rootPath === expectedRootPath &&
    Number.isInteger(source.skillCount) &&
    Number.isInteger(source.artifactCount) &&
    isSha256(source.pathSetSha256) &&
    isSha256(source.treeSha256)
  );
}

function commitSourceIsValid(source, expectedRootPath) {
  return historicalDigestFieldsAreValid(source, expectedRootPath) && isGitOid(source.commitSha);
}

function migrationContractIsValid(migration) {
  if (
    migration.schemaVersion !== 4 ||
    migration.canonicalPath !== CANONICAL_PATH ||
    !Number.isInteger(migration.expectedConflictCount) ||
    !Number.isInteger(migration.expectedRewriteCount) ||
    !commitSourceIsValid(migration.validatedSource, COMPATIBILITY_PATH) ||
    !historicalDigestFieldsAreValid(migration.migratedSource, CANONICAL_PATH) ||
    migration.migratedSource?.derivation !== MIGRATION_DERIVATION ||
    !Number.isInteger(migration.candidateCapture?.skillCount) ||
    !Number.isInteger(migration.candidateCapture?.artifactCount) ||
    !isSha256(migration.candidateCapture?.pathSetSha256) ||
    !isSha256(migration.candidateCapture?.treeSha256) ||
    migration.candidateCapture?.provenance !== 'founder-approved local pre-migration capture' ||
    !Array.isArray(migration.approvedConflicts) ||
    !Array.isArray(migration.rewrittenAfterMigration)
  ) {
    return false;
  }
  if (
    migration.approvedConflicts.length !== migration.expectedConflictCount ||
    migration.rewrittenAfterMigration.length !== migration.expectedRewriteCount ||
    migration.candidateCapture.skillCount !== migration.validatedSource.skillCount ||
    migration.candidateCapture.artifactCount !== migration.validatedSource.artifactCount ||
    migration.candidateCapture.pathSetSha256 !== migration.validatedSource.pathSetSha256 ||
    migration.validatedSource.skillCount !== migration.migratedSource.skillCount ||
    migration.validatedSource.artifactCount !== migration.migratedSource.artifactCount ||
    migration.validatedSource.pathSetSha256 !== migration.migratedSource.pathSetSha256
  ) {
    return false;
  }

  const paths = new Set();
  const records = [...migration.approvedConflicts, ...migration.rewrittenAfterMigration];
  for (const record of records) {
    if (typeof record?.path !== 'string' || paths.has(record.path)) return false;
    paths.add(record.path);
  }
  return (
    migration.approvedConflicts.every(
      ({ candidateHash, finalHash, validatedHash }) =>
        isSha256(candidateHash) &&
        isSha256(validatedHash) &&
        isSha256(finalHash) &&
        candidateHash !== validatedHash,
    ) &&
    migration.rewrittenAfterMigration.every(
      ({ finalHash, sourceHash }) =>
        isSha256(sourceHash) && isSha256(finalHash) && sourceHash !== finalHash,
    )
  );
}

function historicalSourceMatches(source) {
  const actualSummary = summarizeHashes(source.actualHashes ?? {});
  return (
    source.available === true &&
    source.skillCount === source.actualSkillCount &&
    source.artifactCount === source.actualArtifactCount &&
    source.pathSetSha256 === source.actualPathSetSha256 &&
    source.treeSha256 === source.actualTreeSha256 &&
    source.actualSkillCount === actualSummary.skillCount &&
    source.actualArtifactCount === actualSummary.artifactCount &&
    source.actualPathSetSha256 === actualSummary.pathSetSha256 &&
    source.actualTreeSha256 === actualSummary.treeSha256
  );
}

function migrationRecordsMatchSources(migration) {
  const validatedHashes = migration.validatedSource.actualHashes ?? {};
  const candidateHashes = { ...validatedHashes };
  const migratedHashes = { ...validatedHashes };

  for (const { candidateHash, finalHash, path, validatedHash } of migration.approvedConflicts) {
    if (validatedHashes[path] !== validatedHash) return false;
    candidateHashes[path] = candidateHash;
    migratedHashes[path] = finalHash;
  }
  for (const { finalHash, path, sourceHash } of migration.rewrittenAfterMigration) {
    if (validatedHashes[path] !== sourceHash) return false;
    migratedHashes[path] = finalHash;
  }

  return (
    digestSummaryMatches(migration.candidateCapture, summarizeHashes(candidateHashes)) &&
    digestSummaryMatches(migration.migratedSource, summarizeHashes(migratedHashes))
  );
}

export function validateAgentSkillFacts(facts) {
  const findings = [];
  const canonical = facts.canonical ?? {};
  const compatibility = facts.compatibility ?? {};
  const skills = [...(canonical.skills ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  if (!canonical.exists) {
    findings.push(finding('AGENT_SKILLS_CANONICAL_MISSING', CANONICAL_PATH));
  } else if (canonical.type !== 'directory') {
    findings.push(finding('AGENT_SKILLS_CANONICAL_TYPE', CANONICAL_PATH));
  }

  for (const skill of skills) {
    if (skill.entrypointType !== 'file') {
      findings.push(
        finding('AGENT_SKILLS_ENTRY_MISSING', `${CANONICAL_PATH}/${skill.name}/SKILL.md`),
      );
    }
  }

  for (const entry of [...(canonical.entries ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (entry.type !== 'directory') {
      findings.push(finding('AGENT_SKILLS_ENTRY_TYPE', `${CANONICAL_PATH}/${entry.name}`));
    }
  }

  const hiddenOrUnsafePaths = new Set([
    ...(canonical.ignoredPaths ?? []),
    ...(canonical.ignorePolicyPaths ?? []),
  ]);
  for (const path of [...hiddenOrUnsafePaths].sort()) {
    findings.push(finding('AGENT_SKILLS_IGNORED', path));
  }
  for (const path of [...(canonical.untrackedPaths ?? [])].sort()) {
    findings.push(finding('AGENT_SKILLS_UNTRACKED', path));
  }

  if (!compatibility.exists || compatibility.resolution === 'missing') {
    findings.push(finding('AGENT_SKILLS_COMPAT_MISSING', COMPATIBILITY_PATH));
  } else if (compatibility.type !== 'symlink') {
    findings.push(finding('AGENT_SKILLS_COMPAT_NOT_LINK', COMPATIBILITY_PATH));
  } else {
    if (compatibility.linkTarget?.startsWith('/')) {
      findings.push(finding('AGENT_SKILLS_COMPAT_ABSOLUTE', COMPATIBILITY_PATH));
    }

    const resolutionCodes = {
      broken: 'AGENT_SKILLS_COMPAT_BROKEN',
      cycle: 'AGENT_SKILLS_COMPAT_CYCLE',
      escape: 'AGENT_SKILLS_COMPAT_ESCAPE',
    };
    const resolutionCode = resolutionCodes[compatibility.resolution];
    if (resolutionCode) {
      findings.push(finding(resolutionCode, COMPATIBILITY_PATH));
    }

    if (
      compatibility.resolution === 'ok' &&
      (compatibility.linkTarget !== EXPECTED_LINK_TARGET ||
        compatibility.realPath !== canonical.realPath)
    ) {
      findings.push(finding('AGENT_SKILLS_COMPAT_TARGET', COMPATIBILITY_PATH));
    }

    if (compatibility.gitMode !== '120000') {
      findings.push(finding('AGENT_SKILLS_GIT_MODE', COMPATIBILITY_PATH));
    }
  }

  for (const guidance of [...(facts.guidance ?? [])].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    const compatibilityMissing =
      guidance.compatibilityRequired !== false && !guidance.compatibilityDeclared;
    if (!guidance.canonicalDeclared || compatibilityMissing) {
      findings.push(finding('AGENT_SKILLS_GUIDANCE_DRIFT', guidance.path));
    }
  }

  for (const path of [...(facts.tooling?.writerDriftPaths ?? [])].sort()) {
    findings.push(finding('AGENT_SKILLS_TOOLING_VENDOR_WRITE', path));
  }

  const migration = facts.migration ?? {};
  if (!migration.exists || !migrationContractIsValid(migration)) {
    findings.push(finding('AGENT_SKILLS_MIGRATION_CONTRACT', MIGRATION_CONTRACT_PATH));
  } else if (migration.validatedSource.available !== true) {
    findings.push(finding('AGENT_SKILLS_MIGRATION_SOURCE', MIGRATION_CONTRACT_PATH));
  } else if (
    !historicalSourceMatches(migration.validatedSource) ||
    !migrationRecordsMatchSources(migration)
  ) {
    findings.push(finding('AGENT_SKILLS_MIGRATION_HASH', MIGRATION_CONTRACT_PATH));
  }

  findings.sort(compareByPathThenCode);
  return {
    artifactCount: canonical.artifactCount ?? skills.length,
    findings,
    skillCount: skills.length,
  };
}

export const agentSkillTopology = Object.freeze({
  canonicalPath: CANONICAL_PATH,
  compatibilityPath: COMPATIBILITY_PATH,
  expectedLinkTarget: EXPECTED_LINK_TARGET,
  migrationDerivation: MIGRATION_DERIVATION,
  migrationContractPath: MIGRATION_CONTRACT_PATH,
});
