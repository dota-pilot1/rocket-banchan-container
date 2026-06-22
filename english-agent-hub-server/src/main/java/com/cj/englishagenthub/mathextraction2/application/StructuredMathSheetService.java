package com.cj.englishagenthub.mathextraction2.application;

import com.cj.englishagenthub.auth.security.UserPrincipal;
import com.cj.englishagenthub.common.exception.BusinessException;
import com.cj.englishagenthub.common.exception.ErrorCode;
import com.cj.englishagenthub.mathextraction2.domain.StructuredMathSheet;
import com.cj.englishagenthub.mathextraction2.infrastructure.StructuredMathSheetRepository;
import com.cj.englishagenthub.mathextraction2.presentation.dto.StructuredMathSheetResponse;
import com.cj.englishagenthub.user.domain.User;
import com.cj.englishagenthub.user.infrastructure.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StructuredMathSheetService {

    private final StructuredMathSheetRepository repository;
    private final StructuredMathExtractionService extractionService;
    private final UserRepository userRepository;

    @Transactional
    public StructuredMathSheetResponse createFromPdf(UserPrincipal principal, MultipartFile problemPdf, MultipartFile answerPdf) {
        List<StructuredMathSheet.ItemSpec> specs = extractionService.extract(problemPdf, answerPdf);
        User creator = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        StructuredMathSheet sheet = StructuredMathSheet.create(
                creator, deriveTitle(problemPdf.getOriginalFilename()), problemPdf.getOriginalFilename(), specs);
        return StructuredMathSheetResponse.from(repository.save(sheet));
    }

    @Transactional(readOnly = true)
    public List<StructuredMathSheetResponse> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(StructuredMathSheetResponse::summary)
                .toList();
    }

    @Transactional(readOnly = true)
    public StructuredMathSheetResponse get(String id) {
        return StructuredMathSheetResponse.from(loadOrThrow(id));
    }

    @Transactional
    public void delete(String id) {
        repository.delete(loadOrThrow(id));
    }

    private StructuredMathSheet loadOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXTRACTED_MATH_SHEET_NOT_FOUND));
    }

    private String deriveTitle(String fileName) {
        if (!StringUtils.hasText(fileName)) return "수학 정형 추출 시험지";
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        return base.length() > 180 ? base.substring(0, 180) : base;
    }
}
