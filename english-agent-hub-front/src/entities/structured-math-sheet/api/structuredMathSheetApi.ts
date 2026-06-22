import { api } from "@/shared/api/axios";

export type StructuredMathItem = {
  questionNumber: number | null;
  /** 발문 (한글 + $LaTeX$) */
  prompt: string;
  /** 보기 ①~⑤ (각 항목에 LaTeX 가능). 단답형이면 빈 배열 */
  choices: string[];
  /** 도형 이미지 URL (없으면 null) */
  figureImageUrl: string | null;
  answer: string | null;
  points: number | null;
  type: string | null;
  subject: string | null;
  needsReview: boolean;
};

export type StructuredMathSheet = {
  id: string;
  title: string;
  sourceFileName: string | null;
  itemCount: number;
  createdByName: string;
  createdAt: string;
  items: StructuredMathItem[];
};

export const structuredMathSheetApi = {
  list: () =>
    api.get<StructuredMathSheet[]>("/api/structured-math-sheets").then((r) => r.data),
  get: (id: string) =>
    api.get<StructuredMathSheet>(`/api/structured-math-sheets/${id}`).then((r) => r.data),
  create: (problem: File, answer?: File | null) => {
    const form = new FormData();
    form.append("file", problem);
    if (answer) form.append("answerFile", answer);
    // 문항별 Vision 전사(LaTeX)라 오래 걸린다.
    return api
      .post<StructuredMathSheet>("/api/structured-math-sheets", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600_000,
      })
      .then((r) => r.data);
  },
  delete: (id: string) =>
    api.delete<void>(`/api/structured-math-sheets/${id}`).then(() => undefined),
};
