package com.cj.englishagenthub.question.presentation.dto;

import com.cj.englishagenthub.question.domain.EmbeddingStatus;
import com.cj.englishagenthub.question.domain.Question;
import com.cj.englishagenthub.question.domain.QuestionDifficulty;
import com.cj.englishagenthub.question.domain.QuestionType;

import java.time.Instant;
import java.util.List;

public record QuestionResponse(
        String id,
        QuestionType questionType,
        Long categoryId,
        List<String> categoryPath,
        String area,
        boolean listening,
        QuestionDifficulty difficulty,
        String question,
        String passage,
        List<String> choices,
        String answer,
        String explanation,
        List<String> keywords,
        String embeddingText,
        EmbeddingStatus embeddingStatus,
        String embeddingModel,
        Instant embeddedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static QuestionResponse from(Question q) {
        List<String> categoryPath = q.getCategory().getPathNames();
        String area = resolveArea(categoryPath);
        return new QuestionResponse(
                q.getId(),
                q.getQuestionType(),
                q.getCategory().getId(),
                categoryPath,
                area,
                "듣기".equals(area),
                q.getDifficulty(),
                q.getQuestion(),
                q.getPassage(),
                q.getChoices(),
                q.getAnswer(),
                q.getExplanation(),
                q.getKeywords(),
                q.getEmbeddingText(),
                q.getEmbeddingStatus(),
                q.getEmbeddingModel(),
                q.getEmbeddedAt(),
                q.getCreatedAt(),
                q.getUpdatedAt()
        );
    }

    private static String resolveArea(List<String> categoryPath) {
        return categoryPath.stream()
                .filter(name -> name.equals("어휘") || name.equals("어법") || name.equals("독해") || name.equals("듣기"))
                .findFirst()
                .orElse(null);
    }
}
