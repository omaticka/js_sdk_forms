/** JSON-safe primitive values accepted by tracking payloads and form context. */
type JsonPrimitive = string | number | boolean | null;

/** Recursive JSON value used for SDK request context and event properties. */
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/** Plain JSON object used by the lightweight SDK-facing interfaces. */
type JsonObject = { [key: string]: JsonValue };

/** Common metadata required by every field renderer and validator. */
interface DynamicFormBaseField {
  id: string;
  name: string;
  type: string;
  title: string;
  required?: boolean;
}

/** First-iteration field required by the assignment: short text input. */
interface DynamicFormTextField extends DynamicFormBaseField {
  type: "text";
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

/** Optional extension example that demonstrates how new field types fit later. */
interface DynamicFormCheckboxField extends DynamicFormBaseField {
  type: "checkbox";
  defaultValue?: boolean;
}

/** Union of currently supported field definitions. */
type DynamicFormField = DynamicFormTextField | DynamicFormCheckboxField;

/** Values collected from field renderers before submit tracking. */
type DynamicFormFieldValue = string | boolean;

/** Submitted values keyed by marketer-defined field name. */
type DynamicFormValues = Record<string, DynamicFormFieldValue>;

/** Server-provided form definition fetched before rendering. */
interface DynamicFormDefinition {
  schemaVersion?: string;
  formId: string;
  revision?: string;
  campaignId?: string;
  title?: string;
  submitLabel: string;
  fields: DynamicFormField[];
  tracking?: {
    eventType?: string;
  };
}

/** Request shape used by the SDK to fetch one form definition. */
interface FetchFormRequest {
  formId: string;
  placementId?: string;
  locale?: string;
  context?: JsonObject;
}

/** Attribution context attached to the submit tracking event. */
interface DynamicFormSubmissionContext {
  placementId?: string;
  pageUrl?: string;
}

/** Local SDK acknowledgement after tracking has been handed to exponea.track. */
interface DynamicFormSubmissionResult {
  accepted: boolean;
  tracked: boolean;
  trackedEventType: string;
  eventProperties: JsonObject;
  receivedAt: string;
}

/** Minimal existing JS SDK surface this prototype needs. */
interface ExponeaLike {
  track(eventType: string, properties: JsonObject): void | Promise<void>;
  forms?: ExponeaFormsApi;
}

/** Runtime dependencies supplied by the JS SDK integration layer. */
interface FormsCoreOptions {
  fetchForm(request: FetchFormRequest): Promise<DynamicFormDefinition>;
  tracker: ExponeaLike;
}

/** Headless API: no DOM, no SDK globals, only fetch and submit orchestration. */
interface FormsCore {
  fetch(request: FetchFormRequest): Promise<DynamicFormDefinition>;
  submit(
    definition: DynamicFormDefinition,
    values: DynamicFormValues,
    context?: DynamicFormSubmissionContext
  ): Promise<DynamicFormSubmissionResult>;
}

/** Handle returned by the inline DOM renderer. */
interface RenderedDynamicForm {
  element: HTMLFormElement;
  getValues(): DynamicFormValues;
  destroy(): void;
}

/** Handle returned by the weblayer-style popup renderer. */
interface RenderedDynamicFormWebLayer {
  element: HTMLElement;
  form: RenderedDynamicForm;
  destroy(reason?: string): void;
}

/** Renderer callbacks supplied by the SDK bridge. */
interface DynamicFormRenderOptions {
  onSubmit(values: DynamicFormValues): Promise<DynamicFormSubmissionResult>;
  onSubmitSuccess?(result: DynamicFormSubmissionResult, values: DynamicFormValues): void;
  onSubmitFailed?(error: unknown, values: DynamicFormValues): void;
}

/** Popup-specific rendering options. */
interface DynamicFormWebLayerOptions extends DynamicFormRenderOptions {
  left?: number;
  top?: number;
  eyebrow?: string;
  onClose?(reason: string): void;
}

/** Public options exposed by exponea.forms.render/show. */
interface ExponeaFormsShowOptions {
  left?: number;
  top?: number;
  eyebrow?: string;
  placementId?: string;
  pageUrl?: string;
  onSubmitSuccess?(result: DynamicFormSubmissionResult, values: DynamicFormValues): void;
  onSubmitFailed?(error: unknown, values: DynamicFormValues): void;
  onClose?(reason: string): void;
}

/** Proposed JS SDK API installed as window.exponea.forms. */
interface ExponeaFormsApi {
  fetch(request: FetchFormRequest): Promise<DynamicFormDefinition>;
  render(
    definition: DynamicFormDefinition,
    mount: Element,
    renderOptions?: ExponeaFormsShowOptions
  ): Promise<RenderedDynamicForm>;
  show(
    request: FetchFormRequest,
    showOptions?: ExponeaFormsShowOptions
  ): Promise<RenderedDynamicFormWebLayer>;
  submit(
    definition: DynamicFormDefinition,
    values: DynamicFormValues,
    context?: DynamicFormSubmissionContext
  ): Promise<DynamicFormSubmissionResult>;
}

/** Global declarations for this standalone browser prototype. */
interface Window {
  exponea?: ExponeaLike;
  BloomreachFormsCore: {
    createFormsCore(options: FormsCoreOptions): FormsCore;
    createSubmitEventProperties(
      definition: DynamicFormDefinition,
      values: DynamicFormValues,
      context?: DynamicFormSubmissionContext
    ): JsonObject;
    trackingFieldKey(fieldName: string): string;
  };
  BloomreachFormsRenderer: {
    renderForm(
      definition: DynamicFormDefinition,
      mount: Element,
      options: DynamicFormRenderOptions
    ): RenderedDynamicForm;
    renderWebLayer(
      definition: DynamicFormDefinition,
      options: DynamicFormWebLayerOptions
    ): RenderedDynamicFormWebLayer;
  };
  BloomreachForms: {
    installExponeaForms(exponea: ExponeaLike, options: FormsCoreOptions): ExponeaFormsApi;
  };
}
