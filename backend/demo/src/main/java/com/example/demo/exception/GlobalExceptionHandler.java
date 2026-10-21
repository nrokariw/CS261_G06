package com.example.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ดักจับ IllegalArgumentException ที่ถูกโยนมาจาก Service (เช่น ไฟล์ผิดประเภท, เกิน 5MB)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ex.getMessage()); // จะได้ข้อความเช่น "Invalid file type. Only JPG and PNG are allowed." กลับไป
    }

    // ดักจับ ResponseStatusException (เช่น 401 Unauthorized ที่เราโยนตอนเช็ก Token)
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleResponseStatusException(ResponseStatusException ex) {
        return ResponseEntity
                .status(ex.getStatusCode()) // ดึง Status Code ที่เรากำหนด (เช่น 401)
                .body(ex.getReason());     // ดึงข้อความ Reason ที่แจ้งเตือน
    }
}