"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { RequireAuth } from "@/widgets/guards/RequireAuth";
import {
  attemptApi,
  type AttemptResultResponse,
  type ExamTakeResponse,
} from "@/entities/exam/api/examApi";
import { toast, toastError } from "@/shared/lib/toast";

export default function ExamTakePage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <ExamTaker />
      </Suspense>
    </RequireAuth>
  );
}

function ExamTaker() {
  const router = useRouter();
  const examId = useSearchParams().get("id") ?? "";
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResultResponse | null>(null);

  const { data: take, isLoading, isError } = useQuery({
    queryKey: ["attempt-start", examId],
    queryFn: () => attemptApi.start(examId),
    enabled: !!examId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (t: ExamTakeResponse) =>
      attemptApi.submit(t.attemptId, {
        answers: t.items.map((it) => ({
          questionId: it.questionId,
          answer: answers[it.questionId] ?? "",
        })),
      }),
    onSuccess: (res) => {
      setResult(res);
      toast.success("제출 완료! 채점 결과를 확인하세요.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: async (e, t) => {
      try {
        const existingResult = await attemptApi.result(t.attemptId);
        setResult(existingResult);
        toast.info("이미 제출된 응시 결과를 불러왔습니다.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        toastError(e, "제출에 실패했습니다.");
      }
    },
  });

  if (!examId) return <CenterNote text="시험 ID가 없습니다." />;
  if (isLoading) return <CenterNote spinner text="응시를 준비하는 중" />;
  if (isError || !take) return <CenterNote text="응시할 수 없습니다. 발행된 시험인지 확인하세요." />;

  if (result) {
    return (
      <ResultView
        result={result}
        onBack={() => router.push("/practice")}
        onRetake={() => {
          setResult(null);
          setAnswers({});
        }}
      />
    );
  }

  const answeredCount = take.items.filter((it) => (answers[it.questionId] ?? "").trim() !== "").length;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/25 px-4 py-5">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        <div className="border-b border-border pb-4">
          <button
            type="button"
            onClick={() => router.push("/exams")}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            나가기
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{take.title}</h1>
          {take.description && <p className="mt-1 text-sm text-muted-foreground">{take.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            총 {take.items.length}문항 · 만점 {take.maxScore}점
            {take.timeLimitMinutes ? ` · 제한 ${take.timeLimitMinutes}분` : ""}
          </p>
        </div>

        <div className="space-y-4">
          {take.items.map((it, i) => (
            <div key={it.questionId} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm font-medium">{it.question}</p>
                  <span className="mt-1 inline-block text-xs text-muted-foreground">{it.maxPoints}점</span>

                  <div className="mt-3">
                    {it.questionType === "MULTIPLE_CHOICE" ? (
                      <div className="space-y-2">
                        {it.choices.map((choice) => {
                          const checked = answers[it.questionId] === choice;
                          return (
                            <label
                              key={choice}
                              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                              }`}
                            >
                              <input
                                type="radio"
                                name={it.questionId}
                                value={choice}
                                checked={checked}
                                onChange={() => setAnswers((a) => ({ ...a, [it.questionId]: choice }))}
                                className="accent-[var(--primary)]"
                              />
                              <span>{choice}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        value={answers[it.questionId] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [it.questionId]: e.target.value }))}
                        placeholder="답을 입력하세요"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-background p-3 shadow-lg">
          <span className="text-sm text-muted-foreground">
            {answeredCount}/{take.items.length} 문항 답변
          </span>
          <button
            type="button"
            onClick={() => submitMutation.mutate(take)}
            disabled={submitMutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            제출하고 채점
          </button>
        </div>
      </div>
    </main>
  );
}

function ResultView({
  result,
  onBack,
  onRetake,
}: {
  result: AttemptResultResponse;
  onBack: () => void;
  onRetake: () => void;
}) {
  const pct = result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0;
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/25 px-4 py-5">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        <div className="rounded-lg border border-border bg-background p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">{result.examTitle} · 채점 결과</p>
          <p className="mt-2 text-4xl font-extrabold tabular-nums">
            {result.totalScore}
            <span className="text-xl font-bold text-muted-foreground"> / {result.maxScore}점</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">정답률 {pct}%</p>
          {result.requiresReview && (
            <p className="mx-auto mt-3 inline-block rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              주관식 문항은 단순 채점되어 재검토가 필요할 수 있습니다.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {result.items.map((it, i) => {
            const isCorrect = it.correct === true;
            return (
              <div
                key={it.questionId}
                className={`rounded-lg border bg-background p-4 ${
                  isCorrect ? "border-emerald-200" : "border-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="whitespace-pre-wrap text-sm font-medium">{it.question}</p>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-sm font-bold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                        {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {it.earnedPoints}/{it.maxPoints}
                      </span>
                    </div>

                    <dl className="mt-3 space-y-1.5 text-sm">
                      <Row label="내 답안" value={it.submittedAnswer || "(미응답)"} tone={isCorrect ? "ok" : "bad"} />
                      {!isCorrect && <Row label="정답" value={it.correctAnswer} tone="ok" />}
                    </dl>

                    {it.explanation && (
                      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">해설 </span>
                        {it.explanation}
                      </div>
                    )}
                    {it.requiresReview && (
                      <p className="mt-2 text-xs text-amber-700">※ 주관식 단순 채점 — 정오 판정이 부정확할 수 있습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            문제 풀기 목록으로
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            다시 보기
          </button>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "ok" | "bad" }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 break-words ${tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{value}</dd>
    </div>
  );
}

function CenterNote({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-muted/25">
      <div className="flex items-center text-sm text-muted-foreground">
        {spinner && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {text}
      </div>
    </main>
  );
}
