package com.example.demo.model;

import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.ItemStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.*;


@Entity 
@Table(name = "users")
public class User {

    //define attributes
    @Id 
    @Column(name = "student_id", length = 50)
    private String studentId;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String username;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String fullName;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String email;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String faculty;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String department;
    @JsonIgnore
    @Column(name = "password_hash", length = 255)
    private String passwordHash;
    @Column(name = "role", length = 50)
    private String role = "STUDENT";
    @Column(name = "auth_provider", length = 50)
    private String authProvider = "LOCAL";

    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ User เปล่า
     */
    public User() { }

    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับผู้ใช้ทั้งหมด
     * 
     * @param studentId รหัสนักศึกษา (Student ID)
     * @param username  ชื่อผู้ใช้ (Username)
     * @param fullName  ชื่อเต็มของผู้ใช้ (Full Name)
     * @param email     อีเมลของผู้ใช้ (Email)
     * @param faculty   คณะของผู้ใช้ (Faculty)
     */
    public User(String studentId, String username, String fullName, String email, String faculty) {
        this.studentId = studentId;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.faculty = faculty;
        this.role = "STUDENT";
        this.authProvider = "LOCAL";
    }

    public User(String studentId, String username, String fullName, String email, String faculty, String passwordHash, String role) {
        this(studentId, username, fullName, email, faculty);
        this.passwordHash = passwordHash;
        this.role = (role != null && !role.isBlank()) ? role : "STUDENT";
    }

    //define getters and setters
    public String getStudentId() {return studentId;}
    public String getUsername() {return username;}
    public String getFullName() {return fullName;}
    public String getEmail() {return email;}
    public String getFaculty() {return faculty;}
    public String getDepartment() {return department;}
    @JsonIgnore
    public String getPasswordHash() {return passwordHash;}
    public String getRole() {return role != null ? role : "STUDENT";}
    public String getAuthProvider() {return authProvider != null ? authProvider : "LOCAL";}

    public void setStudentId(String studentId) {this.studentId = studentId;}
    public void setUsername(String username) {this.username = username;}
    public void setFullName(String fullName) {this.fullName = fullName;}
    public void setEmail(String email) {this.email = email;}
    public void setFaculty(String faculty) {this.faculty = faculty;}
    public void setDepartment(String department) {this.department = department;}
    public void setPasswordHash(String passwordHash) {this.passwordHash = passwordHash;}
    public void setRole(String role) {this.role = (role != null && !role.isBlank()) ? role : "STUDENT";}
    public void setAuthProvider(String authProvider) {this.authProvider = (authProvider != null && !authProvider.isBlank()) ? authProvider : "LOCAL";}

    //define methods
    public Boolean login() {
        // ตรวจสอบว่ามีรหัสนักศึกษา/ผู้ใช้หรือไม่
        return this.studentId != null && !this.studentId.isEmpty();
    }
    public Item createItem(Item itemData) {
        if (itemData.getStatus() == null) {
                itemData.setStatus(ItemStatus.AVAILABLE);
        }

        return new Item(
            itemData.getId(), 
            this.studentId,
            itemData.getTitle(), 
            itemData.getDescription(), 
            itemData.getCategory(), 
            itemData.getStatus(), 
            itemData.getImageUrl()
        );
    }
    public BorrowRequest requestBorrow(String itemId, LocalDateTime startDate, LocalDateTime endDate, String reason) {
        //id ของ BorrowRequest ให้ทาง Service หรือ Database จัดการสร้างให้ทีหลัง 
        return new BorrowRequest(
            null,                               // id
            itemId,                                 // itemId
            this.studentId,                         // borrowerId
            startDate,                              // startDate
            endDate,                                // endDate
            reason,                                 // reason
            RequestStatus.PENDING,                  // status เริ่มต้น
            LocalDateTime.now(ZoneOffset.UTC)       // createdAt
        );
    }

}
