# Files In `example/forms`

This directory contains sample Dynamic Forms payloads.

- `preference-capture.json`: Example form definition used by `sample/app.ts`. It includes the required assignment fields for text inputs and one optional checkbox field to demonstrate future extensibility.

In production, these JSON payloads should be generated/validated from a single contract shared by backend delivery, SDK TypeScript types, runtime validation, and marketer-authoring tooling.

