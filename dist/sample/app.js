"use strict";
(function runSample() {
    const events = [];
    const eventLog = requiredElement("#events");
    const showButton = requiredElement("#show-form");
    const clearButton = requiredElement("#clear-log");
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
            return response.json();
        },
        tracker: window.exponea
    });
    let currentHandle;
    showButton.addEventListener("click", showForm);
    clearButton.addEventListener("click", () => {
        events.length = 0;
        renderEvents();
    });
    void showForm();
    async function showForm() {
        if (currentHandle !== undefined) {
            currentHandle.destroy("replace");
        }
        currentHandle = await window.exponea?.forms?.show({
            formId: "preference-capture",
            placementId: "homepage-weblayer",
            locale: navigator.language
        }, {
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
        });
    }
    function renderEvents() {
        eventLog.textContent = events.length
            ? JSON.stringify(events, null, 2)
            : "No events yet.";
    }
    function wait(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }
    function requiredElement(selector) {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) {
            throw new Error(`Missing required sample element ${selector}.`);
        }
        return element;
    }
})();
