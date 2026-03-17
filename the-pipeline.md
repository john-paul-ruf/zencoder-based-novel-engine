# Novel Engine — Agent Pipeline

## The Agents

| Agent | File | Role | One-Line Summary |
|---|---|---|---|
| **Spark** | `SPARK.md` | Pitch & Scaffold | Discovers ideas, builds pitch cards, scaffolds project structure. |
| **Verity** | `VERITY.md` | Ghostwriter | Writes prose to the author's voice. The only agent that creates or modifies `draft.md` files. |
| **Ghostlight** | `GHOSTLIGHT.md` | First Reader | Reads the manuscript cold and reports the experience — engagement, confusion, emotion, drift. |
| **Lumen** | `LUMEN.md` | Developmental Editor | Structural diagnosis — arc, pacing, scene necessity, theme, opening/closing. |
| **Sable** | `SABLE.md` | Copy Editor | Mechanical audit — consistency, continuity, grammar, repetition, formatting. |
| **Forge** | `FORGE.MD` | Task Master | Synthesizes Lumen/Sable reports into a phased revision task list and ready-to-paste Verity session prompts. |
| **Quill** | `QUILL.md` | Publisher | Output audit, book description, pricing, metadata, publication prep. |

---

## The Pipeline

```
    ┌─────────────┐
    │    SPARK     │  pitch & scaffold
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   VERITY     │  first draft
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  GHOSTLIGHT  │  first read
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    LUMEN     │  first assessment
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    FORGE     │  revision planning
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   VERITY     │  revise
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  GHOSTLIGHT  │  second read
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    LUMEN     │  second assessment
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    SABLE     │  copy edit
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    FORGE     │  copy edit planning
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   VERITY     │  mechanical fixes
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    BUILD     │  node scripts/build.js
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    QUILL     │  publish
    └─────────────┘
```

### Phase 1: Pitch & Scaffold

**Agent:** Spark

Spark works in two modes. **Pitch Mode** is conversational — exploring ideas, pressure-testing premises, building Pitch Cards. **Build Mode** activates only after the author explicitly approves a pitch. Spark then scaffolds the full project: `about.json`, seeded Voice Profile, seeded Story Bible, empty Scene Outline template, and updates `active-book.json`.

**Input:** A conversation, a hunch, a "what if."
**Output:** `books/<book>/` directory with all starter files. `active-book.json` pointed at the new project.

### Phase 2: First Draft

**Agent:** Verity

Verity completes the Voice Profile (seeded by Spark), populates the Scene Outline, expands the Story Bible, then writes the manuscript chapter by chapter. Verity is the only agent that creates or modifies `draft.md` files. Author Notes go in separate `notes.md` files per chapter.

**Input:** Scaffolded project with seeded source documents.
**Output:** Complete first draft in `chapters/*/draft.md`. Populated Voice Profile, Scene Outline, and Story Bible.

### Phase 3: First Read

**Agent:** Ghostlight

Ghostlight reads the full manuscript in one pass, tracking engagement (1–5 per chapter), emotional beats, confusion points, drift moments, and predictions. Ghostlight deliberately does not load the Scene Outline, Story Bible, or Author Notes — it reads cold, the way a real first reader would. The Voice Profile is loaded only after the experiential sections are written.

**Input:** Complete manuscript. `about.json` for genre calibration.
**Output:** `source/reader-report.md` — engagement map, confusion log, prediction log, character impressions, high/low points.

### Phase 4: Structural Assessment

**Agent:** Lumen

Lumen reads the manuscript twice — once as a reader, once with the structural framework — then produces a developmental report across seven lenses: premise/promise, protagonist arc, supporting cast, pacing/momentum, scene necessity, thematic coherence, and opening/closing. Lumen loads Ghostlight's reader report and cross-references it against Lens 4 (Pacing) and Lens 5 (Scene Necessity).

**Input:** Complete manuscript. Reader report. Voice Profile, Scene Outline, Story Bible.
**Output:** `source/dev-report.md` — strengths, priorities, detailed lens assessments, scene necessity audit table, revision roadmap, questions for author.

### Phase 5: Revision Planning

**Agent:** Forge

Forge reads Lumen's dev report (and Ghostlight's reader report, if present) and converts every finding into an actionable, phased revision task list. Phase 0 blockers (author decisions) are surfaced first — Forge halts until those are resolved. After decisions are made, Forge batches tasks by chapter, sequences them for structural safety, assigns model tiers (Opus for prose, Sonnet for audits), and produces ready-to-paste session prompts for Verity. Forge does not write prose, modify manuscripts, or re-diagnose what Lumen has already diagnosed.

**Input:** `source/dev-report.md`. `source/reader-report.md` (if present). Scene Outline, Story Bible, Voice Profile (for context). Chapter directory listing (for batching).
**Output:** `source/project-tasks.md` — phased task list with numbered items and Phase 0 blockers identified. `source/revision-prompts.md` — ready-to-paste Verity session prompts, sequenced and batched.

### Phase 6: Revision

**Agent:** Verity

Verity works through Forge's session prompts one at a time, in order. The author copies prompts from `source/revision-prompts.md` into a Verity session. Structural revision is destabilizing — one change affects others — so items are addressed sequentially, not in parallel. Verity updates the Story Bible and Scene Outline as changes are made. The author approves each task before Verity proceeds to the next.

**Input:** Session prompts from `source/revision-prompts.md`. Existing manuscript and source documents.
**Output:** Revised manuscript. Updated Story Bible and Scene Outline.

### Phase 7: Second Read

**Agent:** Ghostlight

Ghostlight reads the revised manuscript again. Flag in the chat that this is a second read — it won't be truly cold, but the engagement tracking, confusion log, and emotional beats are still valuable for comparison against the first reader report.

**Input:** Revised manuscript. `about.json`.
**Output:** `source/reader-report.md` (v1 archived as `reader-report-v1.md`).

### Phase 8: Second Assessment

**Agent:** Lumen

Lumen runs the full assessment again on the revised manuscript, informed by the new reader report. This confirms the revisions landed, catches new problems introduced by revision, and produces a readiness assessment. If the second report comes back with major priorities, something went wrong in revision — diagnose before running Lumen a third time.

**Input:** Revised manuscript. New reader report. Source documents.
**Output:** `source/dev-report.md` (v1 archived as `dev-report-v1.md`).

### Phase 9: Copy Edit

**Agent:** Sable

Sable runs five discrete audit passes: style sheet construction/consistency, continuity/facts, grammar/mechanics, repetition/word-level issues, and formatting/production. Sable loads `about.json` for genre and convention context, and the dev report for awareness of which sections were recently revised (high-priority zones for fresh errors). Sable never modifies `draft.md` files — all findings go into the audit report.

**Input:** Revised manuscript. Voice Profile, Story Bible, Scene Outline, `about.json`, dev report.
**Output:** `source/style-sheet.md` and `source/audit-report.md`.

### Phase 10: Copy Edit Planning & Fixes

**Agents:** Forge, then Verity

Forge reads Sable's audit report and converts all findings into a mechanical fix task list. Critical findings become individual tasks; standard findings are batched by chapter; minor findings and crutch word passes are grouped into a final-pass checklist. Forge produces updated `source/project-tasks.md` and `source/revision-prompts.md`. The author then opens a Verity session and copies prompts in order, approving each fix before proceeding.

**Input (Forge):** `source/audit-report.md`. `source/dev-report.md` (if present). Voice Profile, Scene Outline, Story Bible (for context).
**Output (Forge):** Updated `source/project-tasks.md` and `source/revision-prompts.md`.
**Input (Verity):** Session prompts from `source/revision-prompts.md`.
**Output (Verity):** Clean manuscript with all copy-level issues resolved.

### Phase 11: Build

**Agent:** None (manual)

Run `node scripts/build.js <book-folder>` to assemble the manuscript from chapter files into final output formats (md, docx, epub, pdf) in `books/<book>/dist/`.

### Phase 12: Publish

**Agent:** Quill

Quill audits every build output in `dist/` (epub, docx, pdf) for formatting errors, broken characters, missing chapter breaks, and metadata mismatches. Blocking issues halt all other work until the author fixes and rebuilds. After a clean audit, Quill writes three book description variants, produces a pricing recommendation, and assembles the full metadata package (BISAC codes, Amazon categories, keywords, author bio). Supporting materials (synopsis, sell sheet, social media blurbs) are produced on request.

**Input:** Build outputs in `dist/`. `about.json` (status must be `final`). Voice Profile, Story Bible, Author Profile, Pitch Card.
**Output:** `dist/output-audit.md`, `source/book-description.md`, `source/pricing.md`, `source/metadata.md`.

---

## File Ownership

Each file in the project is owned by one agent. Other agents may read it but never modify it.

| File | Owner | Other Agents |
|---|---|---|
| `active-book.json` | Spark | All agents read |
| `about.json` | Spark | All agents read |
| `source/voice-profile.md` | Spark (seed) → Verity (owns) | Ghostlight reads post-read; Lumen, Sable, Forge, Quill read |
| `source/scene-outline.md` | Spark (template) → Verity (owns) | Lumen, Sable, Forge, Quill read |
| `source/story-bible.md` | Spark (seed) → Verity (owns) | Lumen, Sable, Forge, Quill read |
| `chapters/*/draft.md` | Verity | All others read-only |
| `chapters/*/notes.md` | Verity | Lumen, Sable read; Ghostlight never reads; Forge never reads |
| `source/reader-report.md` | Ghostlight | Lumen reads; Forge reads (for priority); others do not use |
| `source/dev-report.md` | Lumen | Forge reads (primary input); Verity reads (session prompts); Sable reads (awareness) |
| `source/style-sheet.md` | Sable | — |
| `source/audit-report.md` | Sable | Forge reads (primary input); Quill reads (flags unresolved items) |
| `source/project-tasks.md` | Forge | — |
| `source/revision-prompts.md` | Forge | Verity reads (copy-paste session prompts) |
| `source/book-description.md` | Quill | — |
| `source/pricing.md` | Quill | — |
| `source/metadata.md` | Quill | — |
| `dist/output-audit.md` | Quill | — |
| `books/_pitches/*.md` | Spark | Quill reads (description starting material) |

---

## Document Loading by Agent

What each agent loads at session start:

| Document | Spark | Verity | Ghostlight | Lumen | Sable | Forge | Quill |
|---|---|---|---|---|---|---|---|
| `active-book.json` | creates | reads | reads | reads | reads | reads | reads |
| `about.json` | creates | reads | reads | reads | reads | reads | reads |
| `voice-profile.md` | seeds | **owns** | post-read only | reads | reads | reads | reads |
| `scene-outline.md` | template | **owns** | never | reads | reads | reads | reads |
| `story-bible.md` | seeds | **owns** | never | reads | reads | reads | reads |
| `chapters/*/draft.md` | — | **owns** | reads | reads | reads | never | — |
| `chapters/*/notes.md` | — | **owns** | never | reads | reads | never | — |
| `reader-report.md` | — | — | **owns** | reads | — | reads | — |
| `dev-report.md` | — | reads | — | **owns** | reads | reads | — |
| `style-sheet.md` | — | — | — | — | **owns** | — | — |
| `audit-report.md` | — | — | — | reads | **owns** | reads | reads |
| `project-tasks.md` | — | — | — | — | — | **owns** | — |
| `revision-prompts.md` | — | reads | — | — | — | **owns** | — |
| `dist/*` | — | — | — | — | — | — | **audits** |
| `book-description.md` | — | — | — | — | — | — | **owns** |
| `pricing.md` | — | — | — | — | — | — | **owns** |
| `metadata.md` | — | — | — | — | — | — | **owns** |
| `author-profile.md` | — | — | — | — | — | — | reads |
| `_pitches/*.md` | **owns** | — | — | — | — | — | reads |

---

## Key Rules

**One agent per conversation.** You are the router. Select the agent in Zencoder's agent selector and open a new chat for each phase. Don't run two agents in one conversation.

**Sequential, not parallel.** The pipeline is strictly ordered. Each agent's output feeds the next agent's input. Skipping steps or running agents out of order degrades quality. The full order: Spark → Verity → Ghostlight → Lumen → Forge → Verity → Ghostlight → Lumen → Sable → Forge → Verity → Build → Quill.

**Always Ghostlight before Lumen.** Lumen's structural diagnosis is sharper with Ghostlight's experiential data. Reader disengagement is evidence for pacing and scene necessity findings.

**Always Forge between Lumen/Sable and Verity.** Forge converts diagnostic reports into structured, sequenced session prompts. Running Verity directly from a Lumen or Sable report skips the planning layer — tasks cascade incorrectly and Phase 0 blockers go unresolved.

**Sable always runs before build.** Copy editing before structural revisions are complete is wasted effort — but copy editing must be done before the build produces final outputs.

**Quill always runs after build.** Quill audits the build outputs, not the source files. If the build hasn't run, Quill has nothing to audit. If Quill finds blocking issues, the fix goes back to the source, the build reruns, and Quill re-audits.

**`about.json` status must be `final` before Quill operates.** If it's not, Quill halts and confirms.

**Archive, never overwrite.** Ghostlight, Lumen, Sable, and Quill all version their reports before writing new ones. This gives you a paper trail across revision cycles.

**`about.json` status tracks your position.** Update it as you move through phases: `scaffolded` → `outlining` → `first-draft` → `revision-1` → `revision-2` → `copy-edit` → `final`.

**The pointer is the project.** `active-book.json` determines which book every agent operates on. Swap the pointer, the entire context shifts. No agent hardcodes a book name.

---

## When to Run Each Agent More Than Once

| Agent | Typical Runs | When to Run Again |
|---|---|---|
| **Spark** | 1 | Mid-project creative reset ("I don't know what this book is about anymore"). |
| **Verity** | 3+ | Once for first draft, once per revision cycle. She's the workhorse. |
| **Ghostlight** | 2 | After first draft, after major revisions. Diminishing returns beyond 2. |
| **Lumen** | 2 | After first draft (with reader report), after revisions. A third run only if the second report flags major issues. |
| **Sable** | 1 | After all structural revisions are complete. A second run only if Sable's findings trigger significant prose changes. |
| **Forge** | 2 | Once after Lumen's structural assessment, once after Sable's copy edit. Re-run only if Phase 0 decisions significantly change the task scope. |
| **Quill** | 1 | After the build. A second run only if blocking issues required a rebuild. |

---

## Repository Structure

```
zencoder-based-novel-engine/
  custom-agents/
    SPARK.md                        ← Spark
    VERITY.md                       ← Verity
    GHOSTLIGHT.md                   ← Ghostlight
    LUMEN.md                        ← Lumen
    SABLE.md                        ← Sable
    FORGE.MD                        ← Forge
    QUILL.md                        ← Quill
  the-pipeline.md                   ← this file
  TRACKER.md                        ← pipeline tracking
  author-profile.md                 ← creative profile (for Spark and Quill)
  active-book.json                  ← current book pointer
  scripts/
    build.js                        ← node scripts/build.js <book-folder>
  books/
    _pitches/                       ← shelved pitch cards
    <book>/
      about.json
      source/
        voice-profile.md
        scene-outline.md
        story-bible.md
        reader-report.md
        dev-report.md
        style-sheet.md
        audit-report.md
        project-tasks.md            ← Forge's revision task list
        revision-prompts.md         ← Forge's ready-to-paste Verity prompts
        book-description.md
        pricing.md
        metadata.md
      assets/
        cover.jpg
      chapters/
        01-chapter-slug/
          draft.md
          notes.md
        ...
      dist/
        output-audit.md
```