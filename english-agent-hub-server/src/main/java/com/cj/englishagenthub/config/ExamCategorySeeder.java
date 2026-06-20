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

/**
 * 시험지 운영 분류 트리. 문제 은행 분류(QuestionSeeder)와 동일하게
 * MVP 범위(고등 영어·수학)로 맞추고, 비-고등 분류는 정리한다.
 */
@Component
@Order(4)
@RequiredArgsConstructor
public class ExamCategorySeeder implements ApplicationRunner {

    private final ExamCategoryRepository examCategoryRepository;
    private final ExamRepository examRepository;

    private static final List<String> ENGLISH_AREAS = List.of("어휘", "어법", "독해", "듣기");
    private static final List<String> MATH_UNITS = List.of("대수", "미적분Ⅰ", "확률과 통계", "기하");

    private static final Set<String> ALLOWED_CATEGORY_PATHS = Set.of(
            "영어",
            "영어 > 어휘",
            "영어 > 어법",
            "영어 > 독해",
            "영어 > 듣기",
            "수학",
            "수학 > 대수",
            "수학 > 미적분Ⅰ",
            "수학 > 확률과 통계",
            "수학 > 기하"
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String area : ENGLISH_AREAS) {
            ensurePath(List.of("영어", area));
        }
        for (String unit : MATH_UNITS) {
            ensurePath(List.of("수학", unit));
        }
        cleanupUnexpectedCategories();
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

    /** 허용 경로 밖의 시험지 분류를 자식·참조가 없을 때 정리한다. */
    private void cleanupUnexpectedCategories() {
        boolean changed;
        do {
            changed = false;
            for (ExamCategory category : examCategoryRepository.findAll()) {
                if (ALLOWED_CATEGORY_PATHS.contains(categoryPath(category))) {
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
