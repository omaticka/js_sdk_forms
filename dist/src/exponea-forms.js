"use strict";
/* JS SDK bridge: installs Dynamic Forms on an exponea-like object. */
(function attachExponeaForms(global) {
    /** Installs the proposed exponea.forms namespace onto an initialized SDK object. */
    function installExponeaForms(exponea, options) {
        const core = global.BloomreachFormsCore.createFormsCore({
            fetchForm: options.fetchForm,
            tracker: exponea
        });
        const api = {
            fetch(request) {
                return core.fetch(request);
            },
            async render(definition, mount, renderOptions) {
                const options = {
                    onSubmit(values) {
                        return core.submit(definition, values, submitContext(renderOptions));
                    }
                };
                if (renderOptions?.onSubmitSuccess !== undefined) {
                    options.onSubmitSuccess = renderOptions.onSubmitSuccess;
                }
                if (renderOptions?.onSubmitFailed !== undefined) {
                    options.onSubmitFailed = renderOptions.onSubmitFailed;
                }
                return global.BloomreachFormsRenderer.renderForm(definition, mount, options);
            },
            async show(request, showOptions) {
                const definition = await core.fetch(request);
                trackBanner(exponea, "show", definition, request);
                const options = {
                    onSubmit(values) {
                        trackBanner(exponea, "submit", definition, request);
                        return core.submit(definition, values, submitContext({ ...showOptions, request }));
                    },
                    onClose(reason) {
                        trackBanner(exponea, "close", definition, request, { close_reason: reason });
                        showOptions?.onClose?.(reason);
                    }
                };
                if (showOptions?.left !== undefined) {
                    options.left = showOptions.left;
                }
                if (showOptions?.top !== undefined) {
                    options.top = showOptions.top;
                }
                if (showOptions?.eyebrow !== undefined) {
                    options.eyebrow = showOptions.eyebrow;
                }
                if (showOptions?.onSubmitSuccess !== undefined) {
                    options.onSubmitSuccess = showOptions.onSubmitSuccess;
                }
                if (showOptions?.onSubmitFailed !== undefined) {
                    options.onSubmitFailed = showOptions.onSubmitFailed;
                }
                return global.BloomreachFormsRenderer.renderWebLayer(definition, options);
            },
            submit(definition, values, context) {
                return core.submit(definition, values, context);
            }
        };
        exponea.forms = api;
        return api;
    }
    /** Builds tracking context shared by inline and popup form submissions. */
    function submitContext(options) {
        const request = options?.request;
        const context = {
            pageUrl: options?.pageUrl ?? window.location.href
        };
        const placementId = options?.placementId ?? request?.placementId;
        if (placementId !== undefined) {
            context.placementId = placementId;
        }
        return context;
    }
    /** Tracks lightweight popup lifecycle in the same event style as campaign banners. */
    function trackBanner(exponea, action, definition, request, extra = {}) {
        const properties = {
            action,
            content_type: "dynamic_form",
            form_id: definition.formId,
            page_url: window.location.href,
            ...extra
        };
        if (definition.campaignId !== undefined) {
            properties.campaign_id = definition.campaignId;
        }
        if (request?.placementId !== undefined) {
            properties.placement_id = request.placementId;
        }
        return exponea.track("banner", properties);
    }
    global.BloomreachForms = {
        installExponeaForms
    };
})(window);
