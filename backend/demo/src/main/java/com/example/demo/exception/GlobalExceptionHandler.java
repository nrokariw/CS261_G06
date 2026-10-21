package com.example.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ดักจับ IllegalArgumentException ที่ถูกโยนมาจาก Service (เช่น ไฟล์ผิดประเภท, เกิน 3MB, หรือเงื่อนไขอื่นๆ)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ex.getMessage()); // จะได้ข้อความเช่น "Invalid file type. Only JPG ,PNG, and WEBP are allowed." กลับไป
    }

    // ดักจับกรณีขนาดไฟล์เกินที่ Spring Boot กำหนดไว้ใน application.properties (3MB)
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body("File size exceeds the maximum limit of 3MB.");
    }
}