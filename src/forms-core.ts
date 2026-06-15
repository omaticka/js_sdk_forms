/* Lightweight headless Dynamic Forms core for a JavaScript SDK integration. */
(function attachDynamicFormsCore(global: Window) {
  const DEFAULT_SUBMIT_EVENT_TYPE = "dynamic_form_submit";

  /** Creates the headless form API from SDK-owned fetch and tracking functions. */
  function createFormsCore(options: FormsCoreOptions): FormsCore {
    const fetchForm = requiredFunction(options.fetchForm, "fetchForm");
    const tracker = requiredTracker(options.tracker);

    return {
      async fetch(request) {
        const definition = await fetchForm(request);
        validateDefinition(definition);
        return definition;
      },

      async submit(definition, values, context) {
        validateDefinition(definition);
        const normalizedValues = normalizeValues(definition, values);
        validateValues(definition, normalizedValues);

        const eventType = definition.tracking?.eventType ?? DEFAULT_SUBMIT_EVENT_TYPE;
        const properties = createSubmitEventProperties(definition, normalizedValues, context);

        await tracker.track(eventType, properties);

        return {
          accepted: true,
          tracked: true,
          trackedEventType: eventType,
          eventProperties: properties,
          receivedAt: new Date().toISOString()
        };
      }
    };
  }

  /** Validates the fetched payload before any renderer creates UI from it. */
  function validateDefinition(definition: DynamicFormDefinition): void {
    if (!definition || typeof definition !== "object") {
      throw new Error("Dynamic form definition must be an object.");
    }

    if (!definition.formId) {
      throw new Error("Dynamic form definition is missing formId.");
    }

    if (!definition.submitLabel) {
      throw new Error("Dynamic form definition is missing submitLabel.");
    }

    if (!Array.isArray(definition.fields) || definition.fields.length < 1 || definition.fields.length > 5) {
      throw new Error("Dynamic form definition must contain 1 to 5 fields.");
    }

    const names = new Set<string>();
    for (const field of definition.fields) {
      validateField(field);
      if (names.has(field.name)) {
        throw new Error(`Dynamic form contains duplicate field name '${field.name}'.`);
      }
      names.add(field.name);
    }
  }

  /** Checks field metadata every renderer depends on: id, name, type, title. */
  function validateField(field: DynamicFormField): void {
    if (!field || typeof field !== "object") {
      throw new Error("Dynamic form field must be an object.");
    }

    for (const key of ["id", "name", "type", "title"] as const) {
      if (!field[key]) {
        throw new Error(`Dynamic form field is missing ${key}.`);
      }
    }

    const fieldType: string = field.type;
    if (fieldType !== "text" && fieldType !== "checkbox") {
      throw new Error(`Unsupported dynamic form field type '${fieldType}'.`);
    }
  }

  /** Converts raw renderer state into stable values suitable for validation/tracking. */
  function normalizeValues(definition: DynamicFormDefinition, values: DynamicFormValues): DynamicFormValues {
    const normalized: DynamicFormValues = {};

    for (const field of definition.fields) {
      const value = Object.prototype.hasOwnProperty.call(values, field.name)
        ? values[field.name]
        : undefined;

      if (field.type === "checkbox") {
        normalized[field.name] = value === true;
      } else {
        normalized[field.name] = value == null ? "" : String(value).trim();
      }
    }

    return normalized;
  }

  /** Applies client-side validation before handing the event to exponea.track. */
  function validateValues(definition: DynamicFormDefinition, values: DynamicFormValues): void {
    for (const field of definition.fields) {
      const value = values[field.name];

      if (field.type === "checkbox") {
        if (field.required && value !== true) {
          throw new Error(`${field.title} must be accepted.`);
        }
        continue;
      }

      const textValue = typeof value === "string" ? value : "";

      if (field.required && !textValue) {
        throw new Error(`${field.title} is required.`);
      }

      if (field.minLength !== undefined && textValue.length < field.minLength) {
        throw new Error(`${field.title} is too short.`);
      }

      if (field.maxLength !== undefined && textValue.length > field.maxLength) {
        throw new Error(`${field.title} is too long.`);
      }
    }
  }

  /** Builds flat/list-style event properties for Engagement analytics. */
  function createSubmitEventProperties(
    definition: DynamicFormDefinition,
    values: DynamicFormValues,
    context?: DynamicFormSubmissionContext
  ): JsonObject {
    const fieldNames = definition.fields.map((field) => field.name);
    const properties: JsonObject = {
      form_id: definition.formId,
      form_revision: definition.revision ?? "",
      submitted_field_names: fieldNames,
      submitted_field_count: fieldNames.length,
      submitted_field_values: fieldNames.map((fieldName) => values[fieldName] ?? "")
    };

    if (definition.campaignId !== undefined) {
      properties.campaign_id = definition.campaignId;
    }

    if (context?.placementId !== undefined) {
      properties.placement_id = context.placementId;
    }

    if (context?.pageUrl !== undefined) {
      properties.page_url = context.pageUrl;
    }

    for (const fieldName of fieldNames) {
      properties[`field_value_${trackingFieldKey(fieldName)}`] = values[fieldName] ?? "";
    }

    return properties;
  }

  /** Normalizes marketer-defined field names before using them as event keys. */
  function trackingFieldKey(fieldName: string): string {
    return String(fieldName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^$/, "unknown");
  }

  function requiredFunction(
    value: FormsCoreOptions["fetchForm"],
    name: string
  ): FormsCoreOptions["fetchForm"] {
    if (typeof value !== "function") {
      throw new Error(`${name} must be a function.`);
    }
    return value;
  }

  function requiredTracker(tracker: FormsCoreOptions["tracker"]): ExponeaLike {
    if (!tracker || typeof tracker.track !== "function") {
      throw new Error("Dynamic Forms require an exponea-like tracker with track(eventType, properties).");
    }
    return tracker;
  }

  global.BloomreachFormsCore = {
    createFormsCore,
    createSubmitEventProperties,
    trackingFieldKey
  };
})(window);
