# JS SDK Dynamic Forms Design

## Summary

This prototype implements Dynamic Forms for the Web SDK path of the assignment. The implementation is intentionally small: TypeScript-authored source compiles to browser JavaScript, renders native DOM controls, displays the form as a draggable weblayer-style popup, and submits values through an `exponea.track(eventType, properties)`-style API.

The key design choice is separation:

```text
Form delivery payload
  -> headless form core
  -> DOM renderer or weblayer renderer
  -> JS SDK bridge installed as exponea.forms
  -> exponea.track(...) for submit and lifecycle events
```

The prototype is Web SDK only. React Native implications are still discussed below because a production design should keep the payload and tracking model portable.

## Documentation And SDK Alignment

I've breifly studied following docs suggested in assignment so I tried to follow
some concepts from it (track, fetch, ...)

- Bloomreach JavaScript SDK documentation: `https://documentation.bloomreach.com/engagement/docs/js-sdk`
- Bloomreach Web tracking documentation: `https://documentation.bloomreach.com/engagement/docs/web-tracking`
- Bloomreach web personalization/weblayer documentation: `https://documentation.bloomreach.com/engagement/docs/personalization`
- Bloomreach in-app messages documentation: `https://documentation.bloomreach.com/engagement/docs/in-app-messages`

Important alignment points:

- Web tracking examples use `exponea.track(eventType, properties)`, so form submit is delegated through that style rather than inventing a separate submit endpoint in the renderer.
- Web personalization already has weblayer concepts and SPA reload hooks, so a popup form could later become a structured weblayer/campaign content type rather than a separate campaign engine.
- In-app/mobile messaging tracks campaign lifecycle separately from user interaction. This prototype mirrors that by tracking `banner` events for show/submit/close and `dynamic_form_submit` for submitted values.
- The renderer avoids React and framework dependencies because the JS SDK runs directly inside customer pages with unknown frameworks, versions, and bundling constraints.

## Assignment Feature Requirements

| Requirement                                               |          Status | Implementation                                                                                                            |
| --------------------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------- |
| Marketeer can define 1-5 text inputs                      | Met for Web SDK | `DynamicFormDefinition.fields` supports text fields; runtime validation enforces 1-5 fields in `src/forms-core.ts`.       |
| Marketeer can define title and placeholder for each input |             Met | `DynamicFormTextField.title` and `placeholder`; renderer maps them to `<label>` and `input.placeholder`.                  |
| Marketeer can define submit button text                   |             Met | `DynamicFormDefinition.submitLabel` is rendered as button text.                                                           |
| Form management UI out of scope                           |       Respected | No management UI is implemented. The JSON payload models what management tooling would produce.                           |
| Form aligns with host app look and feel                   | Met for Web SDK | Renderer emits semantic DOM with CSS classes. Host CSS controls final appearance; sample demonstrates one style.          |
| User inputs are tracked to Engagement on submit           |             Met | Core builds event properties and calls `exponea.track("dynamic_form_submit", properties)` or payload-provided event type. |
| Success and failure callbacks                             |             Met | `onSubmitSuccess` and `onSubmitFailed` are exposed through render/show options and called by the renderer.                |

Note: the sample JSON includes one checkbox field. That is intentionally beyond the first-iteration text-input requirement and exists only to show how future field types can be added. The MVP can restrict marketer tooling to text fields.

## Expected Deliverables

| Deliverable                                                 | Status | Where                                                                                        |
| ----------------------------------------------------------- | -----: | -------------------------------------------------------------------------------------------- |
| Design document with architecture, data flow, and rationale |    Met | This document.                                                                               |
| Quality assurance strategy                                  |    Met | `Testing Strategy` section below.                                                            |
| API/payload specification expected from server              |    Met | `Payload Specification` section and `example/forms/preference-capture.json`.                 |
| Programmable interface for embedding rendered forms         |    Met | `exponea.forms.fetch`, `exponea.forms.render`, `exponea.forms.show`, `exponea.forms.submit`. |

## Architecture

### `src/forms-core.ts`

The core is headless. It receives two SDK-owned dependencies:

- `fetchForm(request)`: loads a form definition.
- `tracker.track(eventType, properties)`: existing JS SDK tracking path.

The core validates the fetched payload, normalizes values, checks required/min/max validation, creates flat tracking properties, and delegates submit tracking. It does not create DOM nodes and does not know about popup placement.

### `src/forms-renderer.ts`

The renderer creates browser-native controls:

- `<form>`
- `<label>`
- `<input type="text">`
- `<input type="checkbox">`
- `<button type="submit">`

The weblayer wrapper is a small draggable shell around the same form renderer. It proves the form can live above normal HTML content like a campaign popup while keeping rendering reusable.

### `src/exponea-forms.ts`

The SDK bridge installs:

```ts
window.exponea.forms = {
  fetch,
  render,
  show,
  submit,
};
```

This layer knows about `window.exponea`, connects core and renderer, tracks `banner` lifecycle events, and passes submission callbacks through to the renderer.

## Runtime Flow

### Popup / Weblayer Flow

```text
Customer page loads JS SDK
  -> SDK initializes exponea
  -> forms module installs exponea.forms
  -> app or campaign calls exponea.forms.show({ formId, placementId })
  -> SDK fetches form definition
  -> core validates definition
  -> SDK tracks banner show
  -> renderer creates draggable popup and native form controls
  -> user submits
  -> renderer calls core.submit
  -> core validates values
  -> core calls exponea.track("dynamic_form_submit", properties)
  -> renderer calls onSubmitSuccess or onSubmitFailed
  -> SDK tracks banner close if popup is destroyed
```

### Inline Flow

```text
const definition = await exponea.forms.fetch({ formId });
await exponea.forms.render(definition, mountElement, callbacks);
```

This is useful when a customer wants a fixed page slot rather than a popup.

## Proposed JS SDK Interface

```ts
const handle = await exponea.forms.show(
  {
    formId: "preference-capture",
    placementId: "homepage-weblayer",
    locale: navigator.language,
  },
  {
    onSubmitSuccess(result, values) {
      console.log("Tracked", values);
    },
    onSubmitFailed(error, values) {
      console.error("Not tracked", error, values);
    },
  },
);
```

Inline rendering:

```ts
const definition = await exponea.forms.fetch({ formId: "preference-capture" });

await exponea.forms.render(definition, document.querySelector("#slot"), {
  placementId: "footer-preferences",
  onSubmitSuccess(result, values) {},
  onSubmitFailed(error, values) {},
});
```

Manual submit for custom renderers:

```ts
await exponea.forms.submit(definition, values, {
  placementId: "custom-renderer",
  pageUrl: window.location.href,
});
```

## Payload Specification

Current prototype payload:

```json
{
  "schemaVersion": "2026-06-01",
  "formId": "preference-capture",
  "revision": "sample-1",
  "campaignId": "sample-weblayer-campaign",
  "title": "Tell us what you like",
  "submitLabel": "Save preferences",
  "fields": [
    {
      "id": "favorite_category",
      "type": "text",
      "name": "favorite_category",
      "title": "Favorite category",
      "placeholder": "Running shoes",
      "required": true,
      "maxLength": 80
    }
  ],
  "tracking": {
    "eventType": "dynamic_form_submit"
  }
}
```

Production contract notes:

- `schemaVersion`: required once the backend contract stabilizes. Here I expect e.g. JSON schema for runtime payload validation will exist in the future.
- `formId`: stable marketer-authored form identifier.
- `revision`: useful for analytics, debugging, and rollout safety.
- `campaignId`: optional when the form is campaign/weblayer-owned.
- `submitLabel`: marketer-defined submit button text.
- `fields`: 1-5 fields for MVP; first production field type should be `text`. To try out extensibility, I also created checkbox/boolean filed type although it was not required in assignment.
- `tracking.eventType`: optional override; default should stay `dynamic_form_submit`.

## Tracking Model

Submit event:

```ts
exponea.track("dynamic_form_submit", {
  form_id,
  form_revision,
  campaign_id,
  placement_id,
  page_url,
  submitted_field_names,
  submitted_field_count,
  submitted_field_values,
  field_value_favorite_category,
});
```

Popup lifecycle:

```ts
exponea.track("banner", {
  action: "show" | "submit" | "close",
  content_type: "dynamic_form",
  form_id,
  campaign_id,
  placement_id,
  page_url,
});
```

This keeps campaign lifecycle analytics separate from submitted zero-party data.

## Existing JS SDK Integration

In production, the sample `fetchForm` function should be replaced with JS SDK transport:

```text
SDK config / project token / customer cookie / consent context
  -> existing delivery client
  -> fetch eligible form or form campaign
  -> core validation
  -> renderer
```

Preferred production direction:

- Add `exponea.forms` as a small module on the initialized JS SDK.
- Reuse existing SDK request utilities for base URL, project token, customer identification, retry policy, consent, and logging.
- Later integrate `forms.show(...)` with Weblayers so campaigns can deliver `content_type: "dynamic_form"`.
- Support SPA refresh through the same conceptual lifecycle as existing weblayers, for example a future `reloadWebLayers` integration.

## Extending With New Field Types

To add a new field type:

1. Add a new TypeScript field interface in `src/types.ts`.
2. Add payload validation in `src/forms-core.ts`.
3. Add value normalization and submit validation in `src/forms-core.ts`.
4. Add a renderer branch in `src/forms-renderer.ts`.
5. Add sample JSON under `example/forms/`.
6. Add unit tests for valid/invalid payloads and submitted values.

For production maintainability, field definitions should not be manually duplicated across backend, SDK, and tooling. The better path is one source of truth, such as OpenAPI or an internal contract schema, generating:

- TypeScript payload types.
- Runtime validation schema for fetched payloads.
- Authoring-tool validation for marketer-created forms.
- Example fixtures and contract tests.

## Styling

The renderer emits stable CSS hooks such as:

- `.br-form`
- `.br-form__title`
- `.br-form__field`
- `.br-form__label`
- `.br-form__input`
- `.br-form__submit`
- `.br-weblayer`

The SDK should ship minimal structural styles only if needed for safe rendering. Customers should be able to provide or override CSS so forms match the embedding page.

## Testing Strategy

### Unit Tests

- Validate allowed payloads: 1-5 text fields, title, placeholder, submit label.
- Reject invalid payloads: missing form ID, missing submit label, zero fields, more than five fields, duplicate field names, unsupported field type.
- Validate submitted values: required fields, min/max length, checkbox acceptance if enabled later.
- Verify tracking properties: stable keys, field values, campaign ID, placement ID, page URL.

### Contract Tests

- Validate real server payloads against generated runtime schema.
- Ensure TypeScript types and runtime schema are generated from the same source.
- Add fixtures for every supported field type.

### Browser Integration Tests

- Render inline form and popup form.
- Submit success calls `exponea.track`.
- Submit failure calls `onSubmitFailed`.
- Popup lifecycle tracks `banner` show/submit/close.
- Draggable shell moves within viewport bounds.
- Basic accessibility checks: labels, focus order, submit button, alert region.

### Compatibility Tests

- Run against supported browsers.
- Include at least one older-but-supported customer browser if JS SDK has such a support policy.
- Run sample in a page with existing CSS to catch style leakage.
- Validate SPA navigation/reload behavior once integrated with Weblayers.

## Some thoughts

- Generate TypeScript types and runtime validation from one contract source.
- Replace the sample fetch function with real JS SDK transport.
- Decide whether forms are direct SDK content or structured Weblayer campaign content; probably Weblayer content, but was not able to dig in the depth in the docs yet to have full understanding to be honest.
- Add automated tests. Idealy also E2E with mock engagement server.
- Gate non-text field types until the product is ready to expose them in marketer tooling.
