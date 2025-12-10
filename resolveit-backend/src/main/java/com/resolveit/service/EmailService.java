package com.resolveit.service;

import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    public void sendComplaintSubmissionEmail(Complaint complaint) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(complaint.getUser().getEmail());
            message.setSubject("Complaint Submitted Successfully - #" + complaint.getId());
            message.setText(
                "Dear " + complaint.getUser().getFirstName() + ",\n\n" +
                "Your complaint has been submitted successfully.\n\n" +
                "Complaint ID: #" + complaint.getId() + "\n" +
                "Title: " + complaint.getTitle() + "\n" +
                "Status: " + complaint.getStatus() + "\n" +
                "Priority: " + complaint.getPriority() + "\n\n" +
                "You can track your complaint status using the complaint ID.\n\n" +
                "Thank you for contacting us.\n\n" +
                "Best regards,\n" +
                "ResolveIt Support Team"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }
    
    public void sendStatusUpdateEmail(Complaint complaint, Complaint.Status oldStatus, Complaint.Status newStatus) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(complaint.getUser().getEmail());
            message.setSubject("Complaint Status Updated - #" + complaint.getId());
            message.setText(
                "Dear " + complaint.getUser().getFirstName() + ",\n\n" +
                "Your complaint status has been updated.\n\n" +
                "Complaint ID: #" + complaint.getId() + "\n" +
                "Title: " + complaint.getTitle() + "\n" +
                "Previous Status: " + oldStatus + "\n" +
                "Current Status: " + newStatus + "\n\n" +
                "You can view more details by logging into your account.\n\n" +
                "Thank you for your patience.\n\n" +
                "Best regards,\n" +
                "ResolveIt Support Team"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }
    
    public void sendAssignmentEmail(Complaint complaint, User assignedTo) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(assignedTo.getEmail());
            message.setSubject("New Complaint Assigned - #" + complaint.getId());
            message.setText(
                "Dear " + assignedTo.getFirstName() + ",\n\n" +
                "A new complaint has been assigned to you.\n\n" +
                "Complaint ID: #" + complaint.getId() + "\n" +
                "Title: " + complaint.getTitle() + "\n" +
                "Category: " + complaint.getCategory() + "\n" +
                "Priority: " + complaint.getPriority() + "\n" +
                "Submitted by: " + complaint.getUser().getFirstName() + " " + complaint.getUser().getLastName() + "\n\n" +
                "Please log in to the admin panel to view and manage this complaint.\n\n" +
                "Best regards,\n" +
                "ResolveIt System"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }
    
    public void sendPublicNoteEmail(Complaint complaint, String noteText) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(complaint.getUser().getEmail());
            message.setSubject("Update on Your Complaint - #" + complaint.getId());
            message.setText(
                "Dear " + complaint.getUser().getFirstName() + ",\n\n" +
                "There's an update on your complaint.\n\n" +
                "Complaint ID: #" + complaint.getId() + "\n" +
                "Title: " + complaint.getTitle() + "\n\n" +
                "Update:\n" + noteText + "\n\n" +
                "You can view more details by logging into your account.\n\n" +
                "Best regards,\n" +
                "ResolveIt Support Team"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }
}
