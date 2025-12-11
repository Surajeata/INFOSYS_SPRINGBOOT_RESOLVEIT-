package com.resolveit.repository;

import com.resolveit.model.StatusHistory;
import com.resolveit.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {
    List<StatusHistory> findByComplaintOrderByTimestampDesc(Complaint complaint);
    List<StatusHistory> findByComplaintIdOrderByTimestampDesc(Long complaintId);
}
