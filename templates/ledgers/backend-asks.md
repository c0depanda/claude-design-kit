<!--
Template: what a designed screen needs that the backend's API doesn't provide. One entry per gap, written for a busy
backend engineer: no paragraphs. Before writing one:
  1. Does a built or designed screen need it? Name the screen.
  2. Does the API already provide it, under any name or by combining calls? Search the whole spec, examples included.
  3. Is it something only the backend can provide? Anything the app can work out itself is not an ask.
Meanwhile the app builds the designed element; the mock (if any) serves the data in the backend's resource shape; against
the real backend the element shows its unavailable state. Never fill it with sample values.
Delete this comment.
-->

# Backend asks · <phase> · <name>

### <short title> (<file and frame ids>)
- **Screen:** <the screen in the app, one line>
- **Today:** <optional, one line: what the API offers, only to stop "it's already there">
- **Missing:**
  - `<METHOD /path or resource.field>`: <a few words of why>
  - `<field>`: <why>
