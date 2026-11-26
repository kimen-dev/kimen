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
  // Spec 154 (action per event, approved 2026-11-21) measured against main
  // fb7f11c0: the per-event wiring and checks, now in the live surface the document
  // ships too, and the agent texts add 1,156 / 331 / 300 B to the MCP Apps document
  // and 4,166 / 1,109 / 974 B to kimen-mcp.
  // Spec 155 Task 4 (the live surface's reset op) measured against main
  // 0b5c847c on macOS: +1,197 / 337 / 298 B for the document and +1,197 / 342 /
  // 299 B for kimen-mcp, added here exactly so the headroom stays what it was.
  // The founder approved re-basing all three metrics by that cost (2026-11-22).
  // Spec 158 (read-only native tables, approved 2026-11-22) measured against main
  // 3556b3dd on macOS: the seven catalog entries, the table content model, the
  // emitter's self-validating example and, in kimen-mcp only, the guide's table
  // section add 5,553 / 1,495 / 1,190 B to the MCP Apps document and 13,334 /
  // 3,250 / 2,121 B to kimen-mcp, which carries the document and its own catalog.
  // The founder approved re-basing all three metrics by that cost (2026-11-22).
  // Spec 161 (an action is a report, approved 2026-11-24) measured against main
  // 3329aea1 on macOS: the event descriptions that say when eight events fire
  // without a gesture add 518 / 198 / 146 B to the MCP Apps document and
  // 1,044 / 307 / 99 B to kimen-mcp, which carries the document and its own
  // catalog. The founder approved re-basing all three metrics by that cost
  // (2026-11-24).
  // Spec 162 (action-rate budget, approved 2026-11-24) measured against main
  // e96a74d5 on macOS: the per-surface token bucket in the shared catalog code,
  // its diagnostic, the bridge's fired-on revision and the host's local actions
  // add 1,472 / 672 / 420 B to the MCP Apps document and 1,661 / 735 / 355 B to
  // kimen-mcp, added here exactly so the headroom stays what it was. The founder
  // approved re-basing all three metrics by that cost, two review fixes included
  // (2026-11-24).
  // Preference modes over themes (integrator feedback 0.1.3, item 1) measured
  // against main 14909122 on macOS: the 37 mode tokens and the important mode
  // rules grow the embedded onmars stylesheet, adding 5,131 / 434 / 539 B to the
  // MCP Apps document and 5,131 / 407 / 420 B to kimen-mcp, on top of specs 161
  // and 162. Approved by the founder (2026-11-24).
  // Spec 163 (MCP Apps waiting placeholder, approved 2026-11-24) measured against
  // main aa00748e on macOS: the text-free skeleton, its busy mark and the timer
  // that stills it add 358 / 127 / 93 B to the MCP Apps document and 358 / 123 /
  // 329 B to kimen-mcp. Only the document's raw bytes outgrew their headroom
  // (154 B left on that main); the founder approved re-basing that one metric by
  // the 358 B the placeholder costs (2026-11-24, «Sí, sube 358 B»), added on top
  // of the preference-modes base above.
  // The lean catalog runtime (2026-11-25) re-based both DOWN, measured on macOS:
  // the catalog parses with zod/mini, imported as a module namespace (the
  // server's `import { z } from 'zod'` pulled in all of classic zod), and its
  // validator and renderer read the generated structure without the guidance
  // prose. Against main b1382831 the document was 1,527,736 / 374,475 /
  // 283,998 B and kimen-mcp 3,993,653 / 791,451 / 551,735 B; with the change,
  // merged with main 15af665b (0.3.0, spec 165), they measure 1,296,064 /
  // 299,593 / 224,886 B and 3,222,799 / 642,510 / 474,809 B. Each limit (base
  // plus the component allowances) is that size plus about 1 % of gzip and
  // brotli for Linux CI's output and 0.1 % of raw bytes, which esbuild emits
  // alike everywhere: 1,297,361 / 302,589 / 227,135 and 3,226,022 / 648,936 /
  // 479,558 B.
  // The per-component modules' Stencil runtime compiled for Kimen
  // (externalRuntime: false, 2026-11-25) measured against main ac20a900 on
  // macOS: -45,945 / 15,040 / 13,040 B for the document and -46,089 / 14,995 /
  // 13,015 B for kimen-mcp, taken off here exactly so the headroom stays what
  // it was.
  // Short keys for the elements Stencil's compiler keys
  // (packages/elements/scripts/short-vdom-keys.mjs, 2026-11-26) re-based both
  // DOWN, measured against main de03accd on macOS: the document went from
  // 1,250,119 / 284,547 / 211,781 to 1,237,731 / 273,016 / 204,312 B, and
  // kimen-mcp from 3,176,710 / 627,508 / 461,902 to 3,164,322 / 615,937 /
  // 454,028 B. Each limit is now that size plus 0.1 % of raw bytes and 1 % of
  // gzip and brotli: 1,238,969 / 275,747 / 206,356 and 3,167,487 / 622,097 /
  // 458,569 B.
  mcpApps: { raw: 528_889, gzip: 87_224, brotli: 68_315 },
  mcpServer: { raw: 1_798_878, gzip: 325_479, brotli: 296_320 },
  // A browser host that validates and renders agent specs (validateUiSpec and
  // renderUiSpec from the packed @kimen/catalog, bundled for production:
  // packages/catalog/scripts/host-weight.mjs). Set on 2026-11-25 at what it
  // measured on macOS with the lean runtime above, merged with main 15af665b,
  // 125,455 / 29,479 / 25,933 B (715,883 / 169,806 / 136,980 B before), with the
  // same margins. No component declares an allowance here: a component that
  // joins the catalog grows the host by its structure, so re-base this by the
  // cost it measures.
  genuiHost: { raw: 125_581, gzip: 29_774, brotli: 26_193 },
  // #316 and #341 together measured 5.30 kB for Material 3 after regeneration.
  // Document 2's shared semantic tokens (radii, popup, floating-list, feature-tile…) added
  // about 420 B of onmars growth no single component owns; approved 2026-11-20 to publish.
  // Document 2's batch 2 (Sources, InteractiveList, InputVariants, FullscreenDialog)
  // measured 20,246 B together with Carousel, 80 B more than the sum of the marginals
  // each measured alone: minified and brotlied, the combined additions compress worse.
  // Preference modes over themes measured +348 B for onmars (20,284 to 20,632 B
  // minified and brotlied) and -223 B for material3, which no longer re-asserts
  // its mode values. Pending founder approval.
  tokenStylesheets: { onmars: 13_278, material3: 5_600, base: 250 },
  // Spec 166's split sheets, approved by the founder on 2026-11-25: the core,
  // a page with ki-button (core and its sheet), the ten-component page of the
  // weight report (core and its fourteen sheets), and a ceiling for every tag
  // sheet. Fixed: no component marginal adds to them. Measured on macOS at
  // 6,812 / 8,075 / 11,187 B and 1,971 B for the largest sheet (ki-prompt-input).
  tokenSheets: { core: 7_000, buttonPage: 8_300, tenComponentPage: 11_400, tagSheet: 2_200 },
  // Whole pages, script and token stylesheets, in brotli bytes
  // (packages/elements/scripts/page-weight.mjs): one ki-button, and the ten
  // components of a typical form page. Measured on 2026-11-26 against main
  // ac20a900 with the runtime compiled for Kimen (31,028 and 57,175 B), plus
  // about 3 %. The short vDOM keys took the ten-component page to 56,426 B
  // (its script 36,381 -> 35,632 B), and its limit to that plus 1 %; ki-button
  // carries no compiler key, so its page stays.
  pages: { button: 32_000, tenComponents: 56_991 },
};

export function deriveBundleSizeBudgets(components) {
  const limits = {
    mcpApps: { ...BASE_BUDGETS.mcpApps },
    mcpServer: { ...BASE_BUDGETS.mcpServer },
    genuiHost: { ...BASE_BUDGETS.genuiHost },
    tokenStylesheets: { ...BASE_BUDGETS.tokenStylesheets },
    tokenSheets: { ...BASE_BUDGETS.tokenSheets },
    pages: { ...BASE_BUDGETS.pages },
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

/** The shipped limits: the bases above plus every component's declared allowances. */
export function readBundleSizeBudgets() {
  const componentsRoot = fileURLToPath(
    new URL('../../packages/elements/src/components/', import.meta.url),
  );
  const components = readComponentMetadataByTag(componentsRoot);
  return deriveBundleSizeBudgets(Array.from(components, ([tag, metadata]) => ({ tag, metadata })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(readBundleSizeBudgets())}\n`);
}
