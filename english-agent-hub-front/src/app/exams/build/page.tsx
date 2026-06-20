"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { RequireRole } from "@/widgets/guards/RequireRole";
import { SearchInput } from "@/shared/ui/SearchInput";
import { examApi } from "@/entities/exam/api/examApi";
import {
  questionApi,
  type QuestionDifficulty,
  type QuestionType,
} from "@/entities/question/api/questionApi";
import {
  buildCategoryTree,
  categoryApi,
  type CategoryNode,
} from "@/entities/category/api/categoryApi";
import { toast, toastError } from "@/shared/lib/toast";

type SelItem = {
  questionId: string;
  question: string;
  passage: string | null;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  categoryPath: string[];
  choices: string[];
  answer: string;
  points: number;
};

const DIFF_LABEL: Record<QuestionDifficulty, string> = { easy: "하", medium: "중", hard: "상" };
const TYPE_LABEL: Record<QuestionType, string> = { MULTIPLE_CHOICE: "객관식", SHORT_ANSWER: "주관식" };

export default function ExamBuildPage() {
  return (
    <RequireRole roles={["ROLE_ADMIN"]}>
      <Suspense fallback={null}>
        <ExamBuilder />
      </Suspense>
    </RequireRole>
  );
}

function ExamBuilder() {
  const router = useRouter();
  const qc = useQueryClient();
  const examId = useSearchParams().get("id") ?? "";

  const [selected, setSelected] = useState<SelItem[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "">("");
  const [keyword, setKeyword] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examApi.get(examId),
    enabled: !!examId,
  });

  const { data: categoryRecords = [] } = useQuery({
    queryKey: ["question-categories"],
    queryFn: () => categoryApi.list(),
  });
  const categoryTree = useMemo(() => buildCategoryTree(categoryRecords), [categoryRecords]);

  // 카테고리 id → 그 노드가 속한 최상위(과목) id
  const rootIdByCategoryId = useMemo(() => {
    const map = new Map<number, number>();
    const walk = (node: CategoryNode, rootId: number) => {
      map.set(node.id, rootId);
      node.children.forEach((child) => walk(child, rootId));
    };
    categoryTree.forEach((root) => walk(root, root.id));
    return map;
  }, [categoryTree]);

  const examSubjectId = exam?.subjectId ?? null;
  const scopedCategoryTree = useMemo(
    () => (examSubjectId === null ? categoryTree : categoryTree.filter((root) => root.id === examSubjectId)),
    [categoryTree, examSubjectId],
  );
  const activeSubjectId =
    examSubjectId !== null ? examSubjectId : categoryId === null ? null : rootIdByCategoryId.get(categoryId) ?? null;
  const visibleSubjects =
    activeSubjectId === null ? scopedCategoryTree : scopedCategoryTree.filter((root) => root.id === activeSubjectId);
  const questionCategoryId = categoryId ?? examSubjectId ?? undefined;

  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ["questions", "bank", questionCategoryId, difficulty, keyword],
    queryFn: () =>
      questionApi.list({
        categoryId: questionCategoryId,
        difficulty: difficulty || undefined,
        keyword: keyword || undefined,
      }),
  });

  const toggleCategory = (id: number) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const readOnly = exam ? exam.status !== "DRAFT" : false;

  // 시험지 로딩 시 한 번만 선택 목록 초기화
  useEffect(() => {
    if (exam && loadedId !== exam.id) {
      setSelected(
        exam.items.map((it) => ({
          questionId: it.questionId,
          question: it.question,
          passage: it.passage,
          questionType: it.questionType,
          difficulty: it.difficulty,
          categoryPath: it.categoryPath,
          choices: it.choices,
          answer: it.answer,
          points: it.points,
        })),
      );
      setLoadedId(exam.id);
    }
  }, [exam, loadedId]);

  useEffect(() => {
    if (examSubjectId === null || categoryId === null) return;
    if (rootIdByCategoryId.get(categoryId) !== examSubjectId) {
      setCategoryId(null);
    }
  }, [categoryId, examSubjectId, rootIdByCategoryId]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.questionId)), [selected]);
  const totalPoints = selected.reduce((sum, s) => sum + (s.points || 0), 0);

  const saveMutation = useMutation({
    mutationFn: () =>
      examApi.update(examId, {
        title: exam!.title,
        description: exam!.description ?? undefined,
        timeLimitMinutes: exam!.timeLimitMinutes,
        subjectId: exam!.subjectId,
        examCategoryId: exam!.examCategoryId,
        items: selected.map((s) => ({ questionId: s.questionId, points: s.points || 1 })),
      }),
    onSuccess: () => {
      toast.success("문항을 저장했습니다.");
      qc.invalidateQueries({ queryKey: ["exam", examId] });
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => toastError(e, "저장에 실패했습니다."),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await examApi.update(examId, {
        title: exam!.title,
        description: exam!.description ?? undefined,
        timeLimitMinutes: exam!.timeLimitMinutes,
        subjectId: exam!.subjectId,
        examCategoryId: exam!.examCategoryId,
        items: selected.map((s) => ({ questionId: s.questionId, points: s.points || 1 })),
      });
      return examApi.publish(examId);
    },
    onSuccess: () => {
      toast.success("저장 후 발행했습니다.");
      qc.invalidateQueries({ queryKey: ["exams"] });
      router.push("/exams");
    },
    onError: (e) => toastError(e, "발행에 실패했습니다."),
  });

  const addQuestion = (q: { id: string; question: string; passage?: string | null; questionType: QuestionType; difficulty: QuestionDifficulty; categoryPath: string[]; choices: string[]; answer: string }) => {
    if (selectedIds.has(q.id)) return;
    setSelected((cur) => [
      ...cur,
      {
        questionId: q.id,
        question: q.question,
        passage: q.passage ?? null,
        questionType: q.questionType,
        difficulty: q.difficulty,
        categoryPath: q.categoryPath,
        choices: q.choices,
        answer: q.answer,
        points: 10,
      },
    ]);
  };

  // 체크된 문제들을 한 번에 추가
  const addCheckedQuestions = () => {
    setSelected((cur) => {
      const has = new Set(cur.map((s) => s.questionId));
      const additions = questions
        .filter((q) => checkedIds.has(q.id) && !has.has(q.id))
        .map<SelItem>((q) => ({
          questionId: q.id,
          question: q.question,
          passage: q.passage ?? null,
          questionType: q.questionType,
          difficulty: q.difficulty,
          categoryPath: q.categoryPath,
          choices: q.choices,
          answer: q.answer,
          points: 10,
        }));
      return [...cur, ...additions];
    });
    setCheckedIds(new Set());
  };

  const toggleChecked = (id: string) =>
    setCheckedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 현재 목록에서 아직 추가되지 않은(선택 가능한) 문제들
  const addableQuestions = useMemo(
    () => questions.filter((q) => !selectedIds.has(q.id)),
    [questions, selectedIds],
  );
  const allChecked = addableQuestions.length > 0 && addableQuestions.every((q) => checkedIds.has(q.id));
  const checkedCount = addableQuestions.filter((q) => checkedIds.has(q.id)).length;
  const toggleCheckAll = () =>
    setCheckedIds((cur) => {
      if (allChecked) {
        const next = new Set(cur);
        addableQuestions.forEach((q) => next.delete(q.id));
        return next;
      }
      const next = new Set(cur);
      addableQuestions.forEach((q) => next.add(q.id));
      return next;
    });

  const removeItem = (id: string) => setSelected((cur) => cur.filter((s) => s.questionId !== id));
  const setPoints = (id: string, points: number) =>
    setSelected((cur) => cur.map((s) => (s.questionId === id ? { ...s, points } : s)));
  const move = (index: number, dir: -1 | 1) =>
    setSelected((cur) => {
      const next = [...cur];
      const target = index + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  if (!examId) {
    return <CenterNote text="시험지 ID가 없습니다." />;
  }
  if (examLoading) {
    return <CenterNote spinner text="시험지를 불러오는 중" />;
  }
  if (!exam) {
    return <CenterNote text="시험지를 찾을 수 없습니다." />;
  }

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-muted/25 px-3 pb-2.5 pt-4 sm:px-4">
      <div className="flex w-full flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-0.5">
          <button
            type="button"
            onClick={() => router.push("/exams")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
            aria-label="시험지 목록"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="ml-2 flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate text-lg font-bold leading-none tracking-tight">{exam.title}</h1>
              <span className="shrink-0 text-xs leading-none text-muted-foreground">
                {selected.length}문항 · {totalPoints}점
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaPill label="출제 범위" value={exam.subjectName ?? "전체 문제은행"} />
              <MetaPill label="시험지 분류" value={exam.examCategoryName ?? "미분류"} />
            </div>
          </div>
          {!readOnly && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={selected.length === 0 || publishMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                저장 후 발행
              </button>
            </div>
          )}
        </div>

        {readOnly && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            발행되었거나 마감된 시험지는 편집할 수 없습니다. (현재 상태: {exam.status})
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-auto pb-0.5">
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "320px minmax(520px, 1fr) 420px",
              minWidth: 1280,
              height: "100%",
            }}
          >
          {/* 단원 트리 */}
          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-background p-4">
            {/* 과목 필터 칩 */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {scopedCategoryTree.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setCategoryId(subject.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    activeSubjectId === subject.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {subject.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  activeSubjectId === null
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                전체
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 text-sm">
              {categoryTree.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">분류가 없습니다.</p>
              ) : (
                visibleSubjects.map((node) => (
                  <CategoryTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={categoryId}
                    collapsed={collapsed}
                    onToggle={toggleCategory}
                    onSelect={setCategoryId}
                  />
                ))
              )}
            </div>
          </section>

          {/* 문제 은행 */}
          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-background p-4">
            <div className="flex gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | "")}
                className="h-8 w-[110px] shrink-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">전체 난이도</option>
                <option value="easy">하</option>
                <option value="medium">중</option>
                <option value="hard">상</option>
              </select>
              <SearchInput
                value={keyword}
                onChange={setKeyword}
                placeholder="문제/해설 검색"
                className="flex-1"
              />
            </div>

            {!readOnly && addableQuestions.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleCheckAll}
                    className="h-4 w-4 rounded border-input"
                  />
                  전체 선택
                </label>
                <button
                  type="button"
                  disabled={checkedCount === 0}
                  onClick={addCheckedQuestions}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  선택 {checkedCount}개 추가
                </button>
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {qLoading ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중
                </div>
              ) : questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">문제가 없습니다.</p>
              ) : (
                questions.map((q) => {
                  const added = selectedIds.has(q.id);
                  const checked = checkedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      className={`rounded-md border p-3 ${checked && !added ? "border-primary/50 bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={readOnly || added}
                          onChange={() => toggleChecked(q.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input disabled:opacity-40"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <span>{q.categoryPath.join(" > ")}</span>
                            <Badge>{DIFF_LABEL[q.difficulty]}</Badge>
                            <Badge>{TYPE_LABEL[q.questionType]}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm">{q.question}</p>
                          {q.passage && (
                            <p className="mt-1 line-clamp-2 whitespace-pre-line rounded-md bg-muted/40 px-2 py-1.5 text-xs leading-5 text-muted-foreground">
                              {q.passage}
                            </p>
                          )}
                          {q.questionType === "MULTIPLE_CHOICE" && q.choices.length > 0 && (
                            <ChoiceList choices={q.choices} answer={q.answer} />
                          )}
                          <AnswerLine answer={q.answer} choices={q.choices} />
                        </div>
                        <button
                          type="button"
                          disabled={readOnly || added}
                          onClick={() => addQuestion(q)}
                          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${
                            added
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          }`}
                        >
                          {added ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {added ? "추가됨" : "추가"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 선택된 문항 */}
          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">시험지 문항 ({selected.length})</h2>
              <span className="text-sm font-semibold text-muted-foreground">총점 {totalPoints}점</span>
            </div>

            <div className="mt-3 max-h-[64vh] space-y-2 overflow-y-auto pr-1">
              {selected.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  왼쪽 문제 은행에서 문제를 추가하세요.
                </p>
              ) : (
                selected.map((s, i) => (
                  <div key={s.questionId} className="rounded-md border border-border p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <Badge>{DIFF_LABEL[s.difficulty]}</Badge>
                          <Badge>{TYPE_LABEL[s.questionType]}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm">{s.question}</p>
                        {s.passage && (
                          <p className="mt-1 line-clamp-3 whitespace-pre-line rounded-md bg-muted/40 px-2 py-1.5 text-xs leading-5 text-muted-foreground">
                            {s.passage}
                          </p>
                        )}
                        {s.questionType === "MULTIPLE_CHOICE" && s.choices.length > 0 && (
                          <ChoiceList choices={s.choices} answer={s.answer} />
                        )}
                        <AnswerLine answer={s.answer} choices={s.choices} />
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">배점</label>
                          <input
                            type="number"
                            min={1}
                            value={s.points}
                            disabled={readOnly}
                            onChange={(e) => setPoints(s.questionId, Number(e.target.value))}
                            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                          />
                          <span className="text-xs text-muted-foreground">점</span>
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent disabled:opacity-30" aria-label="위로">
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent disabled:opacity-30" aria-label="아래로">
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => removeItem(s.questionId)} className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-destructive hover:text-white" aria-label="제거">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function CategoryTreeNode({
  node,
  depth,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: CategoryNode;
  depth: number;
  selectedId: number | null;
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (id: number) => void;
}) {
  const isLeaf = node.children.length === 0;
  const isOpen = !collapsed.has(node.id);
  const isSelected = selectedId === node.id;
  return (
    <div>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent ${
            isLeaf ? "invisible" : ""
          }`}
          aria-label={isOpen ? "접기" : "펼치기"}
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent ${
            isSelected ? "bg-primary/10 font-semibold text-primary" : ""
          }`}
        >
          <span className="truncate">{node.name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{node.subtreeCount}</span>
        </button>
      </div>
      {!isLeaf && isOpen && (
        <div>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
      {children}
    </span>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border bg-background px-2 py-1 text-xs">
      <span className="shrink-0 font-semibold text-foreground">{label}</span>
      <span className="mx-1 text-muted-foreground">·</span>
      <span className="min-w-0 truncate text-muted-foreground">{value}</span>
    </span>
  );
}

function ChoiceList({ choices, answer }: { choices: string[]; answer: string }) {
  return (
    <ol className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
      {choices.map((choice, index) => (
        <li
          key={`${index}-${choice}`}
          className={`min-w-0 rounded-md border px-2 py-1 ${
            choice === answer
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-border bg-background"
          }`}
        >
          <span className="mr-1 font-semibold text-foreground">{index + 1}.</span>
          <span className="break-words">{choice}</span>
        </li>
      ))}
    </ol>
  );
}

function AnswerLine({ answer, choices }: { answer: string; choices: string[] }) {
  const answerIndex = choices.findIndex((choice) => choice === answer);
  const label = answerIndex >= 0 ? `${answerIndex + 1}번` : answer;
  return (
    <p className="mt-2 inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
      <span>정답 {label}</span>
    </p>
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
