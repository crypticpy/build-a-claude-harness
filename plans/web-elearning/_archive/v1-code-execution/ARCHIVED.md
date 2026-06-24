# Archived: v1 (in-browser code-execution approach)

**Status:** Superseded. Do not use as a reference for the current spec.

These three documents were the first pass at the Harness Lab web spec. They assumed learners would **hand-edit and run real hook code in the browser** (a node-shim Web Worker, a virtual filesystem, checkpoints asserting real artifacts).

The owner redirected the product before any build:

- The audience largely will **not** hand-write code; they will have their coding agent do the building. The goal is **mental models and architecture literacy**, not coding skill.
- The web course is therefore **concept-and-architecture only, with no code sandbox**, taught through visual explainers, architecture diagrams, animated data-flow walkthroughs, and comprehension quizzes.
- It is a **two-phase** experience: Phase 1 teaches the concepts and the ecosystem; Phase 2 is a visual teardown of *how the reference harness was built* (its layers, the per-repo intelligence/memory stack, and the safe long-running autonomy via a second-LLM approval gate), ending with a handoff: build it yourself or point your agent at the repo.
- The web modules are **freshly authored standalone content**, not generated from or mirroring the existing `course/` + `docs/` wiki (which stays as the deep technical reference and the agent-followable build guide).

The current spec lives one level up in `plans/web-elearning/`. This folder is kept only for provenance.
