# Files In `src`

This directory contains the maintained TypeScript source for the lightweight JS SDK forms prototype.

- `types.ts`: Shared browser-global TypeScript contracts for form payloads, values, render handles, callbacks, and the proposed `exponea.forms` API.
- `forms-core.ts`: Headless form logic. It fetches via an SDK-provided function, validates payloads/values, normalizes submitted values, creates tracking properties, and delegates submit tracking to `exponea.track(...)`.
- `forms-renderer.ts`: Dependency-free DOM renderer. It creates semantic browser controls and a draggable weblayer-style shell without knowing anything about SDK configuration or network transport.
- `exponea-forms.ts`: JS SDK bridge. It installs `exponea.forms`, connects core to renderer, and tracks popup lifecycle events as `banner` events.

The separation is intentional: core is reusable, rendering is replaceable, and SDK integration remains thin.

