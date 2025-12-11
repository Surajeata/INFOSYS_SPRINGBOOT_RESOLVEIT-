package com.resolveit.service;

import com.resolveit.model.Complaint;
import com.resolveit.model.StatusHistory;
import com.resolveit.model.InternalNote;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.StatusHistoryRepository;
import com.resolveit.repository.InternalNoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ComplaintService {
    
    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private StatusHistoryRepository statusHistoryRepository;
    
    @Autowired
    private InternalNoteRepository internalNoteRepository;
    
    @Autowired
    private EmailService emailService;
    
    public Complaint createComplaint(Complaint complaint) {
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());
        complaint.setStatus(Complaint.Status.SUBMITTED);
        
        Complaint savedComplaint = complaintRepository.save(complaint);
        
        // Create initial status history
        StatusHistory statusHistory = new StatusHistory(
            savedComplaint, 
            Complaint.Status.SUBMITTED, 
            complaint.getUser(), 
            "Complaint submitted"
        );
        statusHistoryRepository.save(statusHistory);
        
        // Send confirmation email
        emailService.sendComplaintSubmissionEmail(savedComplaint);
        
        return savedComplaint;
    }
    
    public Optional<Complaint> findById(Long id) {
        return complaintRepository.findById(id);
    }
    
    public Page<Complaint> getAllComplaints(Pageable pageable) {
        return complaintRepository.findAll(pageable);
    }
    
    public Page<Complaint> getComplaintsByUser(User user, Pageable pageable) {
        return complaintRepository.findByUser(user, pageable);
    }
    
    public Page<Complaint> getComplaintsByAssignedTo(User assignedTo, Pageable pageable) {
        return complaintRepository.findByAssignedTo(assignedTo, pageable);
    }
    
    public Page<Complaint> getComplaintsByStatus(Complaint.Status status, Pageable pageable) {
        return complaintRepository.findByStatus(status, pageable);
    }
    
    public Page<Complaint> searchComplaints(String keyword, Pageable pageable) {
        return complaintRepository.searchByKeyword(keyword, pageable);
    }
    
    public Complaint updateComplaintStatus(Long complaintId, Complaint.Status newStatus, User changedBy, String notes) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
        if (complaintOpt.isPresent()) {
            Complaint complaint = complaintOpt.get();
            Complaint.Status oldStatus = complaint.getStatus();
            
            complaint.setStatus(newStatus);
            complaint.setUpdatedAt(LocalDateTime.now());
            
            if (newStatus == Complaint.Status.RESOLVED || newStatus == Complaint.Status.CLOSED) {
                complaint.setResolvedAt(LocalDateTime.now());
            }
            
            Complaint updatedComplaint = complaintRepository.save(complaint);
            
            // Create status history entry
            StatusHistory statusHistory = new StatusHistory(updatedComplaint, newStatus, changedBy, notes);
            statusHistoryRepository.save(statusHistory);
            
            // Send status update email
            emailService.sendStatusUpdateEmail(updatedComplaint, oldStatus, newStatus);
            
            return updatedComplaint;
        }
        throw new RuntimeException("Complaint not found");
    }
    
    public Complaint assignComplaint(Long complaintId, User assignedTo, User assignedBy) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
        if (complaintOpt.isPresent()) {
            Complaint complaint = complaintOpt.get();
            complaint.setAssignedTo(assignedTo);
            complaint.setUpdatedAt(LocalDateTime.now());
            
            if (complaint.getStatus() == Complaint.Status.SUBMITTED) {
                complaint.setStatus(Complaint.Status.IN_PROGRESS);
            }
            
            Complaint updatedComplaint = complaintRepository.save(complaint);
            
            // Create status history entry
            StatusHistory statusHistory = new StatusHistory(
                updatedComplaint, 
                complaint.getStatus(), 
                assignedBy, 
                "Complaint assigned to " + assignedTo.getFirstName() + " " + assignedTo.getLastName()
            );
            statusHistoryRepository.save(statusHistory);
            
            // Send assignment email
            emailService.sendAssignmentEmail(updatedComplaint, assignedTo);
            
            return updatedComplaint;
        }
        throw new RuntimeException("Complaint not found");
    }
    
    public InternalNote addInternalNote(Long complaintId, String noteText, User createdBy, boolean isPublic) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
        if (complaintOpt.isPresent()) {
            Complaint complaint = complaintOpt.get();
            InternalNote note = new InternalNote(complaint, noteText, createdBy, isPublic);
            InternalNote savedNote = internalNoteRepository.save(note);
            
            // If it's a public note, send email to user
            if (isPublic) {
                emailService.sendPublicNoteEmail(complaint, noteText);
            }
            
            return savedNote;
        }
        throw new RuntimeException("Complaint not found");
    }
    
    public List<StatusHistory> getComplaintHistory(Long complaintId) {
        return statusHistoryRepository.findByComplaintIdOrderByTimestampDesc(complaintId);
    }
    
    public List<InternalNote> getComplaintNotes(Long complaintId, boolean publicOnly) {
        if (publicOnly) {
            Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
            if (complaintOpt.isPresent()) {
                return internalNoteRepository.findByComplaintAndIsPublicOrderByCreatedAtDesc(complaintOpt.get(), true);
            }
        }
        return internalNoteRepository.findByComplaintIdOrderByCreatedAtDesc(complaintId);
    }
    
    public void deleteComplaint(Long id) {
        complaintRepository.deleteById(id);
    }
    
    // Analytics methods
    public Long getComplaintCountByStatus(Complaint.Status status) {
        return complaintRepository.countByStatus(status);
    }
    
    public List<Object[]> getComplaintsByCategory() {
        return complaintRepository.getComplaintsByCategory();
    }
    
    public List<Object[]> getComplaintsByStatus() {
        return complaintRepository.getComplaintsByStatus();
    }
    
    public List<Complaint> getComplaintsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return complaintRepository.findByCreatedAtBetween(startDate, endDate);
    }
}
