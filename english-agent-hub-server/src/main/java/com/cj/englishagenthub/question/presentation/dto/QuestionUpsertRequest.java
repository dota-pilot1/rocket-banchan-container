package com.cj.englishagenthub.question.presentation.dto;

import com.cj.englishagenthub.question.domain.QuestionDifficulty;
import com.cj.englishagenthub.question.domain.QuestionType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.util.StringUtils;

import java.util.List;

public record QuestionUpsertRequest(
        @NotNull QuestionType questionType,
        @NotNull Long categoryId,
        @NotNull QuestionDifficulty difficulty,
        @NotBlank String question,
        List<String> choices,
        @NotBlank String answer,
        @NotBlank String explanation,
        List<String> keywords,
        String embeddingText
) {

    @JsonIgnore
    private List<String> trimmedChoices() {
        if (choices == null) return List.of();
        return choices.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .toList();
    }

    @JsonIgnore
    @AssertTrue(message = "객관식 문제는 보기를 2개 이상 입력해야 합니다.")
    public boolean isChoicesSufficientForMultipleChoice() {
        if (questionType != QuestionType.MULTIPLE_CHOICE) return true;
        return trimmedChoices().size() >= 2;
    }

    @JsonIgnore
    @AssertTrue(message = "객관식 정답은 보기 중 하나와 일치해야 합니다.")
    public boolean isAnswerContainedInChoices() {
        if (questionType != QuestionType.MULTIPLE_CHOICE) return true;
        if (!StringUtils.hasText(answer)) return true; // @NotBlank가 별도로 처리
        return trimmedChoices().contains(answer.trim());
    }

    @JsonIgnore
    @AssertTrue(message = "주관식 문제는 보기를 입력할 수 없습니다.")
    public boolean isChoicesEmptyForShortAnswer() {
        if (questionType != QuestionType.SHORT_ANSWER) return true;
        return trimmedChoices().isEmpty();
    }
}
