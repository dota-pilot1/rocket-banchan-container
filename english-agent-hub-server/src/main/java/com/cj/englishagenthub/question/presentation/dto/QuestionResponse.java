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
        return new QuestionResponse(
                q.getId(),
                q.getQuestionType(),
                q.getCategory().getId(),
                q.getCategory().getPathNames(),
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
}
