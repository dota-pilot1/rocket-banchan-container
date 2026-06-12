import { api } from "@/shared/api/axios";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";

export type EmbeddingStatus = "PENDING" | "COMPLETED" | "FAILED";

export type QuestionResponse = {
  id: string;
  questionType: QuestionType;
  categoryId: number;
  categoryPath: string[];
  difficulty: QuestionDifficulty;
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  keywords: string[];
  embeddingText: string;
  embeddingStatus: EmbeddingStatus;
  embeddingModel: string | null;
  embeddedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmbeddingBatchResult = {
  picked: number;
  completed: number;
  failed: number;
  stillPending: number;
};

export type EmbeddingStatusResponse = {
  pending: number;
  completed: number;
  failed: number;
};

export type SimilarQuestion = {
  question: QuestionResponse;
  similarity: number;
};

export type QuestionUpsertRequest = {
  questionType: QuestionType;
  categoryId: number | null;
  difficulty: QuestionDifficulty;
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
  keywords?: string[];
  embeddingText?: string;
};

export type QuestionListParams = {
  categoryId?: number;
  difficulty?: QuestionDifficulty | "";
  keyword?: string;
};

export const questionApi = {
  list: (params: QuestionListParams = {}) =>
    api
      .get<QuestionResponse[]>("/api/questions", {
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
        ),
      })
      .then((r) => r.data),
  create: (body: QuestionUpsertRequest) =>
    api.post<QuestionResponse>("/api/questions", body).then((r) => r.data),
  update: (id: string, body: QuestionUpsertRequest) =>
    api.put<QuestionResponse>(`/api/questions/${id}`, body).then((r) => r.data),
  delete: (id: string) => api.delete<void>(`/api/questions/${id}`).then(() => undefined),
  embedPending: (limit = 50) =>
    api
      .post<EmbeddingBatchResult>(`/api/questions/embed-pending`, undefined, { params: { limit } })
      .then((r) => r.data),
  embedOne: (id: string) =>
    api.post<QuestionResponse>(`/api/questions/${id}/embed`).then((r) => r.data),
  embeddingStatus: () =>
    api.get<EmbeddingStatusResponse>(`/api/questions/embedding-status`).then((r) => r.data),
  findSimilar: (id: string, limit = 10) =>
    api
      .get<SimilarQuestion[]>(`/api/questions/${id}/similar`, { params: { limit } })
      .then((r) => r.data),
};
