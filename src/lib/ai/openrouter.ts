import "server-only";
import OpenAI from "openai";
import { parseModelJson, reviewSchema, taskSchema, type Review, type TaskInput } from "./schemas";
import { REVIEW_SYSTEM, TASK_SYSTEM } from "./prompts";

const mockReview: Review = {
  score: 76,
  criteria: { clarity: 4, context: 3, constraints: 4, specificity: 3, output_format: 4 },
  strengths: ["Понятно описано основное действие.", "Есть конкретное требование к результату."],
  improvements: [{ issue: "Не описано поведение на мобильном экране.", why: "ИИ может сделать интерфейс неудобным на телефоне.", fix: "Добавь требования к адаптивной версии и проверь узкий экран." }],
  improved_prompt: "Создай адаптивный интерфейс по описанию задания. Укажи точное поведение элемента, состояния, визуальные требования и критерии проверки результата. Сохрани существующий стиль проекта.",
};

const mockTask: TaskInput = {
  title: "Кнопка с откликом при наведении",
  description: "Создай заметную кнопку действия, которая плавно меняет цвет и слегка приподнимается при наведении курсора.",
  expected_result: "Кнопка доступна с клавиатуры, имеет видимый фокус и плавную реакцию на наведение.",
  difficulty: 1,
  topic: "Кнопки",
  hints: ["Определи исходный и наведённый вид.", "Подумай о фокусе клавиатуры и плавности перехода."],
};

function client() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("ИИ пока не подключён");
  return new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 30_000,
    maxRetries: 0,
  });
}

async function completeJson<T>(system: string, user: string, model: string, temperature: number, schema: import("zod").ZodType<T>) {
  const ai = client();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await ai.chat.completions.create({
      model,
      temperature,
      max_tokens: 1200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user + (attempt ? "\nВерни исправленный JSON строго по схеме, без markdown." : "") },
      ],
    });
    try {
      return parseModelJson(result.choices[0]?.message.content ?? "", schema);
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new Error("Не удалось получить корректный ответ ИИ");
}

export async function reviewPrompt(taskTitle: string, taskDescription: string, promptText: string) {
  if (process.env.MOCK_AI === "true") return { result: mockReview, model: "mock" };
  const model = process.env.OPENROUTER_MODEL_REVIEW;
  if (!model) throw new Error("ИИ пока не подключён");
  const studentData = promptText.replace(/<\/?student_prompt>/gi, "[маркер удалён]");
  const result = await completeJson(REVIEW_SYSTEM, `Задание: ${taskTitle}\n${taskDescription}\n\n<student_prompt>\n${studentData}\n</student_prompt>`, model, 0.3, reviewSchema);
  return { result, model };
}

export async function generateTask(topic: string | undefined, difficulty: number | undefined, previousTitles: string[]) {
  if (process.env.MOCK_AI === "true") return mockTask;
  const model = process.env.OPENROUTER_MODEL_TASKS;
  if (!model) throw new Error("ИИ пока не подключён");
  return completeJson(TASK_SYSTEM, `Тема: ${topic ?? "любая"}. Сложность: ${difficulty ?? "любая"}. Уже выданы (не повторять): ${previousTitles.join(" | ")}`, model, 0.9, taskSchema);
}

export { mockReview, mockTask };
