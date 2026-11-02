# Homepage design QA

- Selected visual truth: `/Users/leekinyeung/.codex/generated_images/01a18172-81d1-7bb1-b482-c3665d18a38b/exec-ba50767c-7e6a-4e34-a143-228d7b256d45.png` (1656 × 950, main content only).
- Local implementation: http://127.0.0.1:4173/ (local production build; read-only public API preview on port 4180).
- Implementation capture: `/private/tmp/taodock-home-preview/desktop-final.png` (1536 × 1024).
- State: anonymous, Simplified Chinese, light theme. Existing public navigation retained without source changes; configured branding and legal links retained through a compatible compact footer option.
- Comparison normalization: source content scaled proportionally to 1536 × 881; implementation content cropped below the unchanged 64 px header and above the footer to 1536 × 907. Source padded below by 26 px without stretching. Both compared at CSS pixel density 1.

## Generated assets

- `/Users/leekinyeung/GolandProjects/itmazai-token/web/public/images/home/model-ecosystem.png` — 1715 × 917 transparent PNG, generated with the built-in image_gen tool. Prompt direction: isolate the selected artwork's five floating frosted provider tiles on softly lit pale-blue steps, matching brand marks, composition and materials; no page UI or text.
- `/Users/leekinyeung/GolandProjects/itmazai-token/web/public/images/home/provider-ribbon.png` — 1386 × 1135 transparent PNG, generated with the built-in image_gen tool. Prompt direction: isolate the subtle pale-blue folded translucent ribbon motif from the selected model card, with soft dimensional shading and fading edges; no logos, text, card surface or UI. Reused with hue filters for the five provider accents.

## Comparison history

1. **P2 — compact desktop overflow, resolved.** At 1366 × 768, the initial document measured 880 px tall. Reduced hero height, card spacing and vertical gaps for shorter desktop viewports. Final post-refinement measurements are 1366 × 768 with footer bottom 768, 1536 × 1024 with footer bottom 1024, and 1024 × 768 without overflow. Evidence: `compact-final.png` and `layout-metrics.json` in the preview evidence folder.
2. **P2 — undersized hero and card content, resolved.** Initial same-input comparisons at `/private/tmp/taodock-home-preview/comparison-full-initial.png`, `comparison-cards-initial.png` and `comparison-hero-initial.png` show the illustration, provider marks and card typography smaller than the selected design. Increased illustration scale and Chinese headline, used 60 px provider icons and 24 px headings, and replaced oversized decorative provider marks with the generated folded-ribbon bitmap. Final paired full-view and focused comparisons confirm the intended hierarchy and card artwork.
3. **P2 — small accent text contrast.** Scoped homepage accent colors were adjusted for readable links and white button labels while retaining the project's primary hue. Dark-theme links use a lighter mix than button fills. Shared navigation colors were not modified.
4. **P2 — dark illustration overlapped copy, resolved.** Enlarging the light-mode illustration exposed a low-contrast overlap in dark mode (`dark-overlap-initial.png`). Dark mode now uses a smaller, right-aligned illustration. Final DOM measurement: illustration left 1064 px, supporting-copy right 1001.95 px; final `dark-final.png` confirms separation. Narrower desktop viewports also use the smaller composition.

## Required fidelity surfaces

- Typography: preserve the project system font; Chinese display type follows the selected hierarchy. Longer French and Russian text was checked in the compact desktop viewport. New strings are translated in all seven locales.
- Spacing/layout: retain hero → five provider previews → integration strip. Desktop uses one viewport; tablet/mobile reflow without horizontal page overflow. No fixed height or clipping of readable content.
- Colors/tokens: use project background, foreground, card, border and primary tokens. Scoped accent contrast corrections are intentional; no global theme changes.
- Imagery: hero and folded-ribbon motif are generated raster assets; provider logos come from the installed icon library. No handcrafted SVG or CSS illustration substitutes. Paired close-ups confirm recognizable marks, matching material direction, preserved image proportions and clean integration on light surfaces; dark-mode positioning keeps the artwork separate from readable copy.
- Copy/content: no invented prices, uptime or availability; provider examples link to the existing model square with search filters. Configured API base address and documentation URL are honored.

## Functional verification

- Focused Vitest suites: 29 tests passed, including existing custom-home content/cache/error behavior and new homepage destinations, configured endpoint copying, provider search, documentation URLs, language switching and compact footer behavior.
- Browser: Qwen preview navigated to `/pricing?search=qwen`; keyboard Tab reached the provider controls and Enter opened `/pricing?search=OpenAI`, where the visible search input contained `OpenAI`. Copy action displayed success; key action preserves `/sign-in?redirect=%2Fkeys` for anonymous users.
- Browser: 1536 × 1024 and 1366 × 768 desktop, 834 × 1194 tablet, 390 × 844 mobile; no horizontal overflow. French and Russian compact layouts fit one desktop viewport.
- Browser console: final fresh-load → provider navigation → back sequence produced no error entries. An earlier router intent-preload cancellation appeared during the repeated build/QA session and did not reproduce in the fresh production smoke check; no router changes were introduced.
- Typecheck and production build passed. Touched-file lint has no errors; the existing custom-footer `dangerouslySetInnerHTML` warning remains unchanged.
- Reuse: existing `PublicLayout`, `Button`, `Card` and `CopyButton`; existing `Footer` extended with an optional compact variant. `ProviderBadge` is a compact label and the pricing `ModelCard` requires individual model/pricing state, so the new provider-family preview composes shared primitives instead.

## Final comparison

- Full-view paired evidence: `/private/tmp/taodock-home-preview/comparison-full.png`.
- Focused card typography, icon, ribbon and action evidence: `/private/tmp/taodock-home-preview/comparison-cards.png`.
- Focused hero material, composition and image-quality evidence: `/private/tmp/taodock-home-preview/comparison-hero.png`.
- Required surfaces checked: system-font hierarchy and Chinese wrapping; desktop spacing/radii/grid; theme-token palette and scoped accent contrast; actual raster artwork and installed provider logos; all source copy and configured links.
- No remaining actionable P0/P1/P2 findings. The source has a stronger ambient blue background and slightly larger small print; the implementation keeps a quieter theme-token background and 15 px descriptions for multilingual five-column cards. These are P3 polish differences, not clipping or missing content.
- Header differences are intentionally excluded: the user requested the existing navigation unchanged. Shared navigation/layout source files have no diff. Existing branding and attribution remain intact.
- Implementation checklist complete: homepage/body only; five provider links; configured endpoint and copy; configured documentation URL; compact shared footer; seven locales; focused tests; typecheck; touched-file lint; format check; local production build; desktop/mobile/theme/browser checks. Preview is running locally and has not been deployed.

final result: passed

# Login and registration design QA — 2026-10-31

## Visual target and evidence

- Selected visual truth: the first displayed design, `/Users/leekinyeung/.codex/generated_images/01a190ae-1011-7173-8859-a9769bbae4c7/exec-92491800-fa10-41a1-9994-4d6900da4559.png` (2103 × 748).
- Implementation: `http://localhost:5173/sign-in` and `http://localhost:5173/sign-up`.
- State used for fidelity comparisons: anonymous, Simplified Chinese, light theme, empty fields, local server authentication options.
- Final desktop captures: `/private/tmp/taodock-auth-qa/signin-desktop-final.jpg` and `/private/tmp/taodock-auth-qa/signup-desktop-final.jpg`, each 1051 × 748 at a 1051 × 748 CSS viewport, density 1.
- Normalization: compare the source's left 1051 px login frame and right 1051 px registration frame at native scale; omit the central 1 px divider. Final comparisons do not stretch the source or implementation.
- Full-view paired evidence: `/private/tmp/taodock-auth-qa/signin-comparison-final.jpg` and `/private/tmp/taodock-auth-qa/signup-comparison-final.jpg`.
- Focused paired evidence: `signin-form-comparison.jpg`, `signup-form-comparison.jpg`, `signin-art-comparison.jpg`, and `signup-art-comparison.jpg` in the same evidence directory.
- Combined actual-page preview: `/private/tmp/taodock-auth-qa/auth-pages-final.jpg`.

## Assets and reuse

- Reused configured branding, the existing `web/public/images/home/model-ecosystem.png` artwork, existing authentication forms, `PasswordInput`, `InputGroup`, `Button`, `Separator`, `LanguageSwitcher`, and `ThemeSwitch`.
- Extended `AuthLayout` with an optional split variant used by login and registration. Other authentication screens continue to use its default layout. Extended `LanguageSwitcher` with an optional visible language label and `PasswordInput` with an optional leading icon; existing callers remain supported.
- Generated one ambient backdrop with built-in ImageGen, using the selected design as a reference. Prompt: a 1024 × 1536 portrait, near-white to pale-sky-blue ambient light field, with no text, logos, objects, symbols or illustration. The existing model artwork and editable UI copy are composed above it.
- Delivered backdrop: `web/src/assets/auth/sky-backdrop.webp`, 1024 × 1536, 22,926 bytes after quality-95 WebP encoding of the generated 1,432,219-byte PNG. Dimensions and composition are preserved. The production build contains one hashed backdrop resource. No dependencies were added.

## Comparison history

1. **P2 — undersized typography and illustration, resolved.** The initial paired capture, `/private/tmp/taodock-auth-qa/signup-comparison-initial.jpg`, showed weaker headings and a smaller illustration than the selected design. Increased heading and supporting-copy sizes, enlarged the existing raster artwork, and adjusted its vertical spacing. Final full-view and focused comparisons show the intended two-column hierarchy and image emphasis.
2. **P2 — inconsistent input dimensions, resolved.** The initial browser render used the shared password control's original compact height. Scoped styles now cover the real form-control slots as well as grouped username inputs. Browser measurements confirm 48 px password controls and 48 px username groups; validation messages retain their normal document flow.
3. **P2 — mobile theme icon hidden, resolved.** An initial responsive selector hid decorative SVGs too broadly (`signin-mobile.jpg`). Replaced it with explicit responsive visibility on the language label/chevron. Final `signin-mobile-final.jpg` and `signup-mobile-final.jpg` show both language and theme controls; both measure 44 × 44 px.
4. **P2 — dark accent readability, resolved.** Separated action-fill and link/accent tokens. The dark accent is now lighter than the button fill; `signin-dark-final.jpg` verifies the adapted surface. The selected source specifies light mode only, so the dark palette is a functional adaptation rather than a literal source match.
5. **P2 — compact branding truncation, resolved.** At 320 px, the initial percentage width unnecessarily truncated the normal brand name. The header now reserves space for its actual controls; a browser measurement confirms the brand text fits. Long administrator-provided names still truncate within their available area.

## Required fidelity surfaces

- **Typography:** existing Public Sans and system CJK fallbacks; strong two-line brand statement, approximately 37 px desktop form headings, readable 18 px supporting copy and 16 px input text. Localized labels and password hints retain the product's existing terminology.
- **Spacing/layout:** equal desktop columns, unboxed form, generous margins, 24 px field rhythm, rounded primary actions, and account-navigation dividers. Below 900 px the decorative panel is removed and the form uses the available width. Chinese desktop and 390 × 844 mobile pages have no document overflow; French desktop and 320 px Russian content can scroll vertically without horizontal overflow or hidden actions.
- **Colors/tokens:** pale-blue raster backdrop with existing semantic foreground/background/border colors. The action is intentionally darker than the generated mock for readable white labels; the sampled final light-mode action color is RGB (40, 116, 204), approximately 4.71:1 against white. Dark mode uses separate readable accents.
- **Image quality:** original configured logo and existing five-provider raster illustration remain sharp and proportional. The generated backdrop stays smooth after WebP conversion. No CSS/SVG illustration substitutes were introduced. Small differences in provider-tile composition reflect reuse of the product's original artwork rather than redrawing provider marks.
- **Copy/content:** all nine new keys exist in all seven locales. Signup heading translations were refined through the required translation script, followed by `bun run i18n:sync`. No prices, customer counts, signup incentives, enabled OAuth providers, or QQ support were invented or reintroduced.

## Functional and security verification

- `bun run test src/features/auth src/components/__tests__/language-switcher.test.tsx`: 13 files, 93 tests passed. After the test-only TypeScript query correction, the focused auth-page suite passed again (5 tests).
- New regression cases exercise real login/signup pages: configured branding and navigation, password-manager autocomplete, password paste/show/hide, mismatch rejection without an API request, email-verification fields, explicit legal consent, disabled password/registration options, and language changes without clearing entered fields.
- `bun run typecheck`: passed. Touched-file `oxlint`: no errors or warnings. `oxfmt --check` on all nine touched code/style files: passed. `git diff --check`: passed.
- `bun run build`: passed; final build log `/private/tmp/taodock-auth-build.log`, completed in 8.83 s with a 22.9 kB hashed backdrop.
- Browser: navigation between login and registration, language switching, theme switching, 1051 × 748 desktop, 390 × 844 mobile and 320 × 640 narrow-screen layouts. French desktop and Russian narrow-screen text were checked. Empty signup submission displays the existing errors and focuses the username field; no account was created.
- Fresh reload and route navigation after restarting the development preview produced no new console error entries. A temporary route-HMR/language-chunk failure during concurrent build and development updates was resolved by restarting and reloading the preview, then successfully repeating language switching.
- Browser viewport override was reset and the original English interface language was restored. Theme selection was returned to the system setting. The registration page remains open.
- Security references consulted: [OWASP ASVS 5.0.0](https://asvs.owasp.org/), [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), and [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). This UI change preserves existing server authentication, verification, OAuth, challenge and session mechanisms; it adds no authentication bypass, credential logging or credential storage. Verification here covers the affected UI contracts and existing frontend auth regressions, not a full ASVS/server audit. Live credential submission, email delivery and disabled local OAuth/Turnstile providers were not exercised against real external services.

## Result

- No remaining actionable P0/P1/P2 findings. P3 differences: slightly darker accessible primary actions, existing localized label wording, and the original model artwork's minor arrangement differences.
- Implementation checklist complete: selected split layout; two working existing forms; optional language label; password adornments and accessibility; seven locales; mobile and dark variants; source comparisons; auth regression tests; typecheck; lint; formatting; build; fresh browser verification.

final result: passed

# Shared auth dark-mode design QA — 2026-10-31

## Visual target and scope

- Selected visual truth: first displayed dark-mode design, `/Users/leekinyeung/.codex/generated_images/01a190ae-1011-7173-8859-a9769bbae4c7/exec-3b9f9544-e045-4854-8710-b35b212d82b7.png` (1503 × 1046).
- Scope: the shared decorative panel on `/sign-in`, `/sign-up`, and `/forgot-password`; retain the existing form controls, authentication flow, responsive breakpoint, and light-mode imagery.
- Comparison state: anonymous signup, English, dark mode, empty fields, viewport 1135 × 790 CSS pixels, density 1.
- Normalization: source is uniformly resized to 1135 × 790 (same aspect ratio, subpixel rounding only); implementation is captured at that exact CSS viewport. Source: `/private/tmp/taodock-dark-auth/reference-normalized.png`.
- First implementation: `/private/tmp/taodock-dark-auth/signup-first.jpg`; paired full view `/private/tmp/taodock-dark-auth/comparison-full-first.png`; paired focused artwork `/private/tmp/taodock-dark-auth/comparison-art-first.png`.

## Comparison history

1. **P2 — dark artwork's front platform cropped, resolved.** The first paired focused comparison showed the inherited light-image negative bottom margin placing the new front step below the viewport. The dark-only rule now uses `margin-bottom: -1rem` and `transform: translateY(0.5rem)`, keeping the existing flex height constraint and fitting the artwork below the brand copy. Light-mode positioning is unchanged.
2. **P2 — raster platform silhouette truncated, resolved.** After correcting the position, a straight alpha cut remained on the first asset's lower front face. A targeted ImageGen repair completed the angular front point while preserving all five tiles. The repaired asset was losslessly encoded and recaptured after a fresh build/reload. Final full-view and focused comparisons show the complete front silhouette, all provider tiles, and no bright background rectangle or alpha halo.

## Final evidence and required fidelity surfaces

- Final implementation: `/private/tmp/taodock-dark-auth/signup-final.jpg`, 1135 × 790 pixels at the same 1135 × 790 CSS viewport, density 1; English, dark theme, anonymous, empty fields. The selected source remains 1503 × 1046; its normalized copy is 1135 × 790.
- Paired full-view comparison: `/private/tmp/taodock-dark-auth/comparison-full-final.png` (2270 × 790), source left and implementation right. Paired focused artwork comparison: `/private/tmp/taodock-dark-auth/comparison-art-final.png` (1136 × 400), showing both lower-left regions at matching scale.
- Shared-page captures: `/private/tmp/taodock-dark-auth/signin-final.jpg` and `/private/tmp/taodock-dark-auth/forgot-final.jpg`, each 1135 × 790, use the same final illustration and backdrop.
- **Fonts/typography:** retain the existing Public Sans/system fallback, weight, size, line height, letter spacing, and three-line English brand heading. No copy overlaps the illustration; form headings and labels retain their existing hierarchy.
- **Spacing/layout:** equal desktop columns and existing form widths/radii remain intact. The complete lower platform fits within the viewport. At 390 × 844, the existing responsive rule hides the decorative panel and keeps all three forms within the available width and height. No readable content is clipped to suppress scrolling.
- **Colors/tokens:** the new raster backdrop uses deep navy/graphite with restrained blue illumination; the smoky glass artwork has cyan and violet edge highlights. Existing semantic form, text, border, link and button tokens remain unchanged. The primary action is deliberately less saturated than the generated reference, preserving the existing readable UI palette.
- **Image quality:** five recognizable provider tiles, matching isometric arrangement, dark glass materials, clean true transparency, complete platform edges, proportional rendering and no visible compression artifacts. Artwork and background are raster assets generated from the selected visual; no CSS, SVG or text-glyph illustration substitutes.
- **Copy/content:** all existing localized content, configured branding and authentication options remain unchanged. No new strings, locale keys, credentials or external-service options were introduced.
- No remaining actionable P0/P1/P2 differences. P3 polish: generated tile contours/reflections vary slightly from the reference and the backdrop has a slightly stronger blue tint. Existing development-only query/router controls are excluded from visual fidelity comparison.

## Assets and component reuse

- Reuse the shared `AuthLayout`, existing `useTheme().resolvedTheme`, existing forms, `PasswordInput`, `InputGroup`, `LanguageSwitcher`, `ThemeSwitch` and responsive styles. A single decorative image switches source through the existing theme provider, including its existing system-theme resolution. No duplicate form implementation, additional theme listener or dependency is needed.
- Dark artwork: `web/src/assets/auth/model-ecosystem-dark.webp`, 1701 × 924 RGBA, 836,464 bytes. Dark background: `web/src/assets/auth/sky-backdrop-dark.webp`, 1064 × 1479 RGB, 792,144 bytes. Both lossless WebP files were decoded and checked pixel-for-pixel against their generated PNGs before the redundant project PNG copies were removed.
- Exact final artwork prompt: `/private/tmp/taodock-dark-auth/art-final-prompt.txt`. Intent: repair only the truncated front platform point of the isolated five-tile dark glass illustration; preserve provider marks, composition, lighting and true alpha margins. Exact backdrop prompt: `/private/tmp/taodock-dark-auth/backdrop-prompt.txt`. Intent: extract a smooth, empty deep-ink navy ambient field from the selected left-panel reference, without text, logos, tiles, objects or bright fog.
- Final production resources: `model-ecosystem-dark.995787bef4.webp` and `sky-backdrop-dark.2b74dc02aa.webp`. Light mode retains `/images/home/model-ecosystem.png` and the original light backdrop.

## Functional verification and limits

- Test-first theme regression: the three new route cases initially failed, with 7 existing cases passing (`/private/tmp/taodock-dark-auth/before-tests.log`). After implementation, `bun run test src/features/auth/__tests__/auth-pages.test.tsx` passed all 10 cases. Each new case checks the real route's image source through dark/light switching and preservation of entered text.
- `bun run test src/features/auth`: 12 files, 97 tests passed. Existing jsdom `scrollTo` warnings are unrelated to this image/style change.
- `bun run typecheck`: passed. `bunx oxlint -c .oxlintrc.json src/features/auth/auth-layout.tsx src/features/auth/__tests__/auth-pages.test.tsx`: passed. `bunx oxfmt --check src/features/auth/auth-layout.tsx src/styles/auth.css src/features/auth/__tests__/auth-pages.test.tsx`: passed. `git diff --check`: passed.
- Final `bun run build`: passed in 7.56 s; log `/private/tmp/taodock-dark-auth/build-final.log`. The preview was restarted after building, and all three fresh page captures loaded the final hashed artwork successfully.
- Browser checks: dark login/signup/recovery at 1135 × 790 measured document 1135 × 790; all three mobile routes at 390 × 844 measured document 390 × 844. Dark/light controls work, light mode restores the original artwork/backdrop, and a fictional username remains visible through switching in both directions. Evidence: `theme-light-input-retained.jpg`, `theme-dark-input-retained.jpg`, and `signup-mobile.jpg` in `/private/tmp/taodock-dark-auth/`.
- Initial DOM-based input-value comparisons were inconclusive because the browser returned redacted field values; they were superseded by direct screenshot inspection of the fictional username and the passing component regression assertions. No product defect or input reset was observed.
- Fresh browser reload and login/signup/recovery navigation produced no new console error entries. Structured results: `/private/tmp/taodock-dark-auth/regression-results.json`. Temporary viewport overrides were reset; the empty English dark signup page remains open with the local preview running.
- Applicable security guidance remains [OWASP ASVS 5.0.0](https://asvs.owasp.org/), [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), and [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). This change affects decorative asset selection and positioning only. Existing authentication, recovery, verification, session, OAuth and server enforcement behavior is unchanged. Regression verification covers the affected frontend contracts; live credential submission, recovery email delivery, MFA/OAuth and a complete server ASVS audit are outside this change and were not exercised.
- Implementation checklist complete: exact first selected reference resolved; dark raster artwork and background; complete platform silhouette; three shared routes; light-mode preservation; theme/input regression; desktop/mobile overflow checks; final paired comparisons; tests/typecheck/lint/format/build; fresh console check; local preview retained.

final result: passed

# Homepage dark-mode synchronization QA — 2026-10-31

## Visual target, scope and normalization

- User requested that the homepage also use the accepted first dark-mode scheme. The material/palette reference is `/Users/leekinyeung/.codex/generated_images/01a190ae-1011-7173-8859-a9769bbae4c7/exec-3b9f9544-e045-4854-8710-b35b212d82b7.png` (1503 × 1046). Its authentication-page layout is not a new homepage layout requirement; preserve the existing homepage structure and apply the approved dark artwork/background.
- Reuse the exact accepted production assets `web/src/assets/auth/model-ecosystem-dark.webp` and `web/src/assets/auth/sky-backdrop-dark.webp`; no additional asset generation, duplicate files or dependencies. Light-mode imagery and styling remain unchanged.
- Implementation: `http://localhost:5173/`. Comparison state: English, dark theme, anonymous, page top, native 1280 × 720 CSS viewport, density 1. Before and final screenshots are both 1280 × 720: `/private/tmp/taodock-home-dark/before.jpg` and `/private/tmp/taodock-home-dark/dark-final.jpg`.
- Full-view paired evidence: `/private/tmp/taodock-home-dark/comparison-full.png` (2560 × 720), original homepage left and synchronized homepage right. This checks retained structure and the intentional theme changes, rather than claiming an auth-page/full-homepage layout match.
- Focused art-direction comparison: `/private/tmp/taodock-home-dark/comparison-art.png` (1000 × 314), selected-reference artwork left and actual homepage artwork right. The source crop is 751 × 471; the actual crop is 336 × 184 from the native screenshot. Both are proportionally fitted into equal comparison panels, without stretching. The enlarged actual crop is for composition/material review; sharpness was also checked at native screenshot scale.

## Findings and comparison history

1. **P2 — light artwork in dark mode, resolved.** The original homepage used the bright white platform and a flat charcoal background (`before.jpg`), which conflicted with the newly accepted navy/glass scheme. `HomeLanding` now selects the accepted dark image through the existing `useTheme().resolvedTheme`; `.dark .home-page` uses the same dark raster backdrop as authentication pages. The final paired comparison confirms coherent palette and materials.
2. **P2 — desktop artwork clipped at the right edge, resolved.** The inherited dark placement extended to x=1344 at a 1280 px viewport. The dark-only desktop placement now uses `right: 0`, `width: calc(50% - 17rem)` and `max-width: 28rem`, reserving space for the introductory text. At 1536 × 1024 the image starts at x=1040 after the copy ends at x=1001.95; at 1024 × 768 it starts at x=784 after the copy ends at x=765.69. All five tiles and the complete front platform remain visible in the final captures.

## Required fidelity surfaces

- **Typography:** existing Public Sans/system fallback, weights, sizes, line heights, letter spacing and headline wrapping retained. Header, provider names, descriptions and actions remain legible on the new background.
- **Spacing/layout:** existing hero, five provider cards, integration strip and compact footer retained. Desktop layouts fit one viewport; tablet/mobile retain the existing stacked layout and normal vertical scrolling. The artwork is fully contained and does not overlap text or actions.
- **Colors/tokens:** approved navy raster backdrop and smoky dark glass illustration; existing semantic card, border, foreground, accent and primary-action tokens retained. No global theme or navigation-token changes.
- **Image quality:** same accepted five-provider bitmap and backdrop used across homepage/auth pages, true alpha, complete silhouette, proportional display, no light background rectangle or halo. The image's intrinsic dimensions match the selected source (1701 × 924 dark, 1715 × 917 light), avoiding incorrect aspect-ratio reservation. Existing provider-card marks and decorative ribbon are reused.
- **Copy/content:** existing translations, configured API base URL, documentation URL, destinations and availability note retained. No new UI strings or locale edits.
- No remaining actionable P0/P1/P2 findings. P3: the desktop image is intentionally smaller than on the split auth page to preserve the homepage's text and card hierarchy. Development-only query/router controls are excluded from product fidelity comparison.

## Verification and reuse

- Existing shared `useTheme`, `ThemeProvider`, `ThemeSwitch`, `CopyButton`, `Button`, provider cards and layout are reused. The image source is derived during render, without another effect, listener, provider or state store. No new UI component or interaction implementation is needed.
- Added one focused regression to the existing landing suite: dark → light → dark selects the matching artwork while preserving the visible headline and API-key destination. Before implementation it failed on the old light image, with 12 existing cases passing; evidence `/private/tmp/taodock-home-dark/before-tests.log`. After implementation, `bun run test src/features/home` passed 31 tests across 2 files; after the test query's TypeScript-only correction, `bun run test src/features/home/__tests__/landing.test.tsx` passed all 13 cases again.
- `bun run typecheck`: passed. Touched-file `oxlint`: passed. `oxfmt --check` on the component, test and stylesheet: passed. `git diff --check`: passed.
- `bun run build`: passed in 8.38 s; `/private/tmp/taodock-home-dark/build.log`. The dev preview was restarted, then the page was freshly reloaded and the final screenshot recaptured.
- Browser: native 1280 × 720 and 1536 × 1024 / 1024 × 768 desktop, 834 × 1194 tablet, 390 × 844 mobile. No horizontal overflow; desktop document height equals viewport height. Tablet/mobile document heights (1859 / 2374 px) reflect the existing stacked content, not decorative-image overflow. Evidence `dark-1536.jpg`, `dark-1024.jpg`, `dark-834.jpg`, `dark-390.jpg` and `viewport-results.json` in `/private/tmp/taodock-home-dark/`.
- Browser theme switching restores the original light image and removes the dark backdrop; evidence `/private/tmp/taodock-home-dark/light-final.jpg`. Switching back restores the accepted dark asset. Qwen's model action navigates to `/pricing?search=qwen`; returning Home restores the final homepage correctly. Fresh reload → model-square navigation → Home produced no new console error entries.
- Temporary viewport overrides reset; English dark homepage retained as the local preview. No deployment or changes to authentication/server logic.
- Implementation checklist complete: accepted assets reused; theme-aware image; intrinsic image dimensions; dark background; contained desktop artwork; preserved light mode; focused regression; typecheck/lint/format/build; full/focused comparison; responsive and navigation verification; preview retained.

final result: passed

# Chrome authentication interaction regression — 2026-10-31

- User reported that both mouse clicks and Tab were unresponsive. Earlier browser-controlled clicks worked, so that earlier inspection did not establish a fix. Native Chrome accessibility inspection then found focus on the route devtools close control; pressing native Tab moved to the invisible `TANSTACK TanStack Router v1` control rather than a form field. The persisted router panel was open at a height of 5 px, with focusable content below the viewport. This directly explains the missing visible Tab response; the intermittent mouse failure was not independently reproduced before the change.
- Extracted the existing root development-tools block into `web/src/components/development-tools.tsx`. It uses real router matches to return no development panels for the `/(auth)` route group, including login, registration, recovery and other grouped auth screens. Other development pages retain both tools and the existing fixed wrapper; the production-only gating is unchanged. No authentication handler, validation, session, credential or server-security behavior changed.
- Added three regression cases in `web/src/components/__tests__/development-tools.test.tsx`: navigation from a page with development panels to each affected auth route removes both panels, inputs and Tab remain usable, and returning Home restores the tools. Vendor components export no-op views in test mode, so only their focusable overlay boundary is replaced; the tested component and router navigation are real. All three cases failed before the route guard (`/private/tmp/taodock-auth-click/devtools-before.log`) and passed after it.
- `bun run test src/components/__tests__/development-tools.test.tsx src/features/auth`: 13 files, 100 tests passed. `bun run typecheck`, touched-file `oxlint`, `oxfmt --check`, and `git diff --check` passed. `bun run build` passed in 15.7 s; log `/private/tmp/taodock-auth-click/build.log`. The local preview was restarted after building.
- Native macOS Chrome verification: mouse click and fictional username entry on login, native Tab from username to password, and native login-button click causing the expected missing-password validation. Signup input/Tab and empty submit work; the browser's own generated-password suggestion was dismissed without accepting or entering a credential. On recovery, native Tab reaches the submit button and an empty submit shows the existing email validation without sending mail.
- After the final build/reload, native mouse → Tab again focused the password field; router panels and query-devtools controls are absent. Desktop document/viewport both measure 1920 × 912. Evidence: `/private/tmp/taodock-auth-click/chrome-fixed.jpg`, `chrome-signup-fixed.jpg`, `chrome-forgot-fixed.jpg`, and final empty-login screenshot `chrome-final.jpg`. No theme or viewport preference was changed for this regression check.
- Applicable security references remain [OWASP ASVS 5.0.0](https://asvs.owasp.org/), [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), and [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Existing password-manager support, credential validation, consent/challenge gating and server enforcement are retained. Verification is scoped to development-overlay isolation and existing frontend auth regressions, not a complete ASVS/server audit.
- User independently retested the original Chrome tab after the change and confirmed: “已恢复正常”. No remaining interaction blocker is reported. The local login preview remains open.

final result: passed

## Vilao-style default homepage — 2026-10-31

### Scope and source

Implemented the approved six-section homepage body at `http://localhost:5173/`, using `https://vilao.ai/` as the visual source. Existing public navigation, compact footer, authentication pages, custom homepage priority, backend and billing logic were preserved in this pass. The body uses a local `.home-main.dark` palette; global theme preferences remain independent.

Durable evidence root: `/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/vilao-home/`.

- Source visual truth: `source/desktop-0.jpg` through `source/desktop-5.jpg`; `source/mobile-0.jpg` through `source/mobile-13.jpg`. The mobile run continues through the source footer.
- Production implementation: `render/desktop-0.jpg` through `render/desktop-4.jpg`, `render/mobile-0.jpg` through `render/mobile-8.jpg`.
- Full-page development captures: `render/development-desktop-full.png`, `render/development-mobile-full.png`. These retain development launchers; the production captures have no development panels.
- Final preview: `home-preview.png`.
- Desktop CSS viewport: 1920 × 912; original native captures: 3840 × 2110, including Chrome. Page crops remove browser chrome, normalize density from 2× to 1×, and omit the 11 px desktop scrollbar (1909 × 912 content crop).
- Mobile CSS viewport: 390 × 844, Chrome Responsive mode. The device viewport was cropped from the native screenshot at (515, 420), 756 × 1636 pixels, and normalized to 390 × 844. This is a visual comparison crop, not a pixel-difference measurement. Earlier DOM checks at a 390 × 844 desktop viewport override measured content width 379 px plus the scrollbar, with no horizontal overflow.
- State: anonymous, English, local fixed dark body. The source audience uses typing animation and its accordion changes automatically; local audience uses a fade and the first accordion item starts expanded. Chinese switching and global light/dark independence were also tested. Different model names, prices, endpoint counts and section heights reflect the actual local catalog and approved scope.

### Comparison history and findings

1. **Initial pass: blocked, P2 hero density.** `comparisons/compare-hero-initial.jpg` showed an additional heading line and excessive spacing pushing the lower gateway nodes below the desktop viewport. The heading maximum width/size and hero margins/padding were corrected.
2. **Post-fix desktop:** `comparisons/compare-desktop-0.jpg` shows the complete diagram, centered two-line hierarchy, white/outlined actions and purple-blue ribbon treatment. The existing header is intentionally retained. No remaining actionable P0/P1/P2 issue in this region.
3. **Section review:** `comparisons/compare-desktop-1.jpg` through `compare-desktop-4.jpg` place source and implementation in the same image. Scroll offsets differ because the approved local pricing captions, supported endpoints and omitted promotional statistics change page length. These overview images establish sequence and composition; they are not used to claim identical scroll alignment.
4. **Focused review:** `comparisons/compare-focused-capabilities.jpg` aligns the capability heading/accordion region without stretching its aspect ratio. `comparisons/mobile-prices-code.jpg`, `mobile-capabilities.jpg` and `mobile-setup.jpg` compare actual mobile content with the source; `mobile-hero.jpg` and `mobile-contact-sheet.jpg` cover the responsive hierarchy. Full readable implementation views were also inspected at `/private/tmp/taodock-vilao-home/local-mobile-prices.png`, `local-mobile-capabilities.png` and `local-mobile-steps.png`.
5. **Production check:** five desktop views and nine mobile views were captured from `bun run preview -- --port 5173`. Chrome's native DevTools Console showed **0 messages**. Device emulation and DevTools were closed, and the local homepage was returned to the top.

### Required fidelity surfaces

- **Fonts and typography:** existing locally bundled Lora variable serif approximates the source display serif; existing local interface fonts and monospace code fonts are reused. Heading hierarchy, two-line desktop hero, balanced mobile wrapping and small uppercase eyebrows were checked. The source font could not be exported through the browser asset interface; no remote font requests were added.
- **Spacing/layout rhythm:** centered hero, two-column pricing/code and capability/protocol sections, two moving ecosystem rows, four desktop setup cards and vertically stacked mobile content follow the reference. Required per-model currency/unit captions make local price rows taller than the source. The shared full cURL block is also taller than the source's compact formatting; all content remains readable and copyable.
- **Colors/tokens:** the body stays #110e20 with lavender foregrounds, purple/blue light, green price accents and subdued borders. Shared component tokens are scoped inside the body. Native theme switching verified the global root changed to light while the main background remained `rgb(17, 14, 32)`; the original global dark setting was restored.
- **Image quality:** local WebP background and desktop/mobile network diagrams have proportional sizing and alpha transparency where appropriate. The central medallion uses the configured logo. No ViLao logo, contact information, runtime script or hotlinked asset is used. Installed Lobe provider/available client icons are reused. Generated diagrams use the same flat thin-wire/diamond direction; their exact wires and capsules differ from the source as an accepted asset replacement.
- **Copy/content:** configurable brand, logo, server address and documentation link; real first four catalog models, real model count and pricing; no source promotional counts, latency promises, seller entry or Vietnamese business details. Setup previews say “Example only” and have no form controls or focus targets. Seventy-seven literal homepage translation keys were checked in all seven locale files: zero missing; 65 new keys were translated through the required script and normalized with `bun run i18n:sync`.

### Data, interaction and reuse verification

- Reuses `usePricingData`, `ModelPriceCell`, `Button`, `CopyButton`, `CodeBlock`, `Accordion`, `Skeleton`, `ErrorState` and `EmptyState`. No duplicated pricing arithmetic, clipboard state, accordion keyboard handling or authentication form was introduced.
- Existing `ScrollingIcons` only supports vertical desktop-only icon-card columns; it cannot compose the required mobile-visible horizontal logo rows. The feature uses local CSS row motion with installed marks. Existing provider cards lack the actual catalog/price display; the four-row preview composes the shared pricing cell and router links.
- cURL selects a catalog model with the `openai` endpoint type, uses the configured base address, safely quotes catalog names and URL values, and only includes `$TAODOCK_API_KEY`. Empty, failed and non-OpenAI catalogs fall back to `GET /v1/models`. No user key is read and no example is executed.
- Automated regression tests cover first-four model selection, token/request/dynamic pricing semantics and units, loading skeleton, error and empty states, non-OpenAI fallback, complete copy payload, `/v1` normalization, origin fallback, model detail navigation, anonymous/authenticated key destinations, documentation links, accordion keyboard expansion, local theme isolation, Chinese switching and retained footer/custom content behavior.
- Chrome **native mouse** clicked Copy (visible “Copied” feedback), a real model (existing detail route opened), Get an API key (`/sign-in?redirect=%2Fkeys`), language choice and accordion triggers. Full clipboard payload was asserted in component tests; browser verification checked the visible copy result.
- Native **Tab/Enter** moved to a visible control, opened the next capability, and exposed `aria-expanded=true`; DOM bounds confirmed focus was within the viewport. No transparent layer intercepted the controls.
- At 390 × 844, `document.documentElement.scrollWidth` was 379 with `innerWidth=390`; the overflow scan found no oversized content outside the intended marquee and code scrollers. The responsive picture selected `gateway-mobile.webp`.
- Reduced-motion CSS disables row/copy transitions and all body animations, shows the first audience and static wrapped logo rows. Decorative layers use `pointer-events:none` and contain no focusable controls.

### Assets and generation record

Built-in ImageGen mode was used because source visual assets could not be exported through the browser connection. The reference input was the browser-captured, chrome-free `source/hero-reference.png`; generated source files remain in `/Users/leekinyeung/.codex/generated_images/01a190ae-1011-7173-8859-a9769bbae4c7/`. Outputs were inspected and converted to WebP in the repository:

- `/Users/leekinyeung/GolandProjects/itmazai-token/web/src/assets/home/ambient.webp` (1536 × 1024). Prompt: create only the reference's softly blurred folded purple/blue luminous ribbon on #110e20, faint grid, centered negative space for real HTML, no text, logo, diagram or UI, dark blending outer edges.
- `/Users/leekinyeung/GolandProjects/itmazai-token/web/src/assets/home/gateway-desktop.webp` (2172 × 724, alpha). Prompt: flat thin-line wide network; six named provider capsules at left; four dark rounded diamonds labeled MODELS, ROUTING, ONE API and LOGS; blank exact-center logo medallion; right SDK, Cherry Studio, Open WebUI, DeepChat and AionUi capsules; blue input/green output wires and small checkmarks; lavender outlines, transparent background, no ViLao branding or browser.
- `/Users/leekinyeung/GolandProjects/itmazai-token/web/src/assets/home/gateway-mobile.webp` (1086 × 1448, alpha). Prompt: same flat network style reorganized vertically, six provider capsules in two top rows, centered four-diamond gateway with blank medallion, five client/SDK capsules in two lower rows, blue downward input and green output, transparent background, no source brand or browser.

### Checks and handoff

- Before implementation, the two new homepage contracts failed while three retained footer cases passed: `/private/tmp/taodock-vilao-home/test-before.log`.
- `bun run test src/features/home/__tests__/landing.test.tsx src/features/home/__tests__/home-page-content.test.tsx`: **37 passed**, two files. `/private/tmp/taodock-vilao-home/test-final.log`. jsdom prints its known unimplemented `scrollTo` notices; no test failure.
- `bun run typecheck`: passed.
- Touched-file `bunx oxlint -c .oxlintrc.json ...`: passed.
- Touched-file `bunx oxfmt --check ...`: passed.
- `git diff --check`: passed.
- `bun run build`: passed in 7.43 s. `/private/tmp/taodock-vilao-home/build.log`.
- Local backend remains running. The verified built frontend is previewed at `http://localhost:5173/`; no deployment was performed.
- No remaining actionable P0/P1/P2 finding. P3: optional future refinement of syntax highlighting and additional official client marks; neither affects the accepted interactions or layout.

final result: passed

## 独立首页对照审查 — 2026-10-31（本次仅审查）

本轮重新访问参考站与当前首页，未复用旧截图作为审查证据。整体结构已对齐，但仍有移动端可用性与视觉完善项。测试和构建通过不能替代这些细节的审查。本次未修改产品代码、数据、品牌配置或计费逻辑。

证据目录：`/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/`。

- 源站：`https://vilao.ai/`；实现：`http://localhost:5173/`，匿名、英文、深色。
- 桌面：1920 × 912；原生截图 3840 × 2110，移除 Chrome 工具栏后按 2× → 1× 归一化，正文截图 1909 × 912（不含 11 px 滚动条）。
- 手机：Chrome Responsive 390 × 844。原生窗口中的设备视口裁剪归一化为 390 × 844；DOM 测量也确认 `innerWidth=scrollWidth=390`。
- 源站包含自动轮换文字、动态连线和自动切换手风琴；本地文字淡入轮换、连线为静态素材。内容长度和价格单位说明不同，因此同次下滚截图的区块顶部并非完全对齐。对照用于比较实际排版与内容密度，不是像素差分结论。
- 初次源站首屏截图处于“回到顶部”的平滑滚动途中，已拒绝并重新采集稳定首屏。曾因锁屏/前台焦点在 DevTools 的键盘记录未作为页面故障证据。解锁后已关闭设备模拟与 DevTools，恢复 1920 × 912，原生 Tab 到达可见的 Explore models 按钮。

### 按页面步骤检查

| 步骤 | 区域 | 状态 | 建议 |
| --- | --- | --- | --- |
| 1 | 首屏与连接示意图 | 可用，需精修 | 统一横、竖版的供应商 Logo、字体和连线强弱；中心配置 Logo 的白底贴片感可进一步融合。保留现有品牌配置读取。 |
| 2 | 模型价格与 cURL | 优先调整 | 手机模型名只有 11 px，长名称折行后难扫读；代码卡片约 539 px 高，存在可收紧的内边距和排版。恢复语法颜色层级，并增大复制按钮的触控区域。 |
| 3 | 兼容生态 | 需完善 | 宽屏同一行重复品牌明显，已有客户端 Logo 不齐；调整循环铺满宽度和视觉规格，并提供暂停方式。 |
| 4 | 能力与协议 | 基本正常，内容可完善 | 展开结构清晰；将渲染出的 Openai 规范为 OpenAI，按实际数据补充兼容说明、适用模型数与文档入口，减少重复授权行。 |
| 5 | 四步接入 | 基本正常 | 预览明确是示意且没有新表单；9 px 的示意标签偏小，可提高字号，适当收紧预览空白。 |
| 6 | 底部行动区 | 正常 | 获取密钥实际指向 `/sign-in?redirect=%2Fkeys`，模型入口指向 `/pricing`；结构可以保留。 |

### 优先问题与证据

**[P2] 手机导航没有语言切换入口。** 手机菜单已用原生鼠标实际打开：只有导航链接、主题和登录入口，DOM 中没有语言按钮；桌面则有 Change language。截图 `local-mobile-menu.png`。这是保留的既有导航中的遗漏，不是新增首页主体的数据问题。建议在手机菜单中复用现有 LanguageSwitcher，提供与桌面一致的语言及国旗显示。位置：`web/src/components/layout/components/public-header.tsx` 的 desktop actions 与 mobile overlay。

**[P2] 价格区与代码区的手机阅读密度需要调整。** DOM 实测模型名称 11 px，每行约 85 px；普通说明 11 px，示意标签 9 px。长模型名与价格列竞争空间。建议模型名 12–13 px，价格列稳定对齐，完整名称可通过合适的换行/详情入口获取；币种、单位、按次与动态价格语义继续保留。Copy 按钮高 28 px，建议扩大触控区域而不必放大图标。截图 `mobile-pair-price-code.jpg`。这些是易读性/触控建议，不是以字号推断 WCAG 不合规。

**[P2] 代码卡片偏高，语法层级丢失。** 实测终端总高约 539 px，代码块 352 px、代码内容容器 320 px，单行约 22 px。当前所有 token 被 `.home-curl-code .cm-line span` 的统一颜色覆盖，参考站则区分命令、参数、字符串。建议继续复用共享代码块，调整只读展示的边距/紧凑 JSON 排版，保留完整复制内容与明确的示例说明。截图 `desktop-pair-1.jpg`、`mobile-pair-price-code.jpg`；位置 `web/src/styles/home.css:363` 附近及 `home-live-preview.tsx`。

**[P2] 生态滚动行在宽屏重复过早。** 容器宽 1472 px，供应商单组约 900.9 px，客户端单组约 1034.9 px，因此同一视野出现重复品牌。建议让单组布局至少铺满可见宽度后再循环；只补充文档已确认的生态标识，并统一 Logo 高度/字重。截图 `desktop-pair-2.jpg`。当前有系统 reduced-motion 适配，但页面内没有暂停入口；建议增加可操作的暂停方式，并在悬停/聚焦时暂停。

**[P2，视觉精修] 两套示意图的品牌呈现不统一。** 桌面节点主要是栅格化文字，手机节点有彩色 Logo，中心白底应用图标与深色节点之间的贴片感明显。建议统一节点素材规格和连线的对比度，确保小屏文字仍清晰。图片已经本地化，品牌中心继续读取当前配置。截图 `desktop-pair-0.jpg`、`mobile-pair-hero.jpg`。

**[P3] 协议卡和步骤预览的产品表达可加强。** 目前协议卡主要重复 Method / Endpoint / Authorization，标准名称显示为 Openai；可以规范名称、增加真实可用模型数量和文档入口。步骤预览保留“示意”标签并提高可读性，不应变成实际登录表单。截图 `desktop-pair-3.jpg`、`desktop-pair-4.jpg` 及对应手机视图。

### 本轮截图

以下对照图左侧为参考站，右侧为当前实现；页面高度和内容不同导致滚动位置存在差异。

1. 首屏：
![首屏对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-0.jpg)
2. 价格与代码：
![价格代码对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-1.jpg)
3. 生态与能力区：
![生态能力对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-2.jpg)
4. 协议与接入区过渡：
![协议接入对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-3.jpg)
5. 四步卡片：
![接入卡片对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-4.jpg)
6. 底部行动区：
![底部行动区对照](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-audit/desktop-pair-5.jpg)

### 保留项和检查边界

- 六个区块的顺序、局部紫蓝深色、真实模型数量与价格、自定义首页优先级符合已确定方向。已有导航与页脚的视觉边界是本次明确保留的范围，不据此判作还原缺陷。
- 原站的营销数量、延迟承诺、卖家入驻和越南企业信息不是需要补回的内容。协议数量以实际目录为准。
- 当前 New API、`http://localhost:3000/v1`、`https://docs.newapi.pro` 来自现有配置。正式发布前应单独核对正式品牌、API 与文档地址，不应通过首页硬编码替换。
- 当前未发现页面横向溢出；本地捕获的控制台 error 日志为空。原生桌面 Tab 聚焦按钮处于视口内。手机菜单完整键盘闭环在前台切换过程中被打断，仍需补测，未据此判定页面存在焦点故障。
- 本次未执行付费调用、未注册或登录、未覆盖全语言/所有异步失败状态，也不声称完整无障碍合规。未改代码，因此没有将上一轮 37 项测试结果写成本轮新跑的结果。

本次结论：结构与基础入口可用，建议按“手机语言入口 → 价格/代码可读性 → 生态与示意图 → 协议和步骤细节”顺序完善。

## 首页完善与 Chrome 复查 — 2026-10-31

本轮按上一节审查结果完成默认首页完善；保留管理员自定义首页的优先级和全站主题设置，未部署。

### 完成项

| 区域 | 最终调整 | 验证 |
| --- | --- | --- |
| 手机导航 | 在菜单内复用七语言、国旗切换；使用现有 Sheet 管理焦点、Escape 和滚动锁定；语言及关闭按钮 44 × 44 px | 原生鼠标选择中文、法语、俄语、日语、越南语、繁体中文、英文；国旗与文案同步；10 次原生 Tab 均在菜单内循环；Escape 后焦点返回菜单按钮，页面恢复滚动 |
| 价格列表 | 手机改为模型名在上、价格在下，名字 13 px，保留完整名称、供应商、币种、单位与动态/按次计价语义 | 真实接口前四个模型；长模型标识回归测试保留完整详情 URL 和按次金额；真实模型详情点击成功 |
| cURL | 完整请求压缩至 7 行；移除强制统一颜色，扩展共享 CodeBlock 的 bash 解析；复制按钮 80 × 44 px；只读代码可用 Tab 和方向键横向阅读 | 手机代码卡片 394.66 px（审查时约 539 px）；代码的命令/变量与字符串颜色不同；原生复制后在 Chrome 查找栏粘贴，确认 URL、密钥占位变量和完整 messages；原生 Tab 进入代码，Right 使内部 scrollLeft 从 0 变为 40 |
| 连接示意图 | 使用同一套本地图标、文字、CSS/SVG 连线适配横版和竖版；中心品牌继续读现有配置；去掉图外重复品牌说明 | 桌面与手机截图逐段复查；320 px 下节点均在视口内；装饰容器无交互、无键盘焦点 |
| 兼容生态 | 每组至少铺满可见宽度，统一图标规格；缺少现成 Logo 的客户端使用首字母标记；提供暂停/恢复与悬停暂停 | 桌面容器和两组均为 1472 px；原生鼠标暂停为 paused，Enter 恢复为 running；Chrome 模拟 reduced-motion 时动画为 none，所有供应商/客户端完整换行可见 |
| 协议卡 | 规范 OpenAI 名称，复用既有协议标签；显示真实兼容模型数；公共授权说明合并一次；增加配置文档入口 | 真实数据展示 Anthropic / OpenAI 及对应数量；只显示当前目录公布的端点；文档 href 为配置的 https://docs.newapi.pro，带 _blank 和 noopener noreferrer |
| 四步接入 | 示意标签提升至 11 px，预览高度收紧至 204 px | 四张卡片逐段复查，示意内容完整；不包含新表单或实际登录行为 |
| 底部行动区 | 保持原有目的地 | 原生鼠标点击获取密钥到 /sign-in?redirect=%2Fkeys；浏览模型到 /pricing |

### 复用与边界

- 手机导航复用 `Sheet`，未再手写模态、焦点循环或 Escape 处理。已有 `MobileDrawer` 耦合侧栏/用户区且不提供当前全屏导航组合，因此采用已有 Sheet 基础组件。语言控件继续使用 `LanguageSwitcher`，仅兼容增加 `className` 以放大手机触控区域。
- 复制继续使用 `CopyButton`，代码继续使用 `CodeBlock`。共享代码块原先只解析 JS/TS/Markdown，无法对 bash 高亮，现增加官方 `@codemirror/legacy-modes@6.5.2` 的 shell 解析；固定为与现有 CodeMirror language API 兼容的版本。没有新增另一套复制/代码展示实现。
- 价格继续使用 `usePricingData` 和 `ModelPriceCell`，未改价格、后端接口或计费逻辑；cURL 仍使用真实模型和配置地址，不读取用户密钥，不发起付费调用。
- 新增四条文案通过 `add-missing-keys.mjs` 写入全部七种语言并运行 `bun run i18n:sync`；临时脚本已移除。逐一检查四键及占位符完整。

### 验证命令与结果

- 修复前：新增五个回归用例失败，复现手机菜单能力缺失、无暂停操作、协议名/数量缺失和 cURL 行数问题；已有 19 项通过。
- 最终相关测试：`bun run test src/features/home/__tests__ src/components/layout/__tests__/public-header.test.tsx src/components/__tests__/language-switcher.test.tsx src/components/ai-elements/__tests__/code-block-editor.test.tsx` — **5 个文件，48 项通过**。覆盖真实价格/动态与按次语义、加载/空/错误降级、完整复制、详情导航、配置链接、语言切换、菜单关闭/焦点返回、暂停、只读代码键盘可达等。
- `bun run typecheck` — 通过。
- 对本轮 15 个 TS/TSX/CSS 文件进行保护版权头的格式检查 — 通过；改动 TS/TSX 文件的 `oxlint -c .oxlintrc.json <files>` — 通过，零 error。
- `bun run build` — 通过。最后一次构建包含 reduced-motion 的换行修复。
- `git diff --check` — 通过。
- 全仓 `bun run lint` 仍报告 **151 个本次范围外的 error**，如 `src/lib/utils.ts`、`src/components/copy-button.tsx`、旧首页 `hero-terminal-demo.tsx` 和 `scripts/sync-i18n.mjs`。最终日志没有本轮修改组件/测试的 error，未扩散修改这些无关文件。
- 全仓 `bun run format:check` 仍报告本次范围外的既有格式问题，如 `response-fade-render.test.tsx`、`prompt-input.tsx`、部分渠道/兑换码/系统设置与日志文件；本轮改动文件的格式检查通过。因此不声称全仓 lint/格式已全部通过。

### Chrome 实测与证据

- 实际使用 Google Chrome，桌面 **1920 × 912**、手机 **390 × 844**，补查 **320 × 844**。经典滚动条占 11 px，正文宽分别 1909 / 379 / 309；均无页面横向溢出。
- 桌面原生 Tab 顺序为 Home、Console、Model Square、Rankings、Docs、About、语言、主题、通知、Sign in、Explore models，全部焦点可见；Enter 到模型广场成功。
- 手机原生鼠标/Tab/Enter/Escape 验证语言菜单、完整复制、代码横向阅读、动画暂停/恢复、能力手风琴、真实模型详情及密钥入口。菜单关闭后无透明遮挡或残留滚动锁。复查结束已关闭 DevTools、清除临时尺寸与 reduced-motion 模拟，恢复桌面首页。
- 构建替换资源期间，旧标签页曾请求已删除的旧哈希异步包，产生 ChunkLoadError；重载最新构建后模型详情和模型广场导航均正常，最终复查没有新增控制台错误。未将构建中途版本混用视作产品故障，也未忽略最终跳转验证。
- 拒绝了两张被浏览器截图接口缩成 390 × 185 的菜单图；改用完整页面截图并按实际 379 × 844 视口裁剪，最终菜单图与 DOM 尺寸一致。汇总图只拼接/缩放真实截图，不修改页面内容。

证据目录：`/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-refined/`。

![桌面与手机完善结果](/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-refined/review-result.png)

最终结果：本轮首页完善与桌面/手机交互复查完成，本地预览保留在 `http://localhost:5173/`；未部署。全仓无关 lint/格式欠账如上保留说明。

## 全仓 lint 与格式清理 — 2026-11-01

本轮在现有工作区直接清理，保留此前未提交的首页、认证、后端及文档修改。没有修改 lint 规则、忽略列表或测试超时，没有跳过失败用例，也没有部署。

### 修复内容

- 清除前端 151 个 lint error：类型导入、全局替换/数组访问、冗余表达式与 Fragment、按钮类型、嵌套条件等。手工复核自动修复，纠正了数组类型被转为 Set 后的声明、非 iterable 的 SpeechRecognitionResultList、`.at()` 的可空类型、项目目标库不支持的 `toSorted` 等兼容问题。
- 用导航地址、源文案键、代码行/匹配位置和日志内容身份替代数组下标 key；保留原有显示顺序、翻译、价格和计费语义。筛选图标保持“自定义节点优先、然后 fallback 图标”，并保留数字 0 的显示。
- 为附件转换 Promise 加上失败处理；转换失败不会提交半成品或清空附件，重试仍可提交完整 data URL。回归用例在修复前捕获了真实未处理拒绝，修复后通过。
- 网页预览与嵌入聊天复用同一个 iframe sandbox 策略：同源/内联脚本不能同时获得父页面 origin 权限；跨域应用保留其自身 origin 以兼容存储；无脚本的合法只读 origin 授权保留。聊天仍允许媒体下载，未授予顶层导航权限。新增边界用例覆盖本地、about/data、srcDoc、外部应用和只读权限。
- 修复插件目录 xAI 的未使用 catch 参数；按插件格式规范修正该文件格式。已读取 Task Plugin API v1，复核 metadata 中数量字段的“计费主体 + 单价”描述及单位，元数据和计费数量/价格均未改变。`outputResolution` 异常仍返回原有空字符串降级值。
- 使用项目保护版权头的格式脚本规范前端，修复原有 24 个格式文件及本轮修改；插件格式检查覆盖全部 13 个匹配文件。全仓 Go 格式扫描另发现 `e2e/doc_parse_test.go` 一处 import 顺序，已仅用 gofmt 调整。
- 七种语言的 locale 文件与本轮开始时逐字节一致；`bun run i18n:sync` 验证完成，无新增或更改用户文案。

### 测试夹具稳定性修复

全量测试反复暴露 `detail-preview.test.tsx` 的中文单位切换测试 20 秒超时，单独运行又可能通过。定位到夹具 `DetailPreview` 每次 render 都新建行数据：语言更新触发 TanStack Table 的自动分页重置，重置继续创建新数据，导致 async act 无法结束。

现按输入 memoize 行数据，并为每个测试创建独立 i18n 实例、明确准备实际使用的语言资源。保留所有价格、单位、语言切换断言，不增加超时或关闭自动分页行为。该文件 30 项及筛选器 6 项回归均通过；之后标准全量命令通过。

### 最终检查

| 命令 / 检查 | 结果 |
| --- | --- |
| `cd web && bun run lint` | 通过，0 error；3 条既有非阻断 warning，见下 |
| `cd web && bun run format:check` | 通过，1470 个匹配文件 |
| `cd web && bun run lint:plugins` | 通过，0 error；10 条既有非阻断 warning，见下 |
| `cd web && bun run format:plugins:check` | 通过，13 个匹配文件 |
| `cd web && bun run typecheck` | 通过 |
| `cd web && bun run test` | 218 个文件、2531 项通过 |
| 后续 iframe 只读兼容性边界及附件回归补测 | 2 个文件、8 项通过，包含最后新增的只读 origin 用例；不把与全量重叠的用例重复计数 |
| `cd web && bun run build` | 通过，包含最终 iframe 策略与列表重构 |
| `go test ./pkg/jsplugin ./plugins/...` | 通过 |
| `go test ./e2e -run '^$'` | 编译通过，不声称执行了 E2E 场景 |
| 全仓 `gofmt -l` | 无输出，Go 文件格式通过 |
| 备份码格式/清理针对性回归脚本 | 7 个边界用例通过 |
| `git diff --check` | 通过 |

全量测试最后一次新增的只读 iframe 用例通过后，又对其所在模块与附件模块完整补测；最终代码通过类型、lint、格式和生产构建。测试输出中 jsdom 的 scrollTo / canvas 未实现提示未被屏蔽，测试结果没有未处理异常或失败。

### 保留的非阻断 warning

所有配置的 lint/格式命令均以 0 退出，但不宣称 warning 清零：

- 前端 3 条：`cloneTemplate` 保留原有 JSON 规范化行为；profile 的 `sentBody` 故意模拟 JSON 请求体省略 undefined 字段；Footer 保留管理员配置的 HTML 页脚渲染功能。
- 插件 10 条：既有错误 cause 建议和一处变量遮蔽提示。本轮保持这些 provider 的异常接口与任务行为，未扩大变更到插件业务逻辑。
- 没有通过关闭规则、添加忽略或删除功能消除提示。项目 AGENTS 允许在评估范围与风险后保留 warning；这些提示不阻断命令通过。

### 参考与适用边界

- 已查阅 [OWASP ASVS 5.0.0](https://asvs.owasp.org/)、[Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) 和 [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。认证文件仅将备份码的等价全局字符串替换写法规范化；保留长度、字符、分隔符及服务端校验职责，不新增凭据日志或认证旁路。7 个规范化回归已验证，不据此宣称全系统 ASVS 合规。
- iframe 策略依据 [MDN iframe sandbox 说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) 区分父页面同源与跨域应用；测试覆盖实际组件输出。
- 语言资源准备参照 [react-i18next useTranslation 的就绪与 Suspense 说明](https://react.i18next.com/latest/usetranslation-hook)，表格数据稳定性也已对照当前安装的 TanStack Table 实现验证。

本轮未修改后端数据库行为、计费算法、模型价格、部署配置或依赖版本。Go 的改动只有一处 import 排序。

## 清理剩余 13 条 warning — 2026-11-01

前端 3 条、插件 10 条 lint warning 已清零。沿用原有规则与测试配置，没有增加 ignore/disable、修改测试超时或删除用例；保留此前工作区修改。

### 处理与行为验证

- 渠道亲和性模板改用 `structuredClone`。真实的 Codex / Claude 模板均为可结构化克隆的普通数据；新增回归验证值相同，修改克隆的名称、模型/路径列表、密钥来源与嵌套请求头不会污染默认模板。
- profile 测试通过当前 API 客户端的 Axios `transformRequest` 取得真实 JSON 请求体，保留省略 undefined 字段的请求契约，不以深复制替换 JSON 序列化。
- 自定义页脚复用 `HtmlContent`，通过兼容的 `prose` 与 inline 净化选项保留原有容器排版、类名、内联样式、链接 target、图片及配置优先级。链接保留新窗口行为并补齐 noopener/noreferrer；法律链接、项目署名继续显示。页脚原先直接插入未净化 HTML，现在遵循项目共享 HTML 组件的净化策略，脚本与事件属性不会作为可执行内容保留。
- `HtmlContent` 原有 isolated 策略保持固定，不受新增 inline 选项覆盖；复用已有 HTML 净化和链接/iframe 加固实现，没有新增重复的 HTML 渲染器。`prose={false}` 避免页脚引入文章排版样式。
- 九处插件告警均来自预期的 JSON 输入校验：移除未使用的 catch 参数，继续返回原有安全校验文案，不引入可能包含原始输入的 cause。另将 Alibaba 图片索引回调的参数改名，避免遮蔽外层索引。插件元数据、描述翻译、单位、模型价格、用量、边界和计费逻辑均未改变；已按 Task Plugin API v1 复核本次差异。
- 在现有 `plugins/builtin_plugins_test.go` 集中增加九种 multipart JSON 失败分支的精确错误文案验证，以及交错文本/图片情况下的第 1/2 张图片、无效索引下载契约验证。没有新增插件目录文档。

### 最终复跑结果

| 命令 / 检查 | 结果 |
| --- | --- |
| `cd web && bun run lint --max-warnings=0` | 通过，0 error、0 warning |
| `cd web && bun run lint:plugins --max-warnings=0` | 通过，0 error、0 warning |
| `cd web && bun run format:check` | 通过，1471 个匹配文件 |
| `cd web && bun run format:plugins:check` | 通过，13 个匹配文件 |
| `cd web && bun run typecheck` | 通过 |
| 首页、profile、RichContent、模板相关回归 | 4 个文件、44 项通过 |
| `cd web && bun run test` | 219 个文件、2534 项通过，未跳过用例 |
| `cd web && bun run build` | 通过 |
| `go test ./pkg/jsplugin ./plugins/...` | 通过 |
| 全仓 `gofmt -l` | 无输出，格式通过 |
| `git diff --check` | 通过 |

测试输出中的 jsdom scrollTo / canvas 未实现提示未被屏蔽；没有测试失败或未处理异常。没有修改依赖、后端数据库、认证流程、计费或部署配置。本轮未部署。

## 首页网关动效补齐 — 2026-11-01

### 原因与修复

用户标注的网关示意图原先只有静态 SVG 连线，没有沿路径运动的光束或数据标签，属于实现遗漏。已对照 [参考首页](https://vilao.ai/) 当前公开的前端动效实现，确认其使用分层流光与沿路径移动的标记；仅下载源码作只读检查，没有在本项目加载或执行原站脚本。

- 在现有 `HomeGateway` 上补入紫色输入 / 蓝色输出的三层流光、JSON / SSE 移动标签，以及中心光圈的轻微呼吸动画。沿用原桌面尺寸、品牌、Logo 和节点；手机增加与五个供应商、五个客户端对应的纵向路径。
- SVG 动画由浏览器原生时间线驱动，没有逐帧 React setState 或后台 API 请求，协议标签仅为装饰示意，不代表真实调用或用量。
- 复用已有 `useMediaQuery`、Button 和七种语言的“暂停 / 恢复动画”文案。没有新增 locale 键、UI 控件或通用动效库。原生态区的暂停按钮现同步控制网关、光圈、标题轮换和生态滚动；SVG 暂停/恢复保留原时间线。
- 系统减少动态效果在初始加载和运行中切换时都禁用 SVG 原生动画，保留完整静态图。639 / 640 px 断点与现有 CSS 一致，仅可见视口对应的图运行动画。
- 每张图使用独立的 React useId 路径命名；装饰层继续 aria-hidden、pointer-events:none，无新增可聚焦元素或点击遮挡。
- 组件复用检索没有发现已有流光路径组件；`GatewayConnection` 是现有业务示意图的路径渲染子组件，在桌面和手机中复用，不重复实现按钮、状态或媒体查询能力。

### 验证

- 修复前新增的 5 项回归全部失败，复现缺失动画、路径关联与暂停能力。修复后补齐初始减少动态效果及动态视口切换，共 7 项网关回归。
- `bun run test src/features/home/__tests__`：3 个文件、48 项通过，包含默认 / 自定义首页、真实模型价格和操作入口、网关动效、初始与实时减少动态效果、视口切换、暂停恢复、独立路径及键盘跳过装饰层。
- `bun run typecheck`：通过。
- `bun run lint --max-warnings=0`：通过，0 error、0 warning。
- `bun run format:check`：通过，1472 个匹配文件。
- `bun run build`：通过。
- `git diff --check`：通过。
- 本地首页 HTTP 200，开发预览继续在 `http://localhost:5173/` 运行；未部署。

### 视觉复查限制

本轮浏览器工具返回 **Local browser use is disabled in Work settings**。因此未捕获新的桌面 / 390 × 844 实际动画帧，也未冒充完成 Chrome 原生鼠标、真实动画播放和像素级比较。没有绕过设置调用其他本地浏览器。以上通过结果仅限代码、自动化回归和构建；浏览器视觉验收仍待启用访问后补做。

final result: blocked（仅浏览器视觉验收；代码修复与列出的自动化检查已完成）

## 首页还原度继续优化（代码阶段）— 2026-11-02

用户要求继续提高还原度，并在浏览器权限仍关闭时选择“先继续代码优化”。本轮保留已确定的范围：只调整默认首页主体，品牌和 Logo 仍读取配置，模型/价格保持真实数据；导航、页脚、认证页及管理员自定义首页优先级不变。

### 已确认差异与修正

依据已有桌面/手机参考截图，以及参考站公开布局/动效参数，修正了上一版的结构性偏差：

- 单块大菱形改为围绕 Logo 的四块菱形，分别显示模型、路由、统一接口和日志。节点改为单色边框、等宽大写标签和按名称计算的紧凑宽度，桌面采用 34 px 节点、手机采用 28 px 节点。
- 网关按容器宽度与视口高度计算 SVG 视窗；手机/平板切换点改为参考结构的 1024 px，手机采用 360 × 620 逻辑画布、左右交错的输入/输出节点，替代此前 440 px 高的三列换行布局。
- 输入保留 2.8 秒三层流光；输出改为独立的 6 秒逐路绘制、停留和淡出。增加穿过网关的工具调用 / Token / 流式标记，以及单路状态标记。动画只运行在当前视口对应的图中；暂停继续保留原生 SVG 时间线，减少动态效果显示静态图。
- 标记按完整路径距离计算可见区间，绕开节点和中心 Logo。过长的翻译标签在没有安全空间时隐藏，不覆盖品牌和节点。路径 ID 去除空白，多图实例保持独立。
- 增加已由项目 Moonshot 适配器支持的 Kimi 生态节点，并将 Gemini 的 Google G 标志修正为已安装图标库中的 Gemini 标志。客户端名单仍来自现有接入文档，不沿用参考站的其他客户端；兼容生态节点不表示当前价格目录中的启用数量，页面模型数量仍来自接口。
- 标题的整句淡入淡出改为打字、停留、删除与光标节奏；固定 2400 / 38 / 420 / 75 ms 阶段，避免随机计时。独立组件维护字符状态，避免逐字重渲染模型表和网关。语言切换重置为完整的首句；暂停和减少动态效果均保留。
- 首页容器的背景、主文本、蓝色强调、绿色成功与橙色警示按参考色值修正；添加首屏徽标的绿色光点。颜色仅在首页容器内生效，不修改全站主题设置。
- 新增 5 个短标签（Routing / Unified API / Tool calls / Cache hit / Rate limit），通过规定的 `add-missing-keys.mjs` 写入全部七种语言并执行 `bun run i18n:sync`。逐键比对确认每种语言仅增加这 5 个值，没有移除原有键，临时脚本已删除。

本轮继续复用现有媒体查询 Hook、按钮、复制/代码块、价格单元格、图标和动画暂停入口。将几何、SVG 绘制与动效分离，是为了让同一套业务示意图同时适配桌面与手机，并让标记避让逻辑可直接验证；未新增通用 UI 替代实现、依赖或后端接口。没有加载或执行参考站运行脚本，没有读取用户密钥或发起付费调用。

### 验证结果

- 修复前新增的四菱形 / 紧凑节点 / 输出扫光回归失败，原有 7 项网关回归通过；修复后通过。
- 全量 `bun run test`：**222 个文件、2553 项通过**。
- 最终首页补测 `bun run test src/features/home/__tests__`：**5 个文件、60 项通过**。包含默认与自定义首页、真实价格/导航/复制、四块中心标签、动画暂停/恢复、减少动态效果、1024 px 媒体切换、多实例路径 ID、装饰层键盘跳过、节点/画布边界、标记避让和打字/语言切换。
- `bun run typecheck`：通过。
- `bun run lint --max-warnings=0` 与 `bun run lint:plugins --max-warnings=0`：通过，均为 **0 error、0 warning**。
- `bun run format:check`：通过，1478 个匹配文件。
- 最后一次 `bun run build`：通过，包含最终配色与代码。
- `git diff --check`：通过；本地首页 HTTP 200。
- 没有放宽 lint 规则、测试超时或忽略列表，没有跳过失败用例。本轮未部署。

### 仍待验收

浏览器工具再次返回 **Local browser use is disabled in Work settings**，用户选择先继续代码优化。本轮没有绕过该设置，也没有新的实际浏览器截图或动画录制。因此上述结果证明代码与自动化回归通过，**不能据此宣称已经百分百还原**。

后续仍需在相同语言和视口中，对照检查完整首页六个区块、实际动画帧、390 × 844 手机布局、滚动、焦点与点击操作，再进行逐像素修正。品牌、真实数据、已确认的功能适配以及保留的导航/页脚属于预先确定的差异，不应替换为参考站的商家入口、联系方式或宣传数字。

final result: blocked（浏览器视觉验收待执行；本轮代码优化和列出的检查已完成）

## 首页首屏代码优化 — 2026-11-02

本轮针对用户标记的 `section.home-hero` 整理代码，范围限于默认首页第一屏。

- 提取 `HomeHero`，负责标题、文案、入口、真实模型数量和网关示意图的组合；`HomeLanding` 继续负责配置、模型数据及各区块的编排。首屏样式迁至 `home-hero.css`，保留共有按钮和其他区块样式。
- 轮换文案通过现有 `Built for {{audience}}` 翻译模板分离前后缀，只对受众关键词打字、删除。保留中文前后缀和日文后缀的语序；语言切换重置为完整首个关键词。没有增加或重写翻译键。
- 使用同一网格区域预留各候选完整文案的空间，减少长短词切换时对下方按钮位置的影响。暂停/恢复、光标和减少动态效果的既有行为保留；减少动态效果时显示完整译文且不启动打字计时器。
- 网关最小桌面宽度由既有几何函数和固定节点名单计算一次，尺寸监听仅依赖桌面/手机状态。在手机布局中停止隐藏桌面图的测量，切回桌面时重新测量；不再随着派生节点数组的变化反复重建监听器。
- 按钮复用 `components/ui/button.tsx` 和 TanStack Router；继续组合既有 `HomeAudience` / `HomeGateway`，复用媒体查询、数字格式化及配置来源。旧 `sections/hero.tsx` 属于另一套布局，本轮没有为它复制交互，也没有新增通用 UI 替代实现。

### 本轮验证

- 新增固定前后缀、减少动态效果的完整句子和手机隐藏桌面尺寸回归；修复前 3 项失败，修复后通过。增加真实七种语言切换的集成回归，确认只轮换关键词、完整句子的语序保持正确。
- `bun run test src/features/home/__tests__`：**5 个文件、64 项通过**，包含既有真实价格、加载/错误/空数据、复制、导航、配置入口、动画暂停、减少动态效果和键盘回归。
- `bun run typecheck`：通过。
- `bun run lint --max-warnings=0`：通过，**0 error、0 warning**。
- `bun run i18n:sync`：通过；同步前后哈希比较确认七个语言文件没有变化。
- `bun run format:check`：通过，1480 个匹配文件。
- `bun run build`：通过。
- PostCSS 解析迁移前后的 199 组既有选择器/媒体查询规则：仅 `.home-audience` 的显示方式改为共享网格；其余既有声明保持一致。新增的文案占位规则为本轮的布局调整。
- `git diff --check`：通过；本地首页 HTTP 200。没有部署。

验证日志位于 `/private/tmp/hero-code-{tests,typecheck,lint,format-check,build,i18n}-20261102.log`。测试环境仍输出既有的 jsdom `scrollTo()` 未实现提示；上述测试结果为通过，不代表已执行原生滚动检查。

本轮遵循用户“先继续代码优化”的选择，未执行实际浏览器截图、逐帧动画、原生鼠标/Tab 或 390 × 844 实机布局复查。不能用上述代码检查宣称百分百还原；这些视觉和原生交互验收仍待浏览器访问恢复后执行。

final result: blocked（首屏代码优化及自动化检查完成；实际浏览器视觉验收待执行）

## 首页第二屏优化 — 2026-11-02

范围为默认首页的模型价格与 cURL 调用示例。已查看先前保存的参考站 `source/desktop-1.jpg` 和 `source/mobile-2.jpg`，并核对本地参考源码中的单栏 / 1024 px 双栏结构。

- 将第二屏的引导标签放到双栏上方，代码面板与左侧标题从同一行开始。1024 px 以下使用单栏，桌面使用 5:7 双栏和 40 px 间距；区块上下留白按手机 64 px、768 px 起 96 px 设置。保留本站文案、真实数据和完整的计价说明。
- 拆出 `HomeModelPrices` 和 `HomeRequestPreview`，`HomeLivePreview` 只负责区块结构和选择适用的 OpenAI 模型。相关样式迁至 `home-live-preview.css`，其余区块仍使用共有样式。
- 价格卡标题允许换行；供应商名称和计价单位可完整折行；移除第二屏内价格标签/单位的截断。手机模型链接的最小高度提高到 44 px，代码面板保持内部横向滚动，移除代码块额外外边距。
- 行内图标按模型 `icon`、供应商 `vendor_icon` 的优先级调用既有 `getLobeIcon`，仅展示已有配置，装饰图标从无障碍名称中排除。
- 空白模型标识不再生成无效的模型详情链接或聊天请求；没有有效 OpenAI 模型、加载中或失败时，cURL 展示查询模型列表的示例。目录刷新后价格与复制内容同步更新。

复用检查：继续使用 `ModelPriceCell` 的币种、精度、单位、动态计价及按次计价语义，不另写金额计算；继续使用 `EmptyState`、`ErrorState`、`Skeleton`、`Button`、`CopyButton` 和 `CodeBlock`。新增组件是业务组合，没有替代已有通用控件，也未新增依赖、后端接口或付费调用。

### 本轮验证

- 修改前新增的空模型标识回归失败：复制内容包含空模型的聊天请求；修复后空字符串与纯空格两种标识均降级为查询模型列表，价格区显示现有空状态。
- 新增紧凑布局的 CSS 合约回归：单栏、1024 px 双栏声明、标题换行、单位换行及代码面板最小宽度。该检查不替代真实浏览器的布局与溢出测量。
- 新增键盘复制含单引号、双引号和 `$()` 字面量的模型/地址回归，确认 shell 引号与 JSON 内容保持完整；新增目录刷新后价格和复制内容同步更新的回归。
- `bun run test src/features/home/__tests__ src/features/pricing/__tests__/task-price-display.test.tsx`：**6 个文件、88 项通过**，包括首页原有的价格、异常、空数据、模型导航、文档入口、语言和动效回归。
- `bun run typecheck`：通过。
- `bun run lint --max-warnings=0`：通过，**0 error、0 warning**。
- `bun run i18n:sync`：通过；哈希比较确认七个语言文件没有变化。
- `bun run format:check`：通过，1483 个匹配文件。
- `bun run build`：通过。
- PostCSS 比较排除第二屏专有选择器后的 **107 组**共有/其他区块规则，未发现声明变化。
- `git diff --check`：通过；本地首页 HTTP 200。未部署。

本轮日志位于 `/private/tmp/live-preview-{tests-final,typecheck,lint,format-check,build,i18n}-20261102.log`。测试环境的既有 jsdom `scrollTo()` 未实现提示仍存在，测试结果为通过。

浏览器工具本轮再次返回 **Local browser use is disabled in Work settings**。按照用户先继续代码优化的选择完成上述工作；没有新的本地页面截图，尚未完成同视口视觉对照、390 × 844 手机布局、实际横向溢出及原生鼠标/Tab 复查。

final result: blocked（第二屏代码优化及自动化检查完成；实际浏览器视觉验收待执行）

## 将截图外观设为默认主题 — 2026-11-02

按用户提供的两张主题设置截图落实默认值。用户已明确要求整套外观作为默认，同时保留已保存的个人偏好。

| 设置 | 默认值 |
| --- | --- |
| 明暗 | Dark |
| 配色预设 | Ocean Breeze |
| 字体 | Sans / Public Sans |
| 圆角 | 0.3 rem（`sm`） |
| 密度 | Default |
| 侧栏 | Inset |
| 布局 | Default（展开侧栏） |
| 内容宽度 | Full width |

差异仅涉及明暗、配色、字体和圆角。密度、侧栏、展开布局及全宽原本已符合截图。`Layout: Default` 表示侧栏展开，不等同于 `offcanvas`；保留现有收起行为及侧栏 Cookie，避免覆盖个人布局偏好。

- 修改默认模式和 `DEFAULT_THEME_CUSTOMIZATION`，复用现有主题 Provider、预设、字体和 CSS 变量，没有新增主题或通用控件。
- 修正 DOM 属性应用条件：仅基础预设 / Auto 圆角省略属性，Ocean Breeze 和 0.3 圆角即使成为项目默认也仍应用对应选择器。
- 同步 HTML 初始化脚本的深色默认值。缺失、无效或不可读取的模式使用 Dark；明确保存的 Light、Dark、System 均继续有效，System 仍跟随系统。
- 保留存储键、缓存保留规则和偏好优先级，没有清除或迁移现有用户数据。重置后恢复截图配置；用户仍可选择基础配色、Auto 字体和 Auto 圆角并在重载后保留。

### 本轮验证

- 目标默认值及兼容性用例在修改前有 13 项失败，修改后通过。覆盖首次访问、重置后重新挂载、已有浅色/系统模式、其他预设、明确的基础配色和 Auto 选项、存储读写异常、缓存初始化保留偏好，以及首次绘制的模式初始化。
- `bun run test`：**222 个文件、2569 项全部通过**。
- `bun run typecheck`：通过。
- `bun run lint --max-warnings=0`：通过，**0 error、0 warning**。
- `bun run format:check`：通过，1483 个匹配文件。
- `bun run build`：通过。
- `git diff --check`：通过；本地首页 HTTP 200。未部署。

日志位于 `/private/tmp/theme-default-{tests-all,typecheck,lint,format-check,build}-20261102.log`。全量测试仍有既有的 jsdom `scrollTo()` / Canvas 未实现提示，测试结果为通过。

用户截图已原样保存在 `/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/theme-default-20261102/` 的 `selected-theme-top.png` 和 `selected-theme-bottom.png`。本轮根据截图实施；自动浏览器访问此前仍被 Work 设置拦截，没有新的运行页面截图或原生交互验收记录。

final result: blocked（默认主题配置及全部自动化检查完成；自动浏览器视觉复查未执行）

## 首页与系统主题统一 — 2026-11-02

按用户的新目标，以全站主题作为默认首页的视觉基准。默认首页的六个区块现在共用系统主题变量，支持浅色、深色和跟随系统。

### 实现与兼容

- 移除首页局部 `dark` 类和独立的背景/前景/主色变量，继承全站 ThemeProvider 与主题预设。导航、主体和页脚使用同一套系统配色；没有新增首页专用的模式开关或存储键。
- 标题继承系统字体，卡片、按钮和示意字段使用系统圆角与文字尺寸变量；Serif 的字重和字距也随字体轴调整。价格、能力列表、协议面板、接入步骤及行动区均使用语义化主题色。
- 首屏背景改为由当前主色和图表色生成的柔和光效。网关 SVG 的节点、文字、渐变、流光和状态标记改用主题变量。装饰层保持不接收指针或键盘焦点，原有暂停、减少动态效果、路径几何及手机布局继续保留。
- 复用 `Button`、`CopyButton`、`ModelPriceCell`、手风琴和 `CodeBlock`。代码块增加可继承的 `--code-token-*` 色值入口，首页设置局部语义色；其他调用方继续使用原有默认色值，没有复制代码编辑器实现。
- 首页 CTA 从当前 `primary` / `primary-foreground` 生成对比度更稳的背景，保留主题色相。相对色增强置于 `@supports` 内，不支持的环境使用系统主色。说明文字也向系统前景色适度混合，改善浅色光效区域的可读性。
- 品牌、真实模型价格、币种单位、动态计价、复制命令、模型与文档导航以及管理员自定义首页优先级均继续沿用现有实现。没有部署、增加依赖或发起付费调用。

### 验证与证据

- 用保存的修改前组件源码隔离执行新增回归，三项失败；当前实际组件通过对应回归。最终检查使用正常项目配置。
- 首页与共享代码块的相关回归：**7 个文件、89 项通过**。覆盖全站明暗切换、跟随系统变化、页面/代码编辑器实例保留、复制、真实价格、导航、语言、动效、响应式布局及主题变量合约。
- 最终全量 `bun run test --maxWorkers=4`：**224 个文件、2594 项全部通过**。首次默认并发运行有三条渠道配置用例失败，其中一条超时；该组原样单独复跑 **91 项全部通过**，再以较低并行度完成全量复查。没有增加超时、筛选全量用例或更改渠道实现。
- `bun run typecheck`、`bun run lint --max-warnings=0`、`bun run format:check`、`bun run build` 和 `git diff --check`：均通过；lint 为 **0 error、0 warning**。最终类型、lint 和构建期间源码哈希没有变化，工作区内并行产生的设置面板改动已保留。
- 按现有样式值，对 **10 套预设 × 明暗两种模式**核算 **200 组**关键文字、卡片、状态、CTA 和光效叠加边界的色值对比，最低 **4.62:1**。该核算使用相对色增强分支，是静态色值分析，不是实机像素采样或全站无障碍认证。
- 本地首页 HTTP 200。用户在内置浏览器手动切换浅色和深色后明确反馈：**“两种模式均正常”**。自动浏览器工具仍提示 Work 禁用了访问，本轮没有自动截图或原生鼠标录制，手动反馈与自动化测试分别记录。

运行日志位于 `/private/tmp/home-system-theme-{tests,tests-all-stable,channels-recheck,typecheck,lint,format-check,build}-20261102.log`。色值数据及复核脚本保存在 `/Users/leekinyeung/.codex/visualizations/2026/10/31/01a190ae-1011-7173-8859-a9769bbae4c7/home-system-theme-20261102/`。测试环境仍输出既有 jsdom `scrollTo()` / Canvas 未实现提示，最终测试结果为通过。

final result: passed（本轮首页系统主题统一；自动化检查及用户手动明暗验收通过，未执行自动截图）


# Unified public footer — 2026-11-02

final result: passed

Latest footer-specific report: [output/taodock-footer-20261102/design-qa.md](output/taodock-footer-20261102/design-qa.md). Prior QA history above is preserved.

The selected footer concept and final implementation were compared in `output/taodock-footer-20261102/comparison-full.jpg` and `comparison-detail.jpg`. The approved plan intentionally retains global typography, localized branding and the existing attribution. Final evidence includes four desktop/mobile light/dark screenshots, 32 page/viewport/mode captures, 120 theme/font inheritance checks, minimum muted-text contrast 5.49:1, and 51 passing regression tests. Typecheck, targeted lint/format, i18n sync, production build and diff checks passed. UI preview uses deterministic local API fixtures.
