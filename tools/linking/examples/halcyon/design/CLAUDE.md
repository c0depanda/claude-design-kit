# Project authoring notes

Example notes for the invented product Halcyon. A real project starts from `templates/design-project-CLAUDE.md`.

## Saving canonical `.dc.html` files

1. Edit a working copy under `tmp/` with an `.html` extension through `run_script` → `saveFile`.
2. Copy it onto the canonical name with `copy_files` and `asset: ""`.
3. Delete the working copy once the canonical save is verified.

## Frames

- Draw each screen at 1440, 1024, 390 and 320. Fixed-width frames carry the class `hx-screen`.
- Each frame has a unique `id` and a `data-screen-label`.
