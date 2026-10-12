---
name: claude-design-workflow
description: Workflow, templates and tools for working with Claude Design, including Design artifacts in Claude and standalone projects. The local tools read .dc.html exports. Use when a task involves setting up a Claude Design project, asking Claude Design to draw or change screens, writing a brief or prompt for it, building or verifying a script pack, installing a new design export, reading frames from a design export, or building and checking an app against the designs.
---

# Claude Design workflow

Before acting, read `WORKFLOW.md` in this folder: sections 1 to 3 always, then the section for the task. Templates are in `templates/` and tools in `tools/` (how to run each: `tools/README.md`). Paths here are relative to this file's folder.

| Task | Read | Use |
|---|---|---|
| Start a Claude Design project | WORKFLOW 2 | `templates/claude-design-day-0-prompt.md`, `templates/design-project-CLAUDE.md`, `templates/library/` |
| Ask Claude Design for a journey or screens | WORKFLOW 3, 5.1–5.2 | `templates/claude-design-first-journey-prompt.md`, `templates/canvas-skeleton.dc.html`, `templates/HANDOFF-brief.md` |
| Bulk changes across many frames | WORKFLOW 5.3–5.5 | `tools/linking/build-pack.mjs`, `run-pack-local.mjs`, `compare-render.mjs`, `templates/claude-design-prompt.md`, `tools/linking/examples/halcyon/` |
| Install a new export | WORKFLOW 5.6 | `tools/install-export.py`, `tools/linking/index.mjs`, `tools/design.py check` |
| Read designs | WORKFLOW 6 | `tools/design.py`, `tools/shoot.mjs` |
| Build and check the app | WORKFLOW 7 | `tools/contract/check.mjs`, `templates/frame-routes.example.json`, `templates/ledgers/` |

Rules that apply to every task:

- Use the same authoring notes and templates for Design artifacts. Check the export structure and available project tools before applying file or script-pack steps (WORKFLOW 1); report missing capabilities and leave unsupported operations unapplied.
- A design file is a canvas of static frames, never an app: every screen, state and width is a frame, and interaction is a link to the next state's frame.
- Never open a `.dc.html` file whole; read it with `tools/design.py` and `tools/shoot.mjs`.
- Never write inside the design export: it is replaced by the next one. Briefs, packs, ledgers and backups go in the project's work folder.
- Never ask Claude Design to read, restyle or audit frames by hand. Bulk changes go as fingerprinted script packs, built and rehearsed locally first.
- Search every design file, notes included, before calling something missing.
- Build every designed element; data the backend lacks becomes a backend ask, and the element shows its unavailable state.
- Never use a design-sync connector on screen files.

Tool settings (`DESIGN_DIR`, `PLAYWRIGHT_MODULE`, `APP_URL` and others) are environment variables: see `tools/env.example`. If they aren't set, ask the owner where the export, the work folder and the app are.
