package com.cj.englishagenthub.question.domain;

import com.cj.englishagenthub.category.domain.Category;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionDifficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType = QuestionType.SHORT_ANSWER;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_choices", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "choice", length = 500)
    private List<String> choices = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String explanation;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_keywords", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "keyword", length = 100)
    private List<String> keywords = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String embeddingText;

    @Column(name = "embedding_text_hash", length = 64)
    private String embeddingTextHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "embedding_status", nullable = false, columnDefinition = "varchar(20)")
    private EmbeddingStatus embeddingStatus = EmbeddingStatus.PENDING;

    @Column(name = "embedding_model", length = 50)
    private String embeddingModel;

    @Column(name = "embedded_at")
    private Instant embeddedAt;

    @Column(name = "embedding_error", columnDefinition = "TEXT")
    private String embeddingError;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    public static Question create(
            QuestionType questionType,
            Category category,
            QuestionDifficulty difficulty,
            String question,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords,
            String embeddingText
    ) {
        Question q = new Question();
        q.apply(questionType, category, difficulty, question, choices, answer, explanation, keywords, embeddingText);
        return q;
    }

    public void update(
            QuestionType questionType,
            Category category,
            QuestionDifficulty difficulty,
            String question,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords,
            String embeddingText
    ) {
        apply(questionType, category, difficulty, question, choices, answer, explanation, keywords, embeddingText);
    }

    private void apply(
            QuestionType questionType,
            Category category,
            QuestionDifficulty difficulty,
            String question,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords,
            String embeddingText
    ) {
        List<String> normalizedChoices = normalizeList(choices);
        this.questionType = questionType != null
                ? questionType
                : (normalizedChoices.isEmpty() ? QuestionType.SHORT_ANSWER : QuestionType.MULTIPLE_CHOICE);
        if (this.questionType == QuestionType.SHORT_ANSWER) {
            normalizedChoices = new ArrayList<>();
        } else if (normalizedChoices.size() < 2 || !normalizedChoices.contains(safe(answer))) {
            throw new IllegalArgumentException("객관식 문제는 보기가 2개 이상이고 정답이 보기에 포함되어야 합니다.");
        }
        this.category = category;
        this.difficulty = difficulty;
        this.question = question;
        this.choices = normalizedChoices;
        this.answer = answer;
        this.explanation = explanation;
        this.keywords = normalizeList(keywords);
        this.embeddingText = StringUtils.hasText(embeddingText)
                ? embeddingText.trim()
                : composeEmbeddingText(categoryPath(category), difficulty, question, answer, explanation, this.keywords);
        String newHash = sha256(this.embeddingText);
        if (!newHash.equals(this.embeddingTextHash)) {
            this.embeddingTextHash = newHash;
            this.embeddingStatus = EmbeddingStatus.PENDING;
            this.embeddedAt = null;
            this.embeddingError = null;
        }
    }

    public void markEmbedded(String model) {
        this.embeddingStatus = EmbeddingStatus.COMPLETED;
        this.embeddingModel = model;
        this.embeddedAt = Instant.now();
        this.embeddingError = null;
    }

    public void markFailed(String error) {
        this.embeddingStatus = EmbeddingStatus.FAILED;
        this.embeddingError = error == null ? null : error.substring(0, Math.min(error.length(), 2000));
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String categoryPath(Category category) {
        return category == null ? "" : String.join(" > ", category.getPathNames());
    }

    public static String composeEmbeddingText(
            String categoryPath,
            QuestionDifficulty difficulty,
            String question,
            String answer,
            String explanation,
            List<String> keywords
    ) {
        return String.join("\n",
                "분류: " + safe(categoryPath),
                "난이도: " + difficultyLabel(difficulty),
                "문제: " + safe(question),
                "정답: " + safe(answer),
                "해설: " + safe(explanation),
                "키워드: " + String.join(", ", normalizeList(keywords))
        );
    }

    private static List<String> normalizeList(List<String> values) {
        if (values == null) return new ArrayList<>();
        return new ArrayList<>(values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList());
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String difficultyLabel(QuestionDifficulty difficulty) {
        if (difficulty == null) return "";
        return switch (difficulty) {
            case easy -> "하";
            case medium -> "중";
            case hard -> "상";
        };
    }
}
