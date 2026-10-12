## Components and tokens

The designs are built from one library that matches the app: `components/hx-tokens.css` (the app's tokens) and `components/hx.css` (the app's components, under the app's class names).

- **Draw parts from the library**, with their classes and marks (`data-component="HxButton" data-component-variant="primary"`). States use `data-state`: `checked`, `on`, `off`, `disabled`, `error`.
- **Layout stays in the frame**, written with tokens such as `var(--hx-space-16)`.
- **A part the library doesn't have** is marked `data-component="New"` with a short `data-component-name`, and listed in the handoff under "Needs a component".
- **Emails are separate:** frames labelled EMAIL use inline styles and take no library classes or marks.
- **Every handoff names the frames it changed**, by `id`.
