# Files In `sample`

This directory contains a plain browser sample for the lightweight JS SDK Dynamic Forms prototype.

- `index.html`: Demo page that loads compiled JavaScript from `../dist`, shows ordinary page content, and hosts the draggable form popup above that content.
- `styles.css`: Demo page and form/weblayer styling. The renderer itself intentionally does not require a framework or CSS-in-JS runtime.
- `app.ts`: TypeScript sample application. It creates a mock `window.exponea`, installs `window.exponea.forms`, fetches the sample JSON payload, and logs tracked events on the page.

After editing `app.ts`, run `npm run build` from this project root so `dist/sample/app.js` is refreshed.

