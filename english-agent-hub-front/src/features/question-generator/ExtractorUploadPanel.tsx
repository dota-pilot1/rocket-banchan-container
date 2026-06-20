"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { extractedSheetApi, type ExtractedSheet } from "@/entities/extracted-sheet/api/extractedSheetApi";
import { toast, toastError } from "@/shared/lib/toast";

type SelectedFile = {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export function ExtractorUploadPanel() {
  const qc = useQueryClient();
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const fileKind = useMemo(() => {
    if (!file) return null;
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("image/")) return "image";
    return "unknown";
  }, [file]);

  useEffect(() => {
    return () => {
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    };
  }, [file?.previewUrl]);

  const { data: sheets = [] } = useQuery({
    queryKey: ["extracted-sheets"],
    queryFn: extractedSheetApi.list,
  });

  const { data: openSheet, isLoading: openLoading } = useQuery({
    queryKey: ["extracted-sheets", openId],
    queryFn: () => extractedSheetApi.get(openId as string),
    enabled: openId != null,
  });

  const createMutation = useMutation({
    mutationFn: (f: File) => extractedSheetApi.create(f),
    onSuccess: (sheet) => {
      toast.success(`"${sheet.title}" 추출 완료 — 독해 ${sheet.itemCount}문항`);
      qc.invalidateQueries({ queryKey: ["extracted-sheets"] });
      setOpenId(sheet.id);
    },
    onError: (e) => toastError(e, "독해 문항 추출에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => extractedSheetApi.delete(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["extracted-sheets"] });
      if (openId === id) setOpenId(null);
    },
    onError: (e) => toastError(e, "삭제에 실패했습니다."),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }
    setFile({
      file: nextFile,
      name: nextFile.name,
      size: nextFile.size,
      type: nextFile.type || "unknown",
      previewUrl: nextFile.type.startsWith("image/") ? URL.createObjectURL(nextFile) : null,
    });
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">파일 업로드 테스트</h2>
              <p className="mt-1 text-sm text-muted-foreground">PDF를 선택하면 듣기를 제외하고 독해 문항만 추출해 시험지 카드로 저장합니다.</p>
            </div>
          </div>

          <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-accent">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-3 text-sm font-semibold">PDF 또는 이미지 선택</span>
            <span className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG, JPEG, WEBP 등</span>
            <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="sr-only" />
          </label>

          <div className="mt-4 rounded-md border border-border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
            디지털 PDF는 텍스트 레이어를 그대로 읽어 독해 문항만 구조화합니다. (스캔본은 OCR이 별도로 필요)
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-bold">선택 파일</h2>
          {!file ? (
            <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              아직 선택된 파일이 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/25 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                  {fileKind === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{file.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{file.type} · {formatBytes(file.size)}</div>
                </div>
              </div>

              {file.previewUrl && (
                <div
                  role="img"
                  aria-label="선택한 문제 이미지 미리보기"
                  className="h-72 w-full rounded-md border border-border bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${file.previewUrl})` }}
                />
              )}

              <button
                type="button"
                disabled={fileKind !== "pdf" || createMutation.isPending}
                onClick={() => createMutation.mutate(file.file)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                독해 문항 추출
              </button>
              {fileKind !== "pdf" && (
                <p className="text-xs text-muted-foreground">현재는 PDF 추출만 지원합니다. (이미지 OCR은 준비 중)</p>
              )}
            </div>
          )}
        </aside>
      </div>

      {createMutation.isPending && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          PDF 텍스트를 읽고 독해 문항을 구조화하는 중입니다…
        </div>
      )}

      {sheets.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-bold">추출 시험지 <span className="text-sm font-medium text-muted-foreground">{sheets.length}개</span></h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => (
              <ExtractedSheetCard
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

      {openId && (
        <SheetDetailModal
          sheet={openSheet ?? null}
          loading={openLoading}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}

function ExtractedSheetCard({
  sheet,
  onOpen,
  onDelete,
  deleting,
}: {
  sheet: ExtractedSheet;
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
          <FileText className="h-4 w-4" />
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
          title="삭제"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <h3 className="mt-3 truncate text-sm font-bold" title={sheet.title}>{sheet.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">독해 {sheet.itemCount}문항</p>
      <p className="mt-3 text-xs text-muted-foreground">{new Date(sheet.createdAt).toLocaleString()}</p>
    </div>
  );
}

function SheetDetailModal({
  sheet,
  loading,
  onClose,
}: {
  sheet: ExtractedSheet | null;
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
            {sheet && <p className="mt-0.5 text-xs text-muted-foreground">독해 {sheet.itemCount}문항 · 정답·해설은 검수 단계에서 입력</p>}
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

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading || !sheet ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중
            </div>
          ) : (
            <ol className="space-y-3">
              {sheet.items.map((item, i) => (
                <li key={i} className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">
                    {item.questionNumber != null && <span className="mr-1.5 text-muted-foreground">{item.questionNumber}.</span>}
                    {item.prompt}
                  </p>
                  {item.passage && (
                    <p className="mt-2 whitespace-pre-line rounded border border-border bg-background p-3 text-xs leading-6 text-muted-foreground">
                      {item.passage}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1 text-sm">
                    {item.choices.map((choice, ci) => (
                      <li key={ci} className="text-foreground">{choice}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
