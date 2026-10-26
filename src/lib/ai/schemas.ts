import { z } from "zod";

export const reviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  criteria: z.object({
    clarity: z.number().int().min(1).max(5),
    context: z.number().int().min(1).max(5),
    constraints: z.number().int().min(1).max(5),
    specificity: z.number().int().min(1).max(5),
    output_format: z.number().int().min(1).max(5),
  }),
  strengths: z.array(z.string().min(1)).min(1).max(3),
  improvements: z.array(z.object({
    issue: z.string().min(1), why: z.string().min(1), fix: z.string().min(1),
  })).min(1).max(3),
  improved_prompt: z.string().min(1),
});

export const taskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  expected_result: z.string().min(3).max(1000),
  difficulty: z.number().int().min(1).max(3),
  topic: z.string().min(2).max(60),
  hints: z.array(z.string().min(1)).min(2).max(3),
});

export type Review = z.infer<typeof reviewSchema>;
export type TaskInput = z.infer<typeof taskSchema>;

export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return schema.parse(JSON.parse(cleaned));
}
