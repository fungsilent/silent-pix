# Conventions

Reusable implementation practices for humans and agents. System ownership,
cross-boundary flows, guarantees, and known gaps belong in
[architecture.md](architecture.md); implementation constraints and document
update rules belong in [AGENTS.md](../AGENTS.md).

This document explains how to make recurring implementation decisions. Feature
specifications, progress, file inventories, schema fields, numeric limits, and
installed versions stay with their owning blueprint, code, config, or README.

## TypeScript and Dependencies

Use strict TypeScript. Prefer inference inside implementations and public types
at package boundaries. Avoid `any`; untrusted values begin as `unknown` and are
validated before use. Keep the official compiler and ESLint compatibility alias
roles specified in AGENTS.md; do not use `baseUrl`, and write explicit `./`
targets in TypeScript `paths`.

Third-party dependencies use explicit caret ranges; workspace dependencies use
`workspace:*`. Package/config files own version requirements, build permissions,
and installation exceptions; the lockfile owns resolved versions.

Formatting is ESLint plus `@stylistic`, without Prettier. Use four spaces, single
quotes, no semicolons, and strict spacing. Prefix intentionally unused arguments,
variables, and caught errors with `_`. The ESLint config owns exact lint rules.

## Types and Trust Boundaries

Find the existing definition before adding a type. Use a library's public types
at its boundary and inferred Zod output types for shared REST/event contracts.
Do not copy those definitions into competing hand-written contracts. A child
component's narrow props describe its own UI contract, even when some fields
overlap a transport type.

Internal Eden APIs preserve route-derived success and declared error types.
Narrow errors by HTTP status and construct application errors from
`(status, code, message)` without re-parsing typed requests or responses. Preserve
domain evidence when its consumer needs it, such as validation issues.

Transport failures and unexpected response shapes have separate handling from
declared route errors. Do not widen a typed union to `unknown` just to parse it
again. Likewise, retain factory-derived types for trusted internal state and
cache keys when a library presents them as `unknown`.

ComfyUI responses, imported files, native command results, and other untrusted
inputs still require runtime validation. Integration schemas stay at their
adapter; pure reusable domain validation belongs in Shared. Preserve error
handling and validation when moving or merging code.

## Responsibility and Change Scope

Before changing a responsibility, trace the operation through its callers, state
owners, validation, side effects, commit, publication, and cleanup. Choose the
owner and dependency direction before extracting helpers. Related lifecycle
decisions belong with the owner that can enforce the whole guarantee; separate
owners are useful when they protect distinct trust boundaries or lifetimes.

Judge a refactor by the knowledge and coordinated edits it removes in a current
maintenance case. Fewer lines, files, or parameters alone do not prove improvement.
Reuse shared semantic rules; keep small duplication when sharing would couple
unrelated domains. Do not add layers or flexibility for hypothetical consumers.
Preserve transaction-time guards, lock boundaries, error handling, and effect
ordering; describe any behavior change separately from structural cleanup.

## Imports and Public Contracts

Use workspace imports across packages and source aliases within packages:

```ts
import type { TaskApi } from '@silent-pix/shared'
import { Button } from '#/components/base/Button'
```

Source aliases are `#/` except within Shared, which uses `#shared/` to avoid the
current tsx path-resolution collision. Do not use cross-package relative imports,
another package's `src` path, `@/`, or relative source imports. Avoid circular
dependencies.

Organize Shared by domain:

```text
contract/   canonical reusable values/resources and pure validation
api/        REST query coercion, params, requests, and responses
event/      WebSocket envelopes
```

Keep canonical contracts independent of transport. Extract reusable fragments
for domain meaning, not syntactic similarity between schemas. Database row and
storage types remain DB-owned; a column may use a canonical value type only when
the stored JSON shape matches it exactly. An endpoint response may alias another
endpoint response with formal domain meaning without inventing a generic contract.

REST schemas use explicit `xxxApi` catalogs and types use `XxxApi` namespaces.
Canonical/event catalogs also list their public schemas explicitly; do not
spread or export-star runtime schemas. A symbol is public only when another
package consumes it, not merely because it is exported across local files.
Preserve the compatibility exceptions named in AGENTS.md without adding aliases.

Schemas and logic precede inferred output types, grouped at the end of each
Shared file. Use the fixed Shared comment categories in AGENTS.md. These comment
rules do not impose the same section structure on other packages.

## Backend Pattern

Routes handle transport validation, service calls, status selection, and response
publication. Domain services own business rules and atomic writes. Put validation
that protects every caller inside the owning service; route-only validation
cannot enforce that invariant. Preserve documented error precedence.

Services query Drizzle directly. Use its typed builders, operators, and subqueries;
do not add a repository layer or use raw SQL/Drizzle `sql` in Server domain code.
Use a transaction or atomic statement batch for writes that must succeed together.
One all-or-none user batch action uses one batch API, not independent requests
with client-side partial-success reconciliation.

Pass `databaseClient.database` from routes to services. Leaf helpers that also
work within transactions accept a precise `Pick<Database, ...>` capability rather
than requiring lifecycle access. Keep configuration internal to its owner as
described under Configuration.

A model module is optional. It can own cohesive DB-row conversions, domain types,
or resource projections. Keep small mappings local; do not introduce generic
mapper layers or split files just to match another domain.

### Response Shaping

The domain service owns response data and query semantics; the route selects
HTTP statuses. Choose the smallest path that supplies the required fields:

- Project the mutation result when it already contains the response.
- Use a domain response read when joined/computed fields are needed.
- Share projections when callers have the same semantic responsibility.

A separate read is not mandatory and does not guarantee an atomic snapshot with
the mutation. Decide which state the response represents when concurrent writes
matter. Related detail/event/mutation projections must stay consistent without
necessarily exposing identical fields.

## API Shape

REST resource paths are singular. Successful responses return raw resources;
HTTP status determines success. Expected non-2xx outcomes use Elysia
`return status(...)`. Errors have this shape:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message"
    }
}
```

Declare shared Zod schemas for request inputs and each supported JSON response
status. Use validated output types with `XxxQuery`, `XxxRequest`, and
`XxxResponse` naming; coercible input types containing `unknown` do not belong in
public API types. Unexpected/framework errors go through error middleware,
preserving meaningful status, logging internals server-side, and exposing no raw
Error objects.

Binary image responses use native `Response` rather than JSON schemas:

| Status | Body and headers |
|---|---|
| 200 | Stored bytes; sniffed Content-Type, Content-Length, quoted sha256 ETag, and `Cache-Control: public, max-age=31536000, immutable` |
| 304 | No body on matching If-None-Match; cache metadata headers |
| 404 | Shared JSON error when the image row or file is missing |

Eden Treaty is used only in Web API modules. Import Server's `Api` through
`@silent-pix/server/api` with `import type`; annotate exported clients with public
`Treaty.Create<Api>` when portable declarations require it. Keep client/Server
Elysia versions compatible so inference stays typed. Retain `parseDate: false`
for ISO strings and `throwHttpError: false` for status-based narrowing.

### Multipart

When a request may carry a File, group all other fields in one `payload` object
and keep only the File at the top level. Eden serializes that object whole;
top-level primitive FormData fields can lose empty arrays and stringify null or
numbers individually. The current Eden/Elysia integration parses the JSON object
before the handler, so declare an object schema without manual JSON parsing.

Keep mutually exclusive variants in the shared boundary schema. Task creation's
stored-reference/upload alternatives are one request, not client-coordinated
operations. Exact fields belong to the shared API contract.

## Query Caches and Events

Each `data/<domain>` directory keeps its API wrapper with its Query hooks, keys,
pagination, and cache updates. Use domain names such as `app` for directories
and operation names such as `health` for individual calls. API wrappers expose
plain Promise functions without Solid or TanStack Query. Components consume hooks.
Hooks read needed store state directly. Keep request construction in the owning
query module.

Name cache commands `update…Cache` for applying data, `remove…Cache` for removing
records, and `refresh…Cache` for invalidating queries so they can refetch.

Mutation `onSuccess` and the matching event handler call the same idempotent
cache operation. Applying an already-applied result is a no-op. Preserve unchanged
item/page references so unrelated updates do not reset focused or editable UI.
An actor never waits for a WebSocket echo to apply its HTTP result.

Patch only when payload fields determine the result. Otherwise invalidate and
let Server refetch, including uncertain search membership, incomplete pages,
summary-only detail changes, and dependent domains. Reconnection recovers queries
that missed events. Do not reproduce database membership, collation, or `LIKE`
semantics in Web.

Workflow list ordering is the explicit exception: Server and Web use `name` then
opaque `id`; Server declares SQLite ordering and Web uses a file-local ordinal
comparator for realtime upserts. Unicode edge ordering can differ after refetch.
This exception does not transfer filter or other domain query semantics to Web.

Domain event handlers stay beside their cache logic. Shared event schemas and
generic transport helpers have no DB/Elysia imports. Publication, identity,
origin validation, and recovery flows are explained in
[REST and Realtime](architecture.md#rest-and-realtime).

## Web UI

Use SolidJS, Ark UI, Tailwind utilities, `clsx`, and `lucide-solid`; prefer flex
layout. Build from the independent design blueprint first or in the same change.
Token changes update both blueprint and Web token stylesheets. Blueprint content
format and framework APIs are owned by their respective READMEs, linked
from [Package Boundaries](architecture.md#package-boundaries).

UI appearance, placements, and interaction states belong to the blueprint. Keep
global engineering conventions here rather than duplicating each screen's rules.
Dedicated accessibility work is outside the scope defined in root AGENTS.md;
ordinary browser/component markup and third-party behavior remain intact.

### Ownership and Reactive State

App composes app-level chrome such as Header. Shared primitives live under
`components`; page-specific components stay under their page. Shared fields stay
generic; domain grouping and actions belong to domain UI. Component-specific
logic stays beside its component and page-wide logic at the page root.
Page-independent capabilities with a defined API belong in `lib`, even when
they have one current consumer. Examples include keyboard shortcuts, image zoom,
drag selection, and splitter sizing. Put small stateless operations such as date
formatting and class composition in `utils`. The `store` directory owns
cross-page UI state.

Keep short single-consumer components, helpers, types, and fixtures local. Split
for reuse, distinct responsibility, or isolated complexity, not file length or
symmetry. Shared Task detail UI and page-specific adapters retain the ownership
boundaries in AGENTS.md rather than making generic fields domain-aware.

The component acquiring query/store data owns that access and passes narrow
props to children. Children define their contracts and do not read the same
parent-owned source again. A hook that itself needs shared store state reads it
directly.

Read Solid store state through `store.state`, with actions flattened on the
returned store. Use TanStack Form for editable values, with reactive
`form.useSelector()` or `<form.Subscribe>` reads; direct `form.state` reads are
imperative snapshots. Do not duplicate form values in a store or add a generic
form abstraction. Submit validation uses Zod; domain diagnostics can remain live.

Solid `<For>` keys by item reference. When mapped objects can be recreated,
iterate stable primitive IDs and resolve the latest item reactively so normal
updates do not remount controls. Preserve user edits across background updates,
locale/theme changes, and collapsible rendering. Initialization that must remain
active belongs outside content that can unmount.

Pair temporary browser resources with cleanup at their owner: Workers, Object
URLs, event listeners, and issue-source registrations. Cancel superseded work
and reject callbacks from outdated work. Bound untrusted file processing and
preserve original payload text when copy fidelity matters; exact parser limits
stay in the owning code.

### Context and Providers

- Define each context beside the value it provides. Use `createContextProvider`
  from `@solid-primitives/context` and expose `XxxProvider` and `useXxx()` from
  the same module. Keep the raw accessor private. The public hook throws and
  names the required provider when used outside it.
- Create the value in the Provider factory when it owns that value's lifetime.
  When the caller already owns a stable value, pass it through a `value` prop.
- Use `session.ts`, `XxxSessionProvider`, and `useXxxSession()` for domain work
  that must survive leaving its route. Compose those providers in the fixed
  `MultiProvider` list at the App root layout; sessions that need the Server are
  listed only when an endpoint exists. Providers for query subscriptions
  and view state stay inside the route that uses them.
- Name a Context that coordinates a whole route `XxxPageState`, with its factory
  in `store.ts`. Use the specific capability name for a narrower Context.
  In larger modules, use `// MARK: <feature or operation>` to label sections.
  Keep queries, derived state, and actions together when they serve the same operation.

### Composition or Configuration

Ark UI wrappers narrow its API rather than republishing compound parts. Prefer
configuration when only values vary, and composition (`children`, render props,
or subcomponents) when consumers vary structure. Expose named `classes` slots
when one generic class string cannot describe the intended styling surface.

Review props when they obscure input/layout relationships; no fixed number of
consumers or slots requires or prohibits composition. Dot-notation exports alone
are not composition; use flat named exports unless parts share context.

### Translation and Errors

Web-owned copy uses the reactive typed `t()` from `lib/i18n.ts`. Resources use
i18next interpolation and plural forms, with keys inferred from the English JSON.
Keep user content, canonical IDs, brand names, technical format markers, keyboard
keys, initial prompt content, and developer/external diagnostics out of resources.

Call translations in reactive rendering or explicit caption/message functions;
do not store translated snapshots that go stale. Keep option identity and edits
stable across locale changes. Render results as text or normal attributes,
without HTML injection. Language persistence is best-effort so unavailable browser
storage does not prevent session switching.

API wrappers retain raw status/code/message and never translate transport errors.
`lib/error.ts` maps known codes through resources and falls back to the original
message for unknown codes. Stored diagnostics render as text; do not infer a
specific integration failure from a generic generation error.

Mounted pages and panels register reactive issue sources with `useIssueSource()`
from `store/issue.ts`. Cleanup removes them on unmount. Use `toFailureIssue()` for
dismissible operation failures with a translated source label. It suppresses
Server-unreachable failures, which the service status already shows. Error
placement is specified by the blueprint.

### Browser Utilities

Tokens live in `styles.css`; shared class recipes live in `lib/theme.ts`.
CodeMirror theme/locale updates reconfigure existing views rather than destroying
history or editable state.

Custom JSON text parsing, formatting, integer display, and property-line lookup
belong in `lib/json.ts`; EXIF parsing, graph validation, and mapping rules remain
domain-owned. Consumers validate before formatting. Preserve original numeric
tokens and escaped strings where text fidelity matters; ordinary object
serialization continues to use `JSON.stringify`.

## Configuration

Read env-backed values directly at the owning side-effect boundary. A project
constructor/helper does not receive a database path, base URL, storage root, or
Comfy filesystem root already owned by config. Passing resolved config from that
owner into a third-party API is expected:

```ts
// The capability loads its own canonical configuration.
const databaseClient = await createDatabaseClient()

// The owning entrypoint supplies the third-party bind options.
app.listen({ hostname: config.serverHost, port: config.serverPort })
```

Keep operation inputs such as Database, IDs, relative paths, grace periods, and
clock values explicit. Isolated validation sets environment variables before
importing the owner; it does not add runtime option overrides for config.

Load the root env explicitly for Vite/Desktop development and let process env
override dotenv. Avoid duplicate endpoint literals and cwd assumptions. Backend
ComfyUI/storage configuration never becomes frontend env. Exact variables and
setup belong to [.env.example](../.env.example) and runtime-specific READMEs;
ownership and deployment assumptions are in
[Configuration and Runtime Targets](architecture.md#configuration-and-runtime-targets).

Image helpers use relative paths and canonical storage config. Preserve the
locking, guarded deletion, and commit/unlink ordering explained in
[Image Storage and Consistency](architecture.md#image-storage-and-consistency).

## Naming

Use domain names that reveal responsibility and side effects, such as `taskId`,
`workflowId`, `createdAt`, and `relativePath`. Familiar abbreviations such as
`id`, `url`, `api`, `db`, `dto`, and `env` are fine.

Source directories use kebab-case. Use UpperCamelCase for component files named
after their main component, such as `ImageViewer.tsx`. Use kebab-case for all
other source file names, including TSX entry points such as `main.tsx` and modules
such as `drag-selection.ts`.
Toolchain-defined filenames such as `Cargo.toml` and Drizzle migration files
follow their toolchain's naming conventions.

Keep the domain first in domain-qualified file names. Separate the domain,
any qualifier, and the role with dots, and use kebab-case within each segment.
Examples include `workflow.api.ts`, `task.cache.ts`, and `task.image.service.ts`.

```text
<domain>.api.ts
<domain>.route.ts
<domain>.service.ts
<domain>.model.ts
<domain>.query.ts
<domain>.key.ts
<domain>.cache.ts
<domain>.event.ts
<integration>.client.ts
```

These are patterns, not a checklist of files to create. Avoid generic dumping
grounds such as `utils.ts`, `helpers.ts`, `common.ts`, and `misc.ts`.
