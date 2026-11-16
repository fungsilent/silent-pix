# Silent Pix Design Blueprint

This app owns Silent Pix's design content. Web implements the blueprint, while
the reusable components, search, site chrome, and layout checker live in
[`packages/blueprint`](../../packages/blueprint/README.md). Implementation
constraints and contribution checks live in the root
[AGENTS.md](../../AGENTS.md#web-ui-and-state).

## Content Layout

| Location | Content |
|---|---|
| `src/content/docs/foundations/` | Tokens and foundations |
| `src/content/docs/base/<group>/<component>.mdx` | One page per base component |
| `src/content/docs/pages/<page>.mdx` | One page per product page |
| `src/blueprint/<component>/<state>.html` | One reusable fragment per state |
| `src/styles/tokens.css` | Blueprint tokens |
| `src/styles/blueprint.css` | Framework styles followed by local tokens |
| `public/` | Sample assets |

The sidebar lists Tokens, base components, then product pages. The App page owns
shared layout and navigation, including Header, mode menus, Tools, and its own
Screen. Reusable UI outside app layout, such as the image viewer, belongs to a
base component group. Page-specific parts stay on their product page. Dialogs
and pickers with different content or behavior remain page-specific; shared
outer structure belongs to a base component.

## Page Structure

Put the page title and introduction in frontmatter without repeating them in
the body. Heading levels are:

- H1: page title.
- H2: a part or the base component's `Examples` section.
- H3: example titles and Rules, produced by framework components.
- H4: categories inside a long Rules section.

A product page presents one H2 section per part, ordered from the outside in and
top to bottom. Each part has one introductory line, a `<Gallery min>` containing
its `<State>` examples, then `<Rules component>`; do not add extra H3 headings.
The final `## Screen` contains `<Screen>` followed by
`<Rules component="<page>-screen">`, without introductory prose.

A base component page normally uses `## Examples` followed by Rules. When it
has distinct subcomponents, give each its own H2 section, gallery sizing, and
Rules. Show neutral placeholders such as `Label`, `Value`, and `Menu item`
rather than invented product content. Implementations do not copy placeholder
text. Product pages show only their custom states/rules and link to the base
component instead of repeating its examples. Instances without customization
need no separate examples.

A fixed use or variant, such as Task status within Badge or Stage button within
Icon button, stays on its base component page. A component with many states can
use sections for related concerns such as variant/tone, state, size, and layout.

## Parts and Preview Frames

A part is an independently meaningful area: an opening screen, file panel, tab
bar, or tab content. Rows, cards, and groups normally appear within that area's
states. Compose alternative child states to expose otherwise hidden cases;
create a separate section when a piece has substantial independent states/rules.
Each part preview shows only that part; whole-page composition belongs in Screen.

Place previews on their actual background and size them for the part. A content
panel might use `max-w-[760px]`, while a full-width Task browser or picker needs
its design `min-width`; the stage can then scroll horizontally. Small pieces
use `w-max`, not `w-fit`: `w-fit` shrinks with a narrow documentation column and
wraps labels, while `w-max` keeps the natural width and lets the stage scroll.
Full-width children and positioned menus/popovers need enough frame space to
avoid clipping.

Remove separators that only make sense in the full page from isolated previews.
When Screen uses the same fragment, apply the override through State's `frame`,
such as `*:border-r-0`, rather than changing the shared fragment.

## Fragments and Composition

Each state is one HTML fragment under `src/blueprint/<component>/<state>.html`.
Page-specific component names use the page prefix, such as `metadata-file-panel`
or `metadata-generation-tab`. Screen-only compositions have a separate component
name, such as `metadata-viewer`.

Use Tailwind utilities and token classes without inline styles. Icons are inline
lucide SVG. Copy uses fixed samples without implementation filenames or i18n
keys. Public assets use absolute references such as `/landscape.svg`.

Embed another part through `data-ds-slot` instead of copying its markup. Screen
composition uses Slot, Fixed, and Switch/Case; clickable prototype elements use
`data-ds-go` rather than reimplementing product logic. See the
[framework component reference](../../packages/blueprint/README.md#components).

Inside `whitespace-pre` containers, do not add line breaks or indentation between
line `<div>` elements; those characters would become extra visible lines.

## Rules

Rules record conditions, behavior, values, and tradeoffs that examples cannot
show. Write each rule once under its owning part. Cross-part or whole-page rules
belong to Screen. Do not duplicate rules in example descriptions.

Every Rule has an author-assigned semantic kebab-case ID, such as `link-jump`.
Keep it stable when inserting or deleting other rules. Visible numbers such as
`3.6` are generated by CSS for conversation and can change.

Group long rule sets with H4 headings. Mark classes/tokens as inline code and
escape literal MDX braces as `\{` and `\}`.

## Development and Validation

Run commands from the repository root:

```sh
pnpm dev:design
pnpm build:design
pnpm check:design
```

Development runs in the foreground. Build validates MDX, fragment references,
and prototype targets. The layout check also detects clipped or squeezed
previews; its browser requirements and server lifecycle are documented in the
[framework guide](../../packages/blueprint/README.md#layout-checking).

Blueprint token values live in `src/styles/tokens.css`; changes also update
`apps/web/src/styles.css`. The stylesheet entry imports framework styles before
local tokens. Page migration, verification, and result-link requirements are
defined in root AGENTS.md.
