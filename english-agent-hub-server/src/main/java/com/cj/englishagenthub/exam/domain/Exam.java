package com.cj.englishagenthub.exam.domain;

import com.cj.englishagenthub.question.domain.Question;
import com.cj.englishagenthub.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 시험지(출제 단위). 문제 은행에서 고른 문항(ExamItem)들을 담는다.
 * DRAFT 상태에서 자유롭게 편집하고, PUBLISHED 되면 응시 가능, CLOSED 되면 마감.
 */
@Entity
@Table(name = "exams")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    /** 제한 시간(분). null이면 무제한. */
    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamStatus status = ExamStatus.DRAFT;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderNo ASC")
    private List<ExamItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    public static Exam create(User createdBy, String title, String description, Integer timeLimitMinutes) {
        Exam exam = new Exam();
        exam.createdBy = createdBy;
        exam.title = title;
        exam.description = description;
        exam.timeLimitMinutes = normalizeTimeLimit(timeLimitMinutes);
        exam.status = ExamStatus.DRAFT;
        return exam;
    }

    public void updateMeta(String title, String description, Integer timeLimitMinutes) {
        requireEditable();
        this.title = title;
        this.description = description;
        this.timeLimitMinutes = normalizeTimeLimit(timeLimitMinutes);
    }

    /**
     * 문항 전체 교체. (question, points) 순서대로 ExamItem 재구성.
     * DRAFT 상태에서만 허용.
     */
    public void replaceItems(List<ItemSpec> specs) {
        requireEditable();
        this.items.clear();
        int order = 1;
        for (ItemSpec spec : specs) {
            this.items.add(ExamItem.of(this, spec.question(), order++, spec.points()));
        }
    }

    public void publish() {
        if (status == ExamStatus.PUBLISHED) return;
        if (status == ExamStatus.CLOSED) {
            throw new IllegalStateException("마감된 시험은 다시 발행할 수 없습니다.");
        }
        if (items.isEmpty()) {
            throw new IllegalStateException("문항이 없는 시험은 발행할 수 없습니다.");
        }
        this.status = ExamStatus.PUBLISHED;
    }

    public void close() {
        this.status = ExamStatus.CLOSED;
    }

    public int totalPoints() {
        return items.stream().mapToInt(ExamItem::getPoints).sum();
    }

    public boolean isPublished() {
        return status == ExamStatus.PUBLISHED;
    }

    private void requireEditable() {
        if (status != ExamStatus.DRAFT) {
            throw new IllegalStateException("발행되었거나 마감된 시험은 편집할 수 없습니다.");
        }
    }

    private static Integer normalizeTimeLimit(Integer minutes) {
        if (minutes == null) return null;
        return minutes <= 0 ? null : minutes;
    }

    /** 문항 구성 입력값. 서비스에서 Question 로딩 후 전달. */
    public record ItemSpec(Question question, int points) {}
}
