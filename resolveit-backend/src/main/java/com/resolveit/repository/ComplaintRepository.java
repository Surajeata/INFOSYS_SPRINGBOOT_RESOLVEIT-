package com.resolveit.repository;

import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    Page<Complaint> findByUser(User user, Pageable pageable);
    Page<Complaint> findByAssignedTo(User assignedTo, Pageable pageable);
    Page<Complaint> findByStatus(Complaint.Status status, Pageable pageable);
    Page<Complaint> findByCategory(Complaint.Category category, Pageable pageable);
    Page<Complaint> findByPriority(Complaint.Priority priority, Pageable pageable);
    
    @Query("SELECT c FROM Complaint c WHERE c.createdAt BETWEEN :startDate AND :endDate")
    List<Complaint> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, 
                                          @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.status = :status")
    Long countByStatus(@Param("status") Complaint.Status status);
    
    @Query("SELECT c.category, COUNT(c) FROM Complaint c GROUP BY c.category")
    List<Object[]> getComplaintsByCategory();
    
    @Query("SELECT c.status, COUNT(c) FROM Complaint c GROUP BY c.status")
    List<Object[]> getComplaintsByStatus();
    
    @Query("SELECT c FROM Complaint c WHERE c.title LIKE %:keyword% OR c.description LIKE %:keyword%")
    Page<Complaint> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
