import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// The frozen ContentModule contract. Prose and engineering proceed independently
// because malformed frontmatter fails the build here, before a page renders.
// The Hook (prediction) and Apply (quiz) beats are structured data; the Explain
// beat is the MDX body; the Visualize beat is chosen by `viz`.

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  feedback: z.string().optional(),
});

const modules = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/modules" }),
  schema: z.object({
    title: z.string().min(3),
    phase: z.union([z.literal(1), z.literal(2)]),
    order: z.number().int().positive(),
    // The one claim the module asserts, stated before any prose.
    thesis: z.string().min(10),
    estMinutes: z.number().int().positive().default(6),
    // An optional orientation beat shown BEFORE the Hook. Used on the first
    // module a newcomer meets, so the cold prediction lands on a mental model
    // instead of nothing. Plain paragraphs, fully legible JS-off.
    primer: z
      .object({
        title: z.string().min(3),
        body: z.array(z.string().min(10)).min(1),
      })
      .optional(),
    // The Visualize beat: which signature visualization this module hosts.
    viz: z.enum(["sv1", "sv2", "sv3", "sv4", "sv5"]).optional(),
    // The Hook beat: commit a prediction before the reveal.
    hook: z.object({
      prompt: z.string().min(10),
      options: z.array(optionSchema).min(2).max(4),
      correct: z.string().min(1),
      key: z.string().min(10), // the answer-key explanation (shown after commit)
    }),
    // The Apply beat: the ungated check (JS-off floor; QuizEngine enhances it).
    apply: z
      .object({
        question: z.string().min(10),
        options: z.array(optionSchema).min(2).max(4),
        correct: z.string().min(1),
        // How the QuizEngine frames its verdict; the mechanic is identical.
        mode: z
          .enum(["outcome", "assertion-reason", "confidence", "misconception"])
          .optional(),
      })
      .optional(),
  }),
});

export const collections = { modules };
