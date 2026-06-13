package com.cj.englishagenthub.exam.infrastructure;

import com.cj.englishagenthub.exam.domain.Exam;
import com.cj.englishagenthub.exam.domain.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, String> {
    List<Exam> findAllByOrderByCreatedAtDesc();
    List<Exam> findByStatusOrderByCreatedAtDesc(ExamStatus status);
}
