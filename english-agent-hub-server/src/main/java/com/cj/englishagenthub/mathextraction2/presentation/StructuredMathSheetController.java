package com.cj.englishagenthub.mathextraction2.presentation;

import com.cj.englishagenthub.auth.security.UserPrincipal;
import com.cj.englishagenthub.mathextraction2.application.StructuredMathSheetService;
import com.cj.englishagenthub.mathextraction2.presentation.dto.StructuredMathSheetResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/structured-math-sheets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Structured Math Sheet", description = "수학 정형 추출(LaTeX+도형분리) 시험지")
public class StructuredMathSheetController {

    private final StructuredMathSheetService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "수학 PDF 업로드 → 문항별 LaTeX 전사 + 도형 분리 → 정형 시험지로 저장")
    public StructuredMathSheetResponse create(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "answerFile", required = false) MultipartFile answerFile
    ) {
        return service.createFromPdf(principal, file, answerFile);
    }

    @GetMapping
    @Operation(summary = "정형 추출 시험지 목록 (카드)")
    public List<StructuredMathSheetResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @Operation(summary = "정형 추출 시험지 단건 (문항 포함)")
    public StructuredMathSheetResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "정형 추출 시험지 삭제")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
