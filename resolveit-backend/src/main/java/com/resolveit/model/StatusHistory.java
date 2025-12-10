package com.resolveit.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "status_history")
public class StatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id")
    private Complaint complaint;

    @Enumerated(EnumType.STRING)
    private Complaint.Status status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "timestamp")
    private LocalDateTime timestamp = LocalDateTime.now();

    private String notes;

    // Constructors
    public StatusHistory() {}

    public StatusHistory(Complaint complaint, Complaint.Status status, User changedBy, String notes) {
        this.complaint = complaint;
        this.status = status;
        this.changedBy = changedBy;
        this.notes = notes;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Complaint getComplaint() { return complaint; }
    public void setComplaint(Complaint complaint) { this.complaint = complaint; }

    public Complaint.Status getStatus() { return status; }
    public void setStatus(Complaint.Status status) { this.status = status; }

    public User getChangedBy() { return changedBy; }
    public void setChangedBy(User changedBy) { this.changedBy = changedBy; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
