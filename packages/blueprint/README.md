# Blueprint Framework

`@silent-pix/blueprint` builds a design blueprint site on Astro and Starlight.
It supplies components, fragment loading, a table of contents, source-based
search, site chrome, and layout checking. Blueprint projects own their pages,
fragments, tokens, and assets; this package contains no Silent Pix content.

The document format follows component references: title, short introduction,
individual examples, and separate rules. Silent Pix's authoring guide lives in
[`apps/design`](../../apps/design/README.md); contribution constraints live in
root [AGENTS.md](../../AGENTS.md#web-ui-and-state).

## Integration

A blueprint project directly depends on `@silent-pix/blueprint`, `astro`, and
`@astrojs/starlight`. Starlight-generated modules resolve from the project, so
Astro/Starlight must be installed there.

Configure the integration in `astro.config.mjs`:

```js
import blueprint from '@silent-pix/blueprint'
import { defineConfig } from 'astro/config'

export default defineConfig({
    integrations: [blueprint({
        title: 'Blueprint',
        sidebar: [],
        css: './src/styles/blueprint.css',
    })],
})
```

The stylesheet entry imports framework styles before the project's tokens:

```css
@import '@silent-pix/blueprint/global.css';
@import './tokens.css';
```

Both participate in the same Tailwind compilation so project `@theme` tokens
generate utilities. In `src/content.config.ts`, re-export the docs collection:

```ts
export { collections } from '@silent-pix/blueprint/content'
```

Import page components from `@silent-pix/blueprint/components/<Name>.astro`.
The integration owns source-based search instead of build-only Pagefind,
disabled pagination, section-derived navigation, custom PageTitle/Search/theme
controls, the search index route, and Tailwind setup.

## Components

| Component | Use |
|---|---|
| `State` | One fragment example with a title, stable address, and optional description/frame/theme comparison |
| `Gallery` | A group of examples with a minimum grid width |
| `Screen` | Whole-page composition with state controls and a copyable address |
| `Slot` | One selectable region containing listed fragment states |
| `Fixed` | One fixed fragment state |
| `Switch` / `Case` | A selectable whole layout containing its relevant Slots |
| `Rules` / `Rule` | Collapsible specifications with stable group and rule addresses |
| `TokenValues` | Displays resolved project token values |

### Examples

`<State component state label description? frame? themes?>` loads a fragment.
The label is its visible title; description explains pictured conditions in at
most two lines, not behavior rules. The frame holds preview classes. The default
theme follows Starlight; use `themes="both"` only for a Dark/Light comparison.

`<Gallery min>` lays out examples within a section.

### Screens and State Selection

`<Screen frame?>` composes a whole page and provides one selector per region.
Focused selectors cycle states with Up/Down without opening the menu; Left/Right
cycles focus across visible selectors.

`<Slot name component states labels? empty?>` uses comma-separated `states`.
Labels normally come from the corresponding State examples. Optional
`labels="a|b|c"` supplies pipe-separated labels in the same order as `states`,
for whole-page states that appear only in Screen without their own State examples.
`empty="No dialog"` adds an empty `none` state; include `none` in `states` to
position it explicitly. Overlays normally put `none` first so no dialog appears
initially. Flatten Slots to one level rather than nesting state selectors inside
one another.

`<Fixed component state>` inserts a state without a selector.

Use `<Switch name>` with `<Case state label>` for whole-layout alternatives.
The first Case is the default. Cases can contain Slots; controls and copied
addresses include only the active layout's regions. Use a Slot's empty state
when a whole-layout switch is unnecessary.

### Rules and Tokens

`<Rules component part?>` is collapsed by default. Its address is
`<component>/rules`, or `<component>/rules/<part>` for separately grouped rules.
Direct links expand the group. Its content uses `<ul class="ds-rules">` with
`<Rule component id>` entries.

`<TokenValues />` displays resolved values on elements marked with
`data-ds-value="<name>"` for the current theme.

## Fragments and Addresses

Fragments live in the consuming project's `src/blueprint/<component>/<state>.html`,
resolved from the Vite project root. State, Slot, and Fixed insert their markup.
Nested `<div data-ds-slot="component" data-ds-state="state"></div>` references
resolve at build time; missing fragments and cycles fail the build.

Within a Screen slot, `data-ds-go="state"` changes its selected state. Targets
must belong to that slot's listed states or the build fails. Avoid `>` inside
State/Slot attribute values: source readers use it to delimit opening tags.

Stable anchors identify:

- States: `<component>/state/<state>`.
- Individual rules: `<component>/rule/<id>`.
- Rule groups: `<component>/rules`, optionally followed by `/<part>`.

Screen combinations use URL fragments such as `#viewer=generation-jump`. Screen
updates the URL only on interaction, preserving direct links to other anchors
when loading a page. Example titles, rule endings, and Screen controls expose
copyable page/anchor addresses.

Search reads source pages, State labels, fragment text, and Rule text. It updates
under `astro dev` without a production build.

## Theme and Style Boundaries

Projects supply `--sp-*` properties for canvas, surface, elevated, hover, selected,
line, line-subtle, fg, fg-title, fg-secondary, fg-muted, accent, accent-fg,
on-stage, field, field-border, backdrop, and scroll-thumb, plus `--shadow-popover`.
Switch Dark/Light values through `[data-theme]`. Project font/text styling stays
within `.ds-frame` instead of global `:root`, `*`, or `body` rules.

Framework CSS maps Starlight colors to those tokens once. It styles documentation
chrome and prose without changing the product previews' typography, spacing, or
layout. Selected sidebar links use translucent selected colors, controls use
arrow cursors, and chrome scrollbars are thin, rounded, and arrowless. Preview
scrollbars remain project-owned.

The chrome uses a compact scale:

| Element | Size / weight |
|---|---|
| Page title | 20px / 600 |
| Body | 13px |
| Section heading | 15px / 600 |
| Section introduction | 12px |
| Example title | 12px / 500 |
| Example description | 11px |
| Rules | 12px |
| Sidebar and table of contents | 12px |
| Group labels | 10px, uppercase |

Descriptions use muted colors and a maximum width of 68ch. Controls use a 28px
height and 6px radius; chrome scrollbars are 8px wide. The page separates sections
with subtle lines and 48px spacing; galleries use 16px gaps. Wide previews keep
their design width instead of compressing to fit the documentation column.

Example cards have a 36px title/address row, a dotted canvas stage with a centered
preview and subtle shadow, and an optional description below it. Equal title-row
heights align adjacent stages. A stage scrolls horizontally when its preview's
minimum width does not fit.

Rules form collapsible rows at the end of their section, without previous/next
pagination cards. The header keeps Starlight's single full-width separator:
site title and a 16rem search field on the left, a 28px ThemeToggle on the right,
without a social-icon divider. Rules override Starlight's default details/heading
borders and spacing.

## Layout Checking

Run `blueprint-check` from the consuming blueprint project. It runs `astro build`
itself, starts Astro preview, checks the pages, then stops preview; no separate
build is required. It reports clipped frames, unintended frame overflow, and
extra text truncation or wrapping compared with the designed width.
`script/check-layout.mjs` owns the viewport sizes and comparison limits. Layout
problems produce exit code 1.

The checker requires Chromium. It looks for the Playwright cached headless shell
under `~/.cache/ms-playwright`; `CHROMIUM_PATH` selects an explicit executable.
Silent Pix exposes the build/check workflow through its root package scripts.

Only one Astro dev server and one preview server can run per project. Use
`astro dev stop` or `astro preview stop` to stop them instead of keeping PIDs;
an already-running instance rejects another start. Leave no servers launched
for validation behind.
