package com.cj.englishagenthub.config;

import com.cj.englishagenthub.exam_category.domain.ExamCategory;
import com.cj.englishagenthub.exam_category.infrastructure.ExamCategoryRepository;
import com.cj.englishagenthub.exam.infrastructure.ExamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
@Order(4)
@RequiredArgsConstructor
public class ExamCategorySeeder implements ApplicationRunner {

    private final ExamCategoryRepository examCategoryRepository;
    private final ExamRepository examRepository;

    private static final Set<String> ALLOWED_ENGLISH_CATEGORY_PATHS = Set.of(
            "영어",
            "영어 > 초등 영어",
            "영어 > 초등 영어 > 단어",
            "영어 > 초등 영어 > 문법",
            "영어 > 초등 영어 > 독해",
            "영어 > 초등 영어 > 듣기",
            "영어 > 중학 영어",
            "영어 > 중학 영어 > 단어",
            "영어 > 중학 영어 > 문법",
            "영어 > 중학 영어 > 독해",
            "영어 > 중학 영어 > 듣기",
            "영어 > 고등 영어",
            "영어 > 고등 영어 > 단어",
            "영어 > 고등 영어 > 문법",
            "영어 > 고등 영어 > 독해",
            "영어 > 고등 영어 > 듣기"
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensurePath(List.of("수학"));
        for (String level : List.of("초등 영어", "중학 영어", "고등 영어")) {
            for (String area : List.of("단어", "문법", "독해", "듣기")) {
                ensurePath(List.of("영어", level, area));
            }
        }
        ensurePath(List.of("한국사"));
        cleanupUnexpectedEnglishCategories();
    }

    private ExamCategory ensurePath(List<String> path) {
        ExamCategory current = null;
        for (String name : path) {
            Long parentId = current == null ? null : current.getId();
            ExamCategory found = (parentId == null
                    ? examCategoryRepository.findFirstByParentIsNullAndName(name)
                    : examCategoryRepository.findFirstByParent_IdAndName(parentId, name))
                    .orElse(null);
            if (found == null) {
                long siblings = parentId == null
                        ? examCategoryRepository.countByParentIsNull()
                        : examCategoryRepository.countByParent_Id(parentId);
                found = examCategoryRepository.save(ExamCategory.create(current, name, (int) siblings));
            }
            current = found;
        }
        return current;
    }

    private void cleanupUnexpectedEnglishCategories() {
        boolean changed;
        do {
            changed = false;
            List<ExamCategory> categories = examCategoryRepository.findAll();
            for (ExamCategory category : categories) {
                String path = categoryPath(category);
                if (!path.startsWith("영어 > ") || ALLOWED_ENGLISH_CATEGORY_PATHS.contains(path)) {
                    continue;
                }
                if (examCategoryRepository.existsByParent_Id(category.getId()) || examRepository.existsByExamCategory_Id(category.getId())) {
                    continue;
                }
                examCategoryRepository.delete(category);
                examCategoryRepository.flush();
                changed = true;
                break;
            }
        } while (changed);
    }

    private String categoryPath(ExamCategory category) {
        List<String> names = new ArrayList<>();
        ExamCategory cursor = category;
        while (cursor != null) {
            names.add(0, cursor.getName());
            cursor = cursor.getParent();
        }
        return String.join(" > ", names);
    }
}
