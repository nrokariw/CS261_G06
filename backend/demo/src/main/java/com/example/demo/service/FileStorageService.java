package com.example.demo.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service 
public class FileStorageService {

    // กำหนดโฟลเดอร์สำหรับเก็บไฟล์รูปภาพ (สามารถเปลี่ยนเป็น path ที่ต้องการได้)
    private final Path fileStorageLocation = Paths.get("uploads/images").toAbsolutePath().normalize();

    public FileStorageService() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public String storeFile(MultipartFile file) {
        // 1. ตรวจสอบ Mime-Type (อนุญาตเฉพาะ JPG, PNG)
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new IllegalArgumentException("Invalid file type. Only JPG and PNG are allowed.");
        }

        // 2. ตรวจสอบขนาดไฟล์ (ตัวอย่างจำกัดที่ไม่เกิน 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds the maximum limit of 5MB.");
        }

        // 3. บันทึกไฟล์ลง Local Storage พร้อมเปลี่ยนชื่อป้องกันไฟล์ซ้ำ
        try {
            String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = "";
            int index = originalFileName.lastIndexOf('.');
            if (index > 0) {
                fileExtension = originalFileName.substring(index);
            }
            
            String fileName = UUID.randomUUID().toString() + fileExtension;
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // ส่งคืน Path หรือ URL สำหรับบันทึกลง Database
            return "/uploads/images/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again!", ex);
        }
    }

}
