// @spec:019-agent-skills-canonical

const CANONICAL_PATH = '.agents/skills';
const COMPATIBILITY_PATH = '.claude/skills';
const EXPECTED_LINK_TARGET = '../.agents/skills';

function compareByPathThenCode(left, right) {
  return left.path.localeCompare(right.path) || left.code.localeCompare(right.code);
}

function finding(code, path) {
  return { code, path };
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

  for (const path of [...(canonical.ignoredPaths ?? [])].sort()) {
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

  findings.sort(compareByPathThenCode);
  return {
    artifactCount: canonical.artifactCount ?? skills.length,
    findings,
    skillCount: skills.length,
  };
}

export function reconcileMigrationEntries({
  approvedConflictPaths = [],
  candidateEntries = [],
  requiredPaths = [],
  validatedEntries = [],
}) {
  const approved = new Set(approvedConflictPaths);
  const candidate = new Map(candidateEntries.map((entry) => [entry.path, entry]));
  const validated = new Map(validatedEntries.map((entry) => [entry.path, entry]));
  const allPaths = new Set([...requiredPaths, ...candidate.keys(), ...validated.keys()]);
  const required = new Set(requiredPaths);
  const conflicts = [];
  const entries = [];
  const findings = [];

  for (const path of [...allPaths].sort()) {
    const candidateEntry = candidate.get(path);
    const validatedEntry = validated.get(path);

    if (!candidateEntry && !validatedEntry) {
      if (required.has(path)) {
        findings.push(finding('AGENT_SKILLS_MIGRATION_OMISSION', path));
      }
      continue;
    }

    if (candidateEntry && validatedEntry && candidateEntry.hash !== validatedEntry.hash) {
      conflicts.push(path);
      if (!approved.has(path)) {
        findings.push(finding('AGENT_SKILLS_MIGRATION_CONFLICT', path));
      }
      entries.push({ ...validatedEntry, resolution: 'main-validated' });
      continue;
    }

    if (candidateEntry && validatedEntry) {
      entries.push({ ...validatedEntry, resolution: 'identical' });
    } else if (validatedEntry) {
      entries.push({ ...validatedEntry, resolution: 'main-validated' });
    } else {
      entries.push({ ...candidateEntry, resolution: 'unique-preserved' });
    }
  }

  findings.sort(compareByPathThenCode);
  return { conflicts, entries, findings };
}

export const agentSkillTopology = Object.freeze({
  canonicalPath: CANONICAL_PATH,
  compatibilityPath: COMPATIBILITY_PATH,
  expectedLinkTarget: EXPECTED_LINK_TARGET,
});
