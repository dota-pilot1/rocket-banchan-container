package com.cj.englishagenthub.question.presentation.dto;

import com.cj.englishagenthub.question.domain.QuestionDifficulty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GenerateSimilarReadingQuestionRequest(
        @NotBlank String templateId,
        @NotBlank String templateTitle,
        @NotBlank String subtype,
        List<String> rules,
        @Min(1) @Max(5) int count,
        @NotBlank String difficulty,
        @Min(2) @Max(5) int choiceCount,
        boolean includeExplanation,
        boolean keepTopic,
        boolean avoidDuplicate,
        Long categoryId,
        String categoryPath,
        QuestionDifficulty sourceDifficulty,
        String sourceQuestion,
        String sourcePassage,
        List<String> sourceChoices,
        String sourceAnswer,
        String sourceExplanation,
        List<String> sourceKeywords
) {
    public QuestionDifficulty resolvedDifficulty(QuestionDifficulty sourceDifficulty) {
        if ("source".equalsIgnoreCase(difficulty)) return sourceDifficulty == null ? QuestionDifficulty.medium : sourceDifficulty;
        return QuestionDifficulty.valueOf(difficulty);
    }
}
