"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Loader2,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { RequireAuth } from "@/widgets/guards/RequireAuth";
import {
  attemptApi,
  examApi,
  type AttemptSummaryResponse,
  type ExamResponse,
} from "@/entities/exam/api/examApi";

export default function PracticePage() {
  return (
    <RequireAuth>
      <PracticeWorkspace />
    </RequireAuth>
  );
}

function PracticeWorkspace() {
  const router = useRouter();

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["practice-exams"],
    queryFn: examApi.listPublished,
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: attemptApi.myAttempts,
  });

  const stats = useMemo(() => {
    const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED");
    const avg =
      submitted.length === 0
        ? null
        : Math.round(
            submitted.reduce((sum, attempt) => {
              if (attempt.maxScore <= 0) return sum;
              return sum + (attempt.totalScore / attempt.maxScore) * 100;
            }, 0) / submitted.length
          );

    return {
      available: exams.length,
      submitted: submitted.length,
      averageRate: avg,
    };
  }, [attempts, exams.length]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/25 px-4 py-5">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-5">
          <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
                <PlayCircle className="h-4 w-4 text-primary" />
                Practice
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">문제 풀기</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                발행된 문제 세트를 선택해 풀이를 시작하고 자동 채점 결과를 확인합니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 self-start md:min-w-[360px]">
              <StatBox label="응시 가능" value={`${stats.available}`} icon={FileText} />
              <StatBox label="완료" value={`${stats.submitted}`} icon={CheckCircle2} />
              <StatBox label="평균" value={stats.averageRate === null ? "-" : `${stats.averageRate}%`} icon={Trophy} />
            </div>
          </div>

          {examsLoading ? (
            <CenterState icon={Loader2} spin title="불러오는 중" body="응시 가능한 문제 세트를 확인하고 있습니다." />
          ) : exams.length === 0 ? (
            <CenterState
              icon={FileText}
              title="아직 풀 수 있는 문제가 없습니다."
              body="관리자가 시험지를 발행하면 이곳에서 바로 풀이를 시작할 수 있습니다."
            />
          ) : (
            <div className="grid gap-3">
              {exams.map((exam) => (
                <PracticeExamCard
                  key={exam.id}
                  exam={exam}
                  latestAttempt={attempts.find((attempt) => attempt.examId === exam.id)}
                  onStart={() => router.push(`/exams/take?id=${exam.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold">최근 학습 기록</h2>
            </div>

            {attemptsLoading ? (
              <div className="mt-5 flex h-24 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                불러오는 중
              </div>
            ) : attempts.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                아직 풀이 기록이 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {attempts.slice(0, 6).map((attempt) => (
                  <AttemptRow key={attempt.attemptId} attempt={attempt} />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function PracticeExamCard({
  exam,
  latestAttempt,
  onStart,
}: {
  exam: ExamResponse;
  latestAttempt?: AttemptSummaryResponse;
  onStart: () => void;
}) {
  const isSubmitted = latestAttempt?.status === "SUBMITTED";
  const percent =
    isSubmitted && latestAttempt.maxScore > 0
      ? Math.round((latestAttempt.totalScore / latestAttempt.maxScore) * 100)
      : null;

  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">{exam.title}</h2>
            {isSubmitted ? (
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                완료 {percent}%
              </span>
            ) : latestAttempt ? (
              <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                진행 중
              </span>
            ) : null}
          </div>
          {exam.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <InfoPill icon={FileText} text={`문항 ${exam.itemCount}개`} />
            <InfoPill icon={Trophy} text={`${exam.totalPoints}점`} />
            <InfoPill icon={Clock3} text={exam.timeLimitMinutes ? `${exam.timeLimitMinutes}분` : "시간 무제한"} />
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <PlayCircle className="h-4 w-4" />
          {latestAttempt && !isSubmitted ? "이어 풀기" : "풀이 시작"}
        </button>
      </div>
    </article>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptSummaryResponse }) {
  const isSubmitted = attempt.status === "SUBMITTED";
  const percent = attempt.maxScore > 0 ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0;

  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{attempt.examTitle}</p>
        <span className={`shrink-0 text-xs font-bold ${isSubmitted ? "text-emerald-600" : "text-amber-600"}`}>
          {isSubmitted ? `${percent}%` : "진행 중"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDate(isSubmitted ? attempt.submittedAt : attempt.startedAt)}
      </p>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function InfoPill({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/35 px-2 py-1">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function CenterState({
  icon: Icon,
  spin,
  title,
  body,
}: {
  icon: typeof FileText;
  spin?: boolean;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 text-center">
      <Icon className={`h-9 w-9 text-muted-foreground ${spin ? "animate-spin" : ""}`} />
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
