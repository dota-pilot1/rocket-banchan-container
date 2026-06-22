"use client";

import { ChangeEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, FunctionSquare, Loader2, Trash2, Upload, X } from "lucide-react";
import {
  structuredMathSheetApi,
  type StructuredMathSheet,
} from "@/entities/structured-math-sheet/api/structuredMathSheetApi";
import { MathText } from "@/shared/ui/MathText";
import { toast, toastError } from "@/shared/lib/toast";

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export function StructuredMathExtractorPanel() {
  const qc = useQueryClient();
  const [problem, setProblem] = useState<File | null>(null);
  const [answer, setAnswer] = useState<File | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: sheets = [] } = useQuery({
    queryKey: ["structured-math-sheets"],
    queryFn: structuredMathSheetApi.list,
  });

  const { data: openSheet, isLoading: openLoading } = useQuery({
    queryKey: ["structured-math-sheets", openId],
    queryFn: () => structuredMathSheetApi.get(openId as string),
    enabled: openId != null,
  });

  const createMutation = useMutation({
    // 정형 추출은 문항별 Vision 전사라 60~70초 걸려, 게이트웨이(CloudFront 30s)가 504를 줄 수 있다.
    // 백엔드는 504 후에도 끝까지 저장하므로, 요청은 쏘되 결과는 '목록 폴링'으로 받는다.
    mutationFn: async (): Promise<StructuredMathSheet> => {
      const before = new Set((await structuredMathSheetApi.list()).map((s) => s.id));
      structuredMathSheetApi.create(problem as File, answer).catch(() => undefined); // 504여도 무시
      const deadline = Date.now() + 6 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        const sheets = await structuredMathSheetApi.list().catch(() => [] as StructuredMathSheet[]);
        const fresh = sheets.find((s) => !before.has(s.id));
        if (fresh) return fresh;
      }
      throw new Error("추출이 시간 내에 끝나지 않았습니다.");
    },
    onSuccess: (sheet) => {
      toast.success(`"${sheet.title}" 정형 추출 완료 — ${sheet.itemCount}문항`);
      qc.invalidateQueries({ queryKey: ["structured-math-sheets"] });
      setOpenId(sheet.id);
    },
    onError: (e) => toastError(e, "정형 추출에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => structuredMathSheetApi.delete(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["structured-math-sheets"] });
      if (openId === id) setOpenId(null);
    },
    onError: (e) => toastError(e, "삭제에 실패했습니다."),
  });

  const pickProblem = (e: ChangeEvent<HTMLInputElement>) => setProblem(e.target.files?.[0] ?? null);
  const pickAnswer = (e: ChangeEvent<HTMLInputElement>) => setAnswer(e.target.files?.[0] ?? null);
  const problemIsPdf = problem?.type === "application/pdf";

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <FunctionSquare className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">수학 시험지 업로드 (정형)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                발문·보기를 LaTeX 텍스트로 전사하고, 도형만 이미지로 분리합니다.
              </p>
            </div>
          </div>

          <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-accent">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <span className="mt-2 text-sm font-semibold">문제 PDF 선택 (필수)</span>
            <span className="mt-1 text-xs text-muted-foreground">문항별로 Vision 전사 → 검색·편집 가능한 텍스트</span>
            <input type="file" accept="application/pdf" onChange={pickProblem} className="sr-only" />
          </label>

          <label className="mt-3 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4 text-center transition-colors hover:border-primary hover:bg-accent">
            <span className="text-sm font-semibold">정답 PDF 선택 (선택)</span>
            <span className="mt-1 text-xs text-muted-foreground">정답표를 읽어 문항별 정답·배점 자동 매핑</span>
            <input type="file" accept="application/pdf" onChange={pickAnswer} className="sr-only" />
          </label>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            정형 추출은 문항마다 AI 전사를 돌려 <b>이미지 추출기보다 느립니다</b>. 수식은 가끔 오류가 있을 수 있어 검수가 필요해요.
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-bold">선택 파일</h2>
          <div className="mt-4 space-y-2">
            <FileRow label="문제 PDF" file={problem} onClear={() => setProblem(null)} />
            <FileRow label="정답 PDF" file={answer} onClear={() => setAnswer(null)} optional />
          </div>
          <button
            type="button"
            disabled={!problemIsPdf || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FunctionSquare className="h-4 w-4" />}
            정형 추출 (LaTeX)
          </button>
          {problem && !problemIsPdf && <p className="mt-2 text-xs text-destructive">문제 파일은 PDF만 지원합니다.</p>}
        </aside>
      </div>

      {createMutation.isPending && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          문항별로 수식을 LaTeX로 전사하는 중입니다… (느릴 수 있어요)
        </div>
      )}

      {sheets.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-bold">
            정형 시험지 <span className="text-sm font-medium text-muted-foreground">{sheets.length}개</span>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                onOpen={() => setOpenId(sheet.id)}
                onDelete={() => deleteMutation.mutate(sheet.id)}
                deleting={deleteMutation.isPending && deleteMutation.variables === sheet.id}
              />
            ))}
          </div>
        </div>
      )}

      {openId && <DetailModal sheet={openSheet ?? null} loading={openLoading} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function FileRow({
  label,
  file,
  onClear,
  optional,
}: {
  label: string;
  file: File | null;
  onClear: () => void;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/25 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-muted-foreground">
          {label}
          {optional && <span className="ml-1 font-normal">(선택)</span>}
        </div>
        {file ? (
          <div className="truncate text-sm font-medium" title={file.name}>
            {file.name} <span className="text-xs text-muted-foreground">· {formatBytes(file.size)}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">선택 안 됨</div>
        )}
      </div>
      {file && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          aria-label={`${label} 지우기`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SheetCard({
  sheet,
  onOpen,
  onDelete,
  deleting,
}: {
  sheet: StructuredMathSheet;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-lg border border-border bg-background p-4 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
          <FunctionSquare className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100 disabled:opacity-50"
          aria-label="삭제"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <h3 className="mt-3 truncate text-sm font-bold" title={sheet.title}>
        {sheet.title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{sheet.itemCount}문항 · 정형(LaTeX)</p>
      <p className="mt-3 text-xs text-muted-foreground">{new Date(sheet.createdAt).toLocaleString()}</p>
    </div>
  );
}

function DetailModal({
  sheet,
  loading,
  onClose,
}: {
  sheet: StructuredMathSheet | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/35 px-4 py-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-muted/35 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{sheet?.title ?? "불러오는 중"}</h2>
            {sheet && (
              <p className="mt-0.5 text-xs text-muted-foreground">{sheet.itemCount}문항 · 발문·보기=LaTeX, 도형=이미지</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5">
          {loading || !sheet ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중
            </div>
          ) : (
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sheet.items.map((item, i) => (
                <li key={i} className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.questionNumber != null && (
                      <span className="rounded bg-foreground px-2 py-0.5 font-bold text-background">{item.questionNumber}번</span>
                    )}
                    {item.subject && <span className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground">{item.subject}</span>}
                    {item.type && <span className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground">{item.type}</span>}
                    {item.points != null && <span className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground">{item.points}점</span>}
                    {item.answer && (
                      <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">정답 {item.answer}</span>
                    )}
                    {item.needsReview && (
                      <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">검수 필요</span>
                    )}
                  </div>

                  {/* 발문 (LaTeX) */}
                  <div className="mt-3 text-sm leading-7">
                    <MathText text={item.prompt} />
                  </div>

                  {/* 도형 이미지 (있으면) */}
                  {item.figureImageUrl && (
                    <img
                      src={item.figureImageUrl}
                      alt={`${item.questionNumber ?? i + 1}번 도형`}
                      className="mt-3 max-h-72 rounded border border-border bg-white"
                      loading="lazy"
                    />
                  )}

                  {/* 보기 (LaTeX) */}
                  {item.choices.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {item.choices.map((c, ci) => {
                        const mark = CHOICE_MARKS[ci] ?? `${ci + 1}.`;
                        const isAnswer = item.answer != null && item.answer.trim() === mark;
                        return (
                          <li
                            key={ci}
                            className={
                              isAnswer
                                ? "flex gap-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-medium text-emerald-800"
                                : "flex gap-2 px-2 py-1"
                            }
                          >
                            <span className="shrink-0">{mark}</span>
                            <MathText text={c} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
