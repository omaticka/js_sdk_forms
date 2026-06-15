/* Dependency-free DOM renderer and draggable weblayer shell for Dynamic Forms. */
(function attachDynamicFormsRenderer(global: Window) {
  /** Renders one semantic HTML form into a caller-provided mount element. */
  function renderForm(
    definition: DynamicFormDefinition,
    mount: Element,
    options: DynamicFormRenderOptions
  ): RenderedDynamicForm {
    const state: DynamicFormValues = {};
    const form = document.createElement("form");
    const error = document.createElement("div");

    form.className = "br-form";
    form.noValidate = true;

    if (definition.title) {
      const title = document.createElement("h2");
      title.className = "br-form__title";
      title.textContent = definition.title;
      form.append(title);
    }

    error.className = "br-form__error";
    error.setAttribute("role", "alert");
    error.hidden = true;

    for (const field of definition.fields) {
      state[field.name] = initialValue(field);
      form.append(renderField(field, state));
    }

    const submit = document.createElement("button");
    submit.className = "br-form__submit";
    submit.type = "submit";
    submit.textContent = definition.submitLabel;

    form.append(error, submit);
    mount.replaceChildren(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setError(error);
      submit.disabled = true;

      try {
        const result = await options.onSubmit({ ...state });
        options.onSubmitSuccess?.(result, { ...state });
      } catch (submitError) {
        options.onSubmitFailed?.(submitError, { ...state });
        setError(error, submitError instanceof Error ? submitError.message : "Submit failed.");
      } finally {
        submit.disabled = false;
      }
    });

    return {
      element: form,
      getValues() {
        return { ...state };
      },
      destroy() {
        form.remove();
      }
    };
  }

  /** Wraps the form in a small movable popup similar to a Weblayer placement. */
  function renderWebLayer(
    definition: DynamicFormDefinition,
    options: DynamicFormWebLayerOptions
  ): RenderedDynamicFormWebLayer {
    const shell = document.createElement("section");
    const header = document.createElement("div");
    const eyebrow = document.createElement("span");
    const close = document.createElement("button");
    const body = document.createElement("div");

    shell.className = "br-weblayer";
    shell.style.left = `${options.left ?? 88}px`;
    shell.style.top = `${options.top ?? 92}px`;
    shell.setAttribute("aria-label", definition.title ?? "Dynamic form");

    header.className = "br-weblayer__header";
    eyebrow.className = "br-weblayer__eyebrow";
    eyebrow.textContent = options.eyebrow ?? "Bloomreach Weblayer";
    close.className = "br-weblayer__close";
    close.type = "button";
    close.setAttribute("aria-label", "Close form");
    close.textContent = "x";
    body.className = "br-weblayer__body";

    header.append(eyebrow, close);
    shell.append(header, body);
    document.body.append(shell);

    const form = renderForm(definition, body, options);
    const stopDragging = makeDraggable(shell, header);

    close.addEventListener("click", () => handle.destroy("close"));

    const handle: RenderedDynamicFormWebLayer = {
      element: shell,
      form,
      destroy(reason) {
        stopDragging();
        shell.remove();
        options.onClose?.(reason ?? "api");
      }
    };

    return handle;
  }

  /** Chooses the built-in field renderer for a supported field definition. */
  function renderField(field: DynamicFormField, state: DynamicFormValues): HTMLElement {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    const id = `br-form-field-${field.id}`;

    wrapper.className = `br-form__field br-form__field--${field.type}`;
    label.className = "br-form__label";
    label.htmlFor = id;
    label.textContent = field.title;

    if (field.type === "checkbox") {
      const input = document.createElement("input");
      input.id = id;
      input.name = field.name;
      input.type = "checkbox";
      input.checked = field.defaultValue === true;
      input.addEventListener("change", () => {
        state[field.name] = input.checked;
      });
      wrapper.append(input, label);
      return wrapper;
    }

    const input = document.createElement("input");
    input.className = "br-form__input";
    input.id = id;
    input.name = field.name;
    input.type = "text";
    input.value = field.defaultValue ?? "";
    input.placeholder = field.placeholder ?? "";

    if (field.required) {
      input.required = true;
    }

    if (field.maxLength !== undefined) {
      input.maxLength = field.maxLength;
    }

    input.addEventListener("input", () => {
      state[field.name] = input.value;
    });

    wrapper.append(label, input);
    return wrapper;
  }

  /** Adds pointer and mouse dragging; returns a cleanup function for destroy(). */
  function makeDraggable(shell: HTMLElement, handle: HTMLElement): () => void {
    let activePointerId: number | null = null;
    let mouseDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function onPointerDown(event: PointerEvent): void {
      if (isButtonTarget(event.target)) {
        return;
      }

      activePointerId = event.pointerId;
      startDrag(event.clientX, event.clientY);
      handle.setPointerCapture(event.pointerId);
      shell.classList.add("br-weblayer--dragging");
    }

    function onMouseDown(event: MouseEvent): void {
      if (isButtonTarget(event.target)) {
        return;
      }

      mouseDragging = true;
      startDrag(event.clientX, event.clientY);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      shell.classList.add("br-weblayer--dragging");
    }

    function onPointerMove(event: PointerEvent): void {
      if (activePointerId !== event.pointerId) {
        return;
      }

      moveTo(event.clientX, event.clientY);
    }

    function onMouseMove(event: MouseEvent): void {
      if (!mouseDragging) {
        return;
      }

      moveTo(event.clientX, event.clientY);
    }

    function onPointerUp(event: PointerEvent): void {
      if (activePointerId !== event.pointerId) {
        return;
      }

      activePointerId = null;
      handle.releasePointerCapture(event.pointerId);
      shell.classList.remove("br-weblayer--dragging");
    }

    function onMouseUp(): void {
      if (!mouseDragging) {
        return;
      }

      mouseDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      shell.classList.remove("br-weblayer--dragging");
    }

    function startDrag(clientX: number, clientY: number): void {
      startX = clientX;
      startY = clientY;
      startLeft = shell.offsetLeft;
      startTop = shell.offsetTop;
    }

    function moveTo(clientX: number, clientY: number): void {
      const nextLeft = clamp(startLeft + clientX - startX, 12, window.innerWidth - shell.offsetWidth - 12);
      const nextTop = clamp(startTop + clientY - startY, 12, window.innerHeight - shell.offsetHeight - 12);
      shell.style.left = `${nextLeft}px`;
      shell.style.top = `${nextTop}px`;
    }

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("mousedown", onMouseDown);

    return function stopDragging(): void {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      handle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  /** Converts field defaults into renderer-local state values. */
  function initialValue(field: DynamicFormField): DynamicFormFieldValue {
    return field.type === "checkbox" ? field.defaultValue === true : field.defaultValue ?? "";
  }

  function setError(element: HTMLElement, message?: string): void {
    element.textContent = message ?? "";
    element.hidden = message === undefined;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function isButtonTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest("button") !== null;
  }

  global.BloomreachFormsRenderer = {
    renderForm,
    renderWebLayer
  };
})(window);
