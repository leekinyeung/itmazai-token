# Public footer design QA — 2026-11-02

final result: passed

## Reference and evidence

- Selected visual: `/Users/leekinyeung/.codex/generated_images/01a19a2e-c9d5-7432-9bd8-2938252e8781/exec-38802cb0-9a99-473e-945c-bb287ee6296e.png` (1881 × 836).
- Implementation: `http://127.0.0.1:4320/`, production Rsbuild output with local deterministic API fixtures. No live account, support message, provider request or production configuration was changed.
- Final screenshots: `home-desktop-light.jpg`, `home-desktop-dark.jpg`, `home-mobile-light.jpg`, `home-mobile-dark.jpg`. Combined handoff: `preview.jpg`.
- CSS viewports: desktop 1440 × 900, mobile 375 × 900; matrix also covers widths 768 and 1024. Browser-exported desktop JPEGs are 1429 × 893; mobile JPEGs are 364 × 874. DOM metrics use CSS pixels, rather than assuming exported pixels equal CSS pixels.
- Full comparison: `comparison-full.jpg`. Source and desktop capture were normalized proportionally to 1440px width; footer regions were then compared without stretching typography. Focused typography/column comparison: `comparison-detail.jpg`.
- State: anonymous, Simplified Chinese, ocean-breeze preset, sans font, both light and dark. French and Russian captures are additional wrapping checks.

## Findings and accepted differences

No actionable P0/P1/P2 findings remain.

- Typography: footer inherits the same global font family as the body. The approved implementation sizes (16px brand, 14px navigation, 12px copyright) take precedence over the oversized typography in the generated concept. Labels wrap; no ellipsis is applied to footer branding or navigation.
- Spacing/layout: brand plus three navigation groups follows the selected hierarchy. Desktop uses a 2:3 brand/navigation split with equal navigation columns, 48px horizontal gaps and 64px main vertical padding. Tablet places branding above three columns; mobile uses two columns with the third group wrapping. Short desktop legal pages end at the viewport bottom; long pages scroll naturally.
- Colors/tokens: background, foreground, muted text, borders and focus rings use existing theme tokens. 120 preset/font/mode/width combinations showed identical footer/body font inheritance and no horizontal overflow. The minimum measured muted-text contrast was 5.49:1, calculated from browser computed colors with the installed CSS color parser and sRGB relative luminance.
- Assets: original configured logo is reused at 28px. No generated replacements, custom illustrations, new icons or third-party dependencies were introduced.
- Copy: default branding keeps the existing localized name. The support heading and question link reuse the product's established translations (帮助与支持 / 我的问题). Existing New API copyright wording and repository destination are retained in place of the concept's shortened attribution.

## Verification

- `bun run test src/components/layout/__tests__ src/features/home/__tests__/landing.test.tsx`: 3 suites, 51 tests passed. These include navigation module switches, default/custom/invalid documentation links, all seven language switches, custom HTML precedence and protected external links, custom columns/copyright, long names, keyboard access, and custom Markdown/HTML/iframe homepage footer placement.
- `bun run typecheck`: passed.
- Targeted `bunx oxlint -c .oxlintrc.json` on the seven changed TypeScript files: passed.
- Targeted `bunx oxfmt -c .oxfmtrc.json --check` on the eight changed code/style files: passed. Original license headers were preserved.
- `bun run i18n:sync`: passed; missingCount is zero for every locale. All eight newly added strings have translations in seven locales.
- `bun run build`: passed (Rsbuild reported 16.7s).
- `git diff --check`: passed.
- Final browser matrix: four page types (homepage, pricing, support, short user agreement) × four widths × two color modes = 32 captures. Each has exactly one footer, no document horizontal overflow, and minimum footer link height of 44px. See `layout-metrics.json`.
- Ten named theme presets × three resolved fonts × two modes × two widths = 120 CSS inheritance checks. DOM theme/font overrides were used only for local CSS verification and removed by reloading afterward. See `themes-fonts.json` and `contrast.json`.
- The footer model-square link opened the real local pricing route. The original New API link exposes a visible keyboard focus ring. Custom HTML was also verified through actual status configuration: navigation groups disappear and external links retain `noopener noreferrer`.
- Browser console inspection returned no warning/error entries at the inspected states.

## Comparison history and limits

- Compared the selected source and implementation together, then checked the typography/column close-up. Differences in brand language, existing attribution length, product terminology, and font scale follow the approved plan and current site conventions.
- Initial mobile proof captures sometimes showed the preceding content while scrolling. Captures were repeated after a fresh accessibility-state observation confirmed scrolling had settled; final proof images show the complete footer.
- Backend API behavior and live availability of external documentation are outside this frontend fixture-based verification. Existing authentication/authorization guards and billing logic were not changed.
- No outstanding implementation blocker or required follow-up polish remains.
