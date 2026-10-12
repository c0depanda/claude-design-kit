# Claude Design Kit

**Give Claude Design a reusable design system and a clear way to specify screens, so Claude Code can build with less guesswork.**

The kit starts inside Claude Design, before the first feature screen: shared tokens, reusable components, a components page, and standing authoring rules. New designs build on those foundations as the product grows. Each handoff carries the component names, variants, states, layouts, and notes that the implementation needs.

Workflow guides, prompt templates, a Claude Code skill, and local tools carry that structure through export, implementation, and review. The handoff uses HTML, CSS, and explicit component marks, so you can use your own web stack without depending on React or Design Sync.

This is an independent project, not an official Anthropic product.

For Claude Design inside Artifacts, choose the **Design** template and follow the same [project setup](docs/getting-started.md#3-prepare-claude-design-before-asking-for-screens). Use the same authoring notes, component library, and journey prompts to specify the designs before handing them to Claude Code.

## Consistency starts inside Claude Design

As a product grows, separately styled screens can drift: the same button gets different spacing, a form invents a new input, or an error state is left for the coding session to decide. The kit gives Claude Design a structure for reusing decisions and recording the ones that still need to be made.

| The kit establishes | How it helps design and implementation |
|---|---|
| **Project authoring rules in `CLAUDE.md`** | Each design session has the same instructions for reuse, naming, states, layout, and handoff. |
| **Shared tokens and component stylesheets** | Screens draw from the same foundations. A shared style change goes into the library instead of being repeated by hand across frames. |
| **A components page with variants and states** | Claude Design has approved examples to reuse, including inner parts and placement. Claude Code has a reference for the reusable components it must build. |
| **Component names and marks in the design** | The export identifies which component, variant, size, and state a part represents, reducing the need to infer them from appearance. |
| **Explicit frames, journey links, and behaviour notes** | Layouts at different widths, error and empty states, copy, and transitions are specified before implementation. Missing decisions can be raised as questions. |
| **Rehearsed change packs and recorded decisions** | Later changes follow the same structure, with repeatable edits and a record of intentional differences between the design and the app. |

For example, a payment form and a settings form can both use the same named input, with its default, error, and disabled states shown on the components page. Claude Code can implement that shared input once and reuse it. If a screen needs a part the library does not contain, Claude Design marks it as `New` and lists it in the handoff so the addition is explicit.

You still review the designs and make product decisions. The kit gives both design and implementation a place to record those decisions and reuse them on the next screen.

## Use your web stack, with or without Design Sync

The design specification is expressed as HTML/CSS frames, token names, component marks, and written rules. A name such as `HxButton` identifies a reusable UI part; it does not require a React component. Map that part to your stack's component, template, partial, or helper, keeping its agreed variants and states.

That approach can be used with Vue, Svelte, Angular, plain HTML, or server-rendered templates in applications written in Python, Ruby, PHP, and other languages. Python and Node.js run the kit's local tools; they do not dictate the language of your app. The kit provides the specification and checks, while you implement the reusable parts in your chosen stack.

When Design Sync is unavailable or unsuitable for your project, the handoff still works: give Claude Design the prepared rules and prompts, export the designs, then let Claude Code inspect the files and build against them. Changes return through briefs or script packs and a fresh export. The workflow requires no live sync connection.

The automated contract checker inspects rendered browser pages through Playwright, rather than framework source code. It targets HTML/CSS interfaces; native UI renderers need their own comparison tools.

## Start here

| You want to… | Start with… |
|---|---|
| Understand how the kit reduces design and implementation guesswork | [Consistency starts inside Claude Design](#consistency-starts-inside-claude-design) |
| Try the tools without a Claude Design project | [Run the sample below](#try-it-locally) |
| Set up your first real project | [Getting started](docs/getting-started.md) |
| Understand the workflow and the reasons behind it | [WORKFLOW.md](WORKFLOW.md) — read sections 1–3 first |
| Find a command or environment setting | [Tools reference](tools/README.md) |
| Change many frames consistently | [Worked script-pack example](tools/linking/examples/halcyon/README.md) |
| Fix a setup problem | [Troubleshooting](docs/getting-started.md#troubleshooting) |
| Improve the kit | [Contributing](CONTRIBUTING.md) |

## How it works

1. **Specify the foundations inside Claude Design.** Establish authoring rules, shared tokens, reusable components, and a components page. Mirror the existing app's names, or agree them before building a new product.
2. **Design by reusing those foundations.** Draw screens from the library, mark their components and variants, and specify states, widths, and behaviour. Every frame has a stable ID; links describe the journey.
3. **Export and inspect.** Download the design project, install it with a backup, then read its frames, copy, links, and component marks with the local tools.
4. **Build reusable parts in your stack.** Use the named components and their variants across the app, with the frames and notes as the specification and real data supplied by the backend.
5. **Compare and iterate.** Check the app against mapped frames. Send design work back as a brief; send bulk edits as a locally rehearsed script pack.

The owner carries prompts and files into Claude Design and exports the result. The kit does not connect to your Claude account or automatically sync projects. Its CLI tools need no Claude API key.

## Try it locally

You need **Git** and **Python 3.9+** for this first example. Commands use a macOS/Linux shell; on Windows, use WSL for these instructions.

```sh
git clone https://github.com/c0depanda/claude-design-kit.git
cd claude-design-kit
export KIT="$PWD"
export DESIGN_DIR="$KIT/tools/linking/examples/halcyon/design"

python3 "$KIT/tools/design.py" files
python3 "$KIT/tools/design.py" labels P1
python3 "$KIT/tools/design.py" text P1 '^hx-p1-1-390$'
python3 "$KIT/tools/design.py" check all
```

You should see **four frames in `P1 Payments.dc.html`**, the recipient screen's text, and **zero link/ID problems**. Halcyon is an invented payments product; all example people, amounts, and references are fictional. The sample is deliberately small, not a complete product or component library.

For screenshots, install **Node.js 20+**, then Playwright and Chromium:

```sh
cd "$KIT/tools"
npm ci
npx playwright install chromium
node "$KIT/tools/shoot.mjs" P1 '^hx-p1-1-390$' "$KIT/scratch/frames"
```

Open `scratch/frames/P1-hx-p1-1-390.png` to see the sample phone frame. See [getting started](docs/getting-started.md) to point `DESIGN_DIR` at your own export and [the worked example](tools/linking/examples/halcyon/README.md) to build and rehearse a change.

## Use it with Claude Code

With `KIT` set to your clone's absolute path:

```sh
mkdir -p "$HOME/.claude/skills"
ln -s "$KIT" "$HOME/.claude/skills/claude-design-workflow"
```

In Claude Code, invoke:

```text
/claude-design-workflow Help me set up a new Claude Design project.
```

Tell the session where the kit, design export, work folder, and app repository live. The [setup guide](docs/getting-started.md#use-the-claude-code-skill) covers project-only installation and a copy-based fallback. You can also use the workflow and CLI tools manually. See [Claude Code's skill documentation](https://code.claude.com/docs/en/skills) for how skills are discovered and invoked.

## What's included

| Path | Purpose |
|---|---|
| [WORKFLOW.md](WORKFLOW.md) | The full design-to-implementation process, with the reason for each rule. |
| [SKILL.md](SKILL.md) | Claude Code's entry point and task-specific reading guide. |
| [templates/](templates/) | Project authoring notes, day-0 and journey prompts, handoff briefs, a canvas skeleton, library skeletons, contract examples, and tracking ledgers. |
| [tools/design.py](tools/design.py) | Read frame labels, text, notes, and links; check IDs and link targets. |
| [tools/shoot.mjs](tools/shoot.mjs) | Screenshot selected design frames. |
| [tools/install-export.py](tools/install-export.py) | Compare and install an export, keeping the previous version as a backup. |
| [tools/contract/](tools/contract/) | Compare an app's static layout, copy, type, and colours with mapped design frames. |
| [tools/linking/](tools/linking/) | Build, fingerprint, rehearse, and render-check repeatable bulk design changes. |
| [tools/env.example](tools/env.example) | Per-project path and tool settings. |

## Boundaries

- The tools expect HTML exports containing `*.dc.html` files and frames marked with `id` and `data-screen-label`. The templates establish that structure; arbitrary screenshots or app prototypes are not compatible inputs.
- Claude Design prompts assume the file and script tools described in [WORKFLOW.md](WORKFLOW.md#1-the-loop-and-who-does-what). Check those capabilities in your project before using script packs; product changes may require adapting the prompts.
- Keep your real exports, app, and project work outside this repository. Each export install replaces the design folder; briefs, packs, reports, and ledgers belong in a separate work folder.
- The contract checker writes review reports. It is not a complete accessibility, interaction, or visual-regression test suite, and findings do not automatically fail the process. Review reports and walk the app separately.
