import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readComponentMetadataByTag } from '../../packages/elements/scripts/component-metadata.mjs';

// The pre-discovery ceilings include the headroom already granted to shared
// code and existing components. Keep that headroom fixed. Merge main and
// measure the same generated artifacts with and without the component change.
// Record and review only its measured positive marginal bytes in component.json
// under sizeBudget. Rebase these constants only for approved shared-code growth.
const BASE_BUDGETS = {
  // Document 2's batch (2026-11-20) measured the MCP Apps document at 1,404,541 /
  // 343,083 / 262,075 B and kimen-mcp at 3,802,610 / 746,808 / 524,979 B, more than
  // the per-component allowances (many measured against an older main). The base
  // absorbs that approved growth so the release can ship; re-measuring each
  // component's marginal is a follow-up.
  // Plus about 1% for Linux CI's zlib/brotli output, which differs slightly from macOS.
  // Spec 152 (guardrail containment, approved 2026-11-20) measured against
  // main 61eb8d2b: the reference and form-action checks in the shared catalog
  // code add 1,383 / 349 / 306 B to the MCP Apps document and 3,176 / 697 /
  // 341 B to kimen-mcp.
  // The glyphs components draw themselves had been dropped from both by an undeclared
  // side effect; restoring them (2026-11-20) measured +859 B raw for the document and
  // +879 B raw for kimen-mcp, which the raw bases absorb. The compressed growth fits.
  // Deriving the 500-step alphas from their ramp with color-mix() (0.1.1 integrator
  // feedback, item 1; approved 2026-11-21) measured +1,066 B raw for kimen-mcp, which
  // embeds the token stylesheets; the raw base absorbs it. The compressed growth fits,
  // and the MCP Apps document stays within its base.
  // Spec 153 (action collect, approved 2026-11-21) measured against main
  // 618df310: the collect checks, the dispatch-time validity gate and the agent
  // texts add 2,350 / 744 / 685 B to the MCP Apps document and 5,770 / 1,764 /
  // 1,285 B to kimen-mcp, which also carries the document.
  // Spec 157 (MCP Apps live updates, approved 2026-11-21) paints the document through
  // the live surface, which the bundler dropped before because nothing imported it,
  // so the live-surface code of specs 035 and 155 now ships in both. Measured against
  // main f79f91f1 on macOS: +18,218 / 5,856 / 4,981 B for the document and
  // +18,736 / 5,951 / 5,025 B for kimen-mcp, added here exactly so the headroom stays
  // what it was. The founder approved re-basing by the cost measured there (2026-11-21).
  mcpApps: { raw: 802_810, gzip: 183_949, brotli: 145_972 },
  mcpServer: { raw: 2_599_661, gzip: 492_412, brotli: 386_651 },
  // #316 and #341 together measured 5.30 kB for Material 3 after regeneration.
  // Document 2's shared semantic tokens (radii, popup, floating-list, feature-tile…) added
  // about 420 B of onmars growth no single component owns; approved 2026-11-20 to publish.
  // Document 2's batch 2 (Sources, InteractiveList, InputVariants, FullscreenDialog)
  // measured 20,246 B together with Carousel, 80 B more than the sum of the marginals
  // each measured alone: minified and brotlied, the combined additions compress worse.
  tokenStylesheets: { onmars: 12_930, material3: 5_600, base: 250 },
};

export function deriveBundleSizeBudgets(components) {
  const limits = {
    mcpApps: { ...BASE_BUDGETS.mcpApps },
    mcpServer: { ...BASE_BUDGETS.mcpServer },
    tokenStylesheets: { ...BASE_BUDGETS.tokenStylesheets },
  };
  for (const { tag, metadata } of components) {
    for (const [target, allowances] of Object.entries(metadata.sizeBudget ?? {})) {
      // worstCase is a per-component ceiling (run-size-limit.mjs), not an aggregate allowance.
      if (target === 'worstCase') continue;
      for (const [metric, bytes] of Object.entries(allowances)) {
        const limit = limits[target][metric] + bytes;
        if (!Number.isSafeInteger(limit)) {
          throw new Error(`Bundle size limit overflow for ${target}.${metric} after ${tag}`);
        }
        limits[target][metric] = limit;
      }
    }
  }
  return limits;
}

function readBundleSizeBudgets() {
  const componentsRoot = fileURLToPath(
    new URL('../../packages/elements/src/components/', import.meta.url),
  );
  const components = readComponentMetadataByTag(componentsRoot);
  return deriveBundleSizeBudgets(Array.from(components, ([tag, metadata]) => ({ tag, metadata })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(readBundleSizeBudgets())}\n`);
}
