package com.resolveit.repository;

import com.resolveit.model.InternalNote;
import com.resolveit.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InternalNoteRepository extends JpaRepository<InternalNote, Long> {
    List<InternalNote> findByComplaintOrderByCreatedAtDesc(Complaint complaint);
    List<InternalNote> findByComplaintIdOrderByCreatedAtDesc(Long complaintId);
    List<InternalNote> findByComplaintAndIsPublicOrderByCreatedAtDesc(Complaint complaint, boolean isPublic);
}
