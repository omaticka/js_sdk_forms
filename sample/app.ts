(function runSample() {
  const events: Array<{ eventType: string; properties: JsonObject; trackedAt: string }> = [];
  const eventLog = requiredElement<HTMLPreElement>("#events");
  const showButton = requiredElement<HTMLButtonElement>("#show-form");
  const clearButton = requiredElement<HTMLButtonElement>("#clear-log");

  window.exponea = {
    async track(eventType, properties) {
      events.unshift({
        eventType,
        properties,
        trackedAt: new Date().toISOString()
      });
      renderEvents();
    }
  };

  window.BloomreachForms.installExponeaForms(window.exponea, {
    async fetchForm(request) {
      await wait(120);
      const response = await fetch(`../example/forms/${encodeURIComponent(request.formId)}.json`);

      if (!response.ok) {
        throw new Error(`Unknown sample form '${request.formId}'.`);
      }

      return response.json() as Promise<DynamicFormDefinition>;
    },
    tracker: window.exponea
  });

  let currentHandle: RenderedDynamicFormWebLayer | undefined;

  showButton.addEventListener("click", showForm);
  clearButton.addEventListener("click", () => {
    events.length = 0;
    renderEvents();
  });

  void showForm();

  async function showForm(): Promise<void> {
    if (currentHandle !== undefined) {
      currentHandle.destroy("replace");
    }

    currentHandle = await window.exponea?.forms?.show(
      {
        formId: "preference-capture",
        placementId: "homepage-weblayer",
        locale: navigator.language
      },
      {
        left: 96,
        top: 112,
        eyebrow: "Preference form",
        onSubmitSuccess() {
          currentHandle?.destroy("submitted");
          currentHandle = undefined;
        },
        onSubmitFailed(error) {
          window.exponea?.track("dynamic_form_error", {
            message: error instanceof Error ? error.message : "Unknown submit error"
          });
        },
        onClose() {
          currentHandle = undefined;
        }
      }
    );
  }

  function renderEvents(): void {
    eventLog.textContent = events.length
      ? JSON.stringify(events, null, 2)
      : "No events yet.";
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function requiredElement<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector(selector);

    if (!(element instanceof Element)) {
      throw new Error(`Missing required sample element ${selector}.`);
    }

    return element as TElement;
  }
})();
