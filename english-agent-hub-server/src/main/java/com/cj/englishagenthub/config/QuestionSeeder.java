package com.cj.englishagenthub.config;

import com.cj.englishagenthub.category.domain.Category;
import com.cj.englishagenthub.category.infrastructure.CategoryRepository;
import com.cj.englishagenthub.question.domain.Question;
import com.cj.englishagenthub.question.domain.QuestionDifficulty;
import com.cj.englishagenthub.question.domain.QuestionType;
import com.cj.englishagenthub.question.infrastructure.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@Order(5)
@RequiredArgsConstructor
public class QuestionSeeder implements ApplicationRunner {

    private final QuestionRepository questionRepository;
    private final CategoryRepository categoryRepository;
    private final JdbcTemplate jdbcTemplate;

    private record QuestionDef(
            List<String> categoryPath,
            QuestionDifficulty difficulty,
            String question,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords,
            List<String> previousQuestions
    ) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureVectorColumn();

        List<QuestionDef> seeds = List.of(
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.easy,
                        "23 + 48 = ?", choices("71", "61", "70", "81"), "71", "23과 48을 더하면 71입니다.",
                        List.of("초등 산수", "덧셈", "받아올림")),
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.easy,
                        "16 + 9 = ?", choices("25", "24", "26", "35"), "25", "일의 자리 6+9=15에서 1을 받아올림하면 25입니다.",
                        List.of("초등 산수", "덧셈", "받아올림")),
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.easy,
                        "37 + 25 = ?", choices("62", "52", "61", "72"), "62", "7+5=12에서 1을 받아올림하고 3+2+1=6이므로 62입니다.",
                        List.of("초등 산수", "덧셈", "받아올림")),
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.easy,
                        "128 + 64 = ?", choices("192", "182", "196", "202"), "192", "128과 64를 더하면 192입니다. 100+64=164에 28을 더해도 됩니다.",
                        List.of("초등 산수", "덧셈", "세자리 수")),
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.medium,
                        "256 + 387 = ?", choices("643", "633", "653", "743"), "643", "일의 자리부터 더하면 6+7=13, 5+8+1=14, 2+3+1=6 이므로 643입니다.",
                        List.of("초등 산수", "덧셈", "세자리 수")),
                q(List.of("수학", "산수", "덧셈"), QuestionDifficulty.medium,
                        "1024 + 512 = ?", choices("1536", "1436", "1546", "1512"), "1536", "1024와 512를 더하면 1536입니다.",
                        List.of("초등 산수", "덧셈", "네자리 수")),
                q(List.of("수학", "산수", "뺄셈"), QuestionDifficulty.easy,
                        "95 - 37 = ?", choices("58", "48", "57", "68"), "58", "95에서 37을 빼면 58입니다.",
                        List.of("초등 산수", "뺄셈", "받아내림")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.easy,
                        "12 x 7 = ?", choices("84", "74", "82", "94"), "84", "12를 7번 더하면 84입니다.",
                        List.of("초등 산수", "곱셈", "구구단")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.easy,
                        "9 x 8 = ?", choices("72", "63", "81", "70"), "72", "9단 곱셈이므로 9를 8번 더하면 72입니다.",
                        List.of("초등 산수", "곱셈", "구구단", "9단")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.easy,
                        "7 x 6 = ?", choices("42", "36", "48", "41"), "42", "7단 곱셈이므로 7을 6번 더하면 42입니다.",
                        List.of("초등 산수", "곱셈", "구구단", "7단")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.easy,
                        "15 x 4 = ?", choices("60", "45", "55", "75"), "60", "15를 4번 더하면 60입니다. 10×4=40, 5×4=20을 더해도 됩니다.",
                        List.of("초등 산수", "곱셈", "두자리 수")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.easy,
                        "24 x 3 = ?", choices("72", "62", "68", "82"), "72", "24를 3번 더하면 72입니다. 20×3=60, 4×3=12를 더해도 됩니다.",
                        List.of("초등 산수", "곱셈", "두자리 수")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.medium,
                        "11 x 11 = ?", choices("121", "111", "120", "131"), "121", "11을 11번 더하면 121입니다. 11²=121로 외워두면 편합니다.",
                        List.of("초등 산수", "곱셈", "제곱")),
                q(List.of("수학", "산수", "곱셈"), QuestionDifficulty.medium,
                        "25 x 8 = ?", choices("200", "180", "190", "250"), "200", "25를 8번 더하면 200입니다. 25×4=100이므로 25×8=200으로 계산할 수 있습니다.",
                        List.of("초등 산수", "곱셈", "큰 수")),
                q(List.of("수학", "산수", "나눗셈"), QuestionDifficulty.easy,
                        "72 ÷ 8 = ?", choices("9", "8", "7", "6"), "9", "8 x 9 = 72이므로 몫은 9입니다.",
                        List.of("초등 산수", "나눗셈", "몫")),
                q(List.of("수학", "산수", "분수"), QuestionDifficulty.medium,
                        "1/2 + 1/3 = ?", choices("5/6", "2/5", "1/5", "3/6"), "5/6", "공통분모 6으로 바꾸면 3/6 + 2/6 = 5/6입니다.",
                        List.of("초등 산수", "분수", "통분")),
                q(List.of("수학", "산수", "소수"), QuestionDifficulty.medium,
                        "3.5 + 2.75 = ?", choices("6.25", "5.25", "6.15", "6.75"), "6.25", "소수점을 맞춰 더하면 6.25입니다.",
                        List.of("초등 산수", "소수", "소수 덧셈")),

                qPrev(List.of("수학", "이차방정식", "인수분해"), QuestionDifficulty.medium,
                        "x² - 5x + 6 = 0의 두 해를 모두 고르시오.",
                        List.of("x² - 5x + 6 = 0의 해를 구하시오."),
                        choices("x = 2, 3", "x = -2, -3", "x = 1, 6", "x = -1, -6"), "x = 2, 3",
                        "인수분해하면 (x-2)(x-3)=0이므로 해는 2와 3입니다.",
                        List.of("이차방정식", "인수분해", "근")),
                qPrev(List.of("수학", "이차방정식", "인수분해"), QuestionDifficulty.medium,
                        "x² + 2x - 8 = 0의 두 해를 모두 고르시오.",
                        List.of("x² + 2x - 8 = 0의 해를 구하시오."),
                        choices("x = 2, -4", "x = -2, 4", "x = 1, -8", "x = -1, 8"), "x = 2, -4",
                        "인수분해하면 (x-2)(x+4)=0이므로 해는 2와 -4입니다.",
                        List.of("이차방정식", "인수분해", "근")),
                qPrev(List.of("수학", "이차방정식", "근의 공식"), QuestionDifficulty.medium,
                        "2x² - 3x - 2 = 0의 두 해를 근의 공식으로 고르시오.",
                        List.of("2x² - 3x - 2 = 0의 해를 근의 공식으로 구하시오."),
                        choices("x = 2, -1/2", "x = -2, 1/2", "x = 1, -2", "x = 2, 1/2"), "x = 2, -1/2",
                        "근의 공식에 a=2, b=-3, c=-2를 대입하면 x=(3±5)/4입니다.",
                        List.of("이차방정식", "근의 공식", "계수")),
                qPrev(List.of("수학", "이차방정식", "완전제곱식"), QuestionDifficulty.medium,
                        "x² + 6x + 9 = 0의 중근을 고르시오.",
                        List.of("x² + 6x + 9 = 0의 해를 구하시오."),
                        choices("x = -3", "x = 3", "x = -6", "x = 0"), "x = -3",
                        "(x+3)²=0이므로 중근 x=-3입니다.",
                        List.of("이차방정식", "완전제곱식", "중근")),
                qPrev(List.of("수학", "이차방정식", "판별식"), QuestionDifficulty.hard,
                        "x² - 4x + k = 0이 중근을 가질 때 k의 값을 고르시오.",
                        List.of("x² - 4x + k = 0이 중근을 가질 때 k의 값을 구하시오."),
                        choices("k = 4", "k = -4", "k = 2", "k = 16"), "k = 4",
                        "중근 조건은 판별식 b²-4ac=0입니다. 16-4k=0이므로 k=4입니다.",
                        List.of("이차방정식", "판별식", "중근")),
                qPrev(List.of("수학", "이차방정식", "근과 계수 관계"), QuestionDifficulty.hard,
                        "방정식 x² - 7x + 10 = 0의 두 근의 합과 곱을 고르시오.",
                        List.of("방정식 x² - 7x + 10 = 0의 두 근의 합과 곱을 구하시오."),
                        choices("합 7, 곱 10", "합 -7, 곱 10", "합 7, 곱 -10", "합 10, 곱 7"), "합 7, 곱 10",
                        "x²+bx+c=0에서 두 근의 합은 -b, 곱은 c입니다.",
                        List.of("이차방정식", "근과 계수 관계", "근의 합", "근의 곱")),

                q(List.of("한국사", "조선시대", "훈민정음"), QuestionDifficulty.easy,
                        "세종대왕이 창제한 문자는?", List.of("한글", "한자", "가나", "라틴 문자"), "한글",
                        "세종대왕은 훈민정음을 창제했고 오늘날 한글로 불립니다.",
                        List.of("한국사", "조선시대", "세종대왕", "한글", "훈민정음")),
                q(List.of("한국사", "삼국시대", "삼국통일"), QuestionDifficulty.medium,
                        "신라가 삼국 통일 과정에서 연합한 나라는?", List.of("당", "수", "명", "청"), "당",
                        "신라는 당과 연합하여 백제와 고구려를 멸망시킨 뒤 삼국 통일을 추진했습니다.",
                        List.of("한국사", "삼국시대", "신라", "당", "삼국통일")),
                q(List.of("한국사", "고려시대", "대외항쟁"), QuestionDifficulty.medium,
                        "고려 시대 몽골 침입에 맞서 강화도로 천도한 왕은?", choices("고종", "태조", "광종", "공민왕"), "고종",
                        "고려 고종 때 몽골 침입에 대응해 수도를 강화도로 옮겼습니다.",
                        List.of("한국사", "고려시대", "몽골 침입", "강화도", "고종")),
                q(List.of("한국사", "조선시대", "임진왜란"), QuestionDifficulty.medium,
                        "임진왜란 때 한산도 대첩을 이끈 장군은?", List.of("이순신", "권율", "김유신", "강감찬"), "이순신",
                        "이순신은 한산도 대첩에서 학익진 전술로 일본 수군을 격파했습니다.",
                        List.of("한국사", "조선시대", "임진왜란", "이순신", "한산도 대첩")),
                q(List.of("한국사", "근현대사", "독립운동"), QuestionDifficulty.medium,
                        "1919년 전국적으로 일어난 독립운동은?", List.of("3·1 운동", "6월 민주 항쟁", "갑신정변", "동학 농민 운동"), "3·1 운동",
                        "3·1 운동은 1919년 일제 강점기에 전국적으로 전개된 독립운동입니다.",
                        List.of("한국사", "근현대사", "독립운동", "3·1 운동")),

                q(List.of("영어", "중등 영어", "단어뜻"), QuestionDifficulty.easy,
                        "다음 단어의 뜻은? \"increase\"", List.of("증가하다", "감소하다", "멈추다", "빌리다"), "증가하다",
                        "increase는 수나 양이 늘어나다, 증가하다는 뜻입니다.",
                        List.of("영어", "중등 영어", "단어", "뜻", "increase")),
                q(List.of("영어", "중등 영어", "문장해석"), QuestionDifficulty.easy,
                        "He is interested in science. 해석하시오.", choices("그는 과학에 관심이 있다.", "그는 과학을 가르친다.", "그는 과학을 싫어한다.", "그는 과학자가 아니다."), "그는 과학에 관심이 있다.",
                        "be interested in은 '~에 관심이 있다'라는 뜻입니다.",
                        List.of("영어", "중등 영어", "문장 해석", "be interested in", "science")),
                q(List.of("영어", "중등 영어", "문법기초"), QuestionDifficulty.medium,
                        "She usually ____ breakfast at 7 a.m.", List.of("has", "have", "having", "had"), "has",
                        "주어 She는 3인칭 단수이고 현재 습관이므로 has가 맞습니다.",
                        List.of("영어", "중등 영어", "현재시제", "3인칭 단수")),
                q(List.of("영어", "고등 영어", "어휘추론"), QuestionDifficulty.medium,
                        "다음 단어와 뜻이 가장 비슷한 것은? \"begin\"", List.of("start", "finish", "close", "forget"), "start",
                        "begin과 start는 둘 다 시작하다는 뜻입니다.",
                        List.of("영어", "고등 영어", "어휘추론", "begin", "start")),
                q(List.of("영어", "중등 영어", "내용일치"), QuestionDifficulty.medium,
                        "Tom walks to school every day. How does Tom go to school?", List.of("By bus", "On foot", "By bike", "By train"), "On foot",
                        "walks to school은 걸어서 학교에 간다는 뜻입니다.",
                        List.of("영어", "중등 영어", "내용일치", "walk", "school"))
        );

        int created = 0;
        int updated = 0;
        for (QuestionDef seed : seeds) {
            Category category = ensurePath(seed.categoryPath());
            QuestionType type = (seed.choices() == null || seed.choices().isEmpty())
                    ? QuestionType.SHORT_ANSWER
                    : QuestionType.MULTIPLE_CHOICE;

            Question existing = findExistingSeed(seed);
            if (existing != null) {
                if (!existing.getQuestion().equals(seed.question())
                        || existing.getQuestionType() != type
                        || !existing.getChoices().equals(seed.choices())) {
                    existing.update(
                            type,
                            category,
                            seed.difficulty(),
                            seed.question(),
                            seed.choices(),
                            seed.answer(),
                            seed.explanation(),
                            seed.keywords(),
                            null
                    );
                    updated++;
                }
                continue;
            }
            questionRepository.save(Question.create(
                    type,
                    category,
                    seed.difficulty(),
                    seed.question(),
                    seed.choices(),
                    seed.answer(),
                    seed.explanation(),
                    seed.keywords(),
                    null
            ));
            created++;
        }
        if (created > 0) log.info("Seeded {} questions", created);
        if (updated > 0) log.info("Backfilled {} seeded questions to multiple-choice", updated);
    }

    /**
     * pgvector 확장과 embedding_vector 컬럼은 엔티티에 매핑되지 않은 수동 스키마라
     * ddl-auto가 만들어주지 않는다. 부팅 시 idempotent하게 보장한다.
     */
    private void ensureVectorColumn() {
        jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
        jdbcTemplate.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS embedding_vector vector(1536)");
    }

    /** 루트부터 경로를 따라 내려가며 없는 노드는 생성 */
    private Category ensurePath(List<String> path) {
        Category current = null;
        for (String name : path) {
            Long parentId = current == null ? null : current.getId();
            Category found = (parentId == null
                    ? categoryRepository.findFirstByParentIsNullAndName(name)
                    : categoryRepository.findFirstByParent_IdAndName(parentId, name))
                    .orElse(null);
            if (found == null) {
                long siblings = parentId == null
                        ? categoryRepository.countByParentIsNull()
                        : categoryRepository.countByParent_Id(parentId);
                found = categoryRepository.save(Category.create(current, name, (int) siblings));
            }
            current = found;
        }
        return current;
    }

    private QuestionDef q(
            List<String> categoryPath,
            QuestionDifficulty difficulty,
            String question,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords
    ) {
        return new QuestionDef(categoryPath, difficulty, question, choices, answer, explanation, keywords, List.of());
    }

    private QuestionDef qPrev(
            List<String> categoryPath,
            QuestionDifficulty difficulty,
            String question,
            List<String> previousQuestions,
            List<String> choices,
            String answer,
            String explanation,
            List<String> keywords
    ) {
        return new QuestionDef(categoryPath, difficulty, question, choices, answer, explanation, keywords, previousQuestions);
    }

    private Question findExistingSeed(QuestionDef seed) {
        Question current = questionRepository.findFirstByQuestion(seed.question()).orElse(null);
        if (current != null) return current;
        for (String previousQuestion : seed.previousQuestions()) {
            Question previous = questionRepository.findFirstByQuestion(previousQuestion).orElse(null);
            if (previous != null) return previous;
        }
        return null;
    }

    private List<String> choices(String answer, String... distractors) {
        List<String> values = java.util.stream.Stream.concat(
                java.util.stream.Stream.of(answer),
                java.util.Arrays.stream(distractors)
        ).toList();
        int offset = Math.floorMod(answer.hashCode(), values.size());
        return java.util.stream.IntStream.range(0, values.size())
                .mapToObj(i -> values.get((i + offset) % values.size()))
                .toList();
    }
}
