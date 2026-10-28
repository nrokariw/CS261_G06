package com.example.demo.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ดักจับ IllegalArgumentException ที่ถูกโยนมาจาก Service (เช่น ไฟล์ผิดประเภท, เกิน 3MB, หรือเงื่อนไขอื่นๆ)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("[API Error - 400 Bad Request] IllegalArgumentException: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "BAD_REQUEST",
                        "exception", ex.getClass().getSimpleName(),
                        "message", ex.getMessage() != null ? ex.getMessage() : "Bad request"
                )); // จะได้ข้อความเช่น "Invalid file type. Only JPG ,PNG, and WEBP are allowed." กลับไป
    }

    // ดักจับกรณีขนาดไฟล์เกินที่ Spring Boot กำหนดไว้ใน application.properties (3MB)
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        log.warn("[API Error - 400 Bad Request] MaxUploadSizeExceededException: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "MAX_UPLOAD_SIZE_EXCEEDED",
                        "exception", ex.getClass().getSimpleName(),
                        "message", "File size exceeds the maximum limit of 3MB."
                ));
    }

    // ดักจับ ResponseStatusException (เช่น 401 Unauthorized ที่เราโยนตอนเช็ก Token)
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException ex) {
        log.warn("[API Error - {}] ResponseStatusException: {}", ex.getStatusCode(), ex.getReason());
        return ResponseEntity
                .status(ex.getStatusCode()) // ดึง Status Code ที่เรากำหนด (เช่น 401)
                .body(Map.of(
                        "error", ex.getStatusCode().toString(),
                        "exception", ex.getClass().getSimpleName(),
                        "message", ex.getReason() != null ? ex.getReason() : "Request error"
                ));     // ดึงข้อความ Reason ที่แจ้งเตือน
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurityException(SecurityException ex) {
        log.warn("[API Error - 403 Forbidden] SecurityException: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", "FORBIDDEN",
                        "exception", ex.getClass().getSimpleName(),
                        "message", ex.getMessage() != null ? ex.getMessage() : "Forbidden"
                ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException ex) {
        log.warn("[API Error - 409 Conflict] IllegalStateException: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "error", "CONFLICT",
                        "exception", ex.getClass().getSimpleName(),
                        "message", ex.getMessage() != null ? ex.getMessage() : "Conflict"
                ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.error("[API Error - 400/500 RuntimeException] {}: {}", ex.getClass().getName(), ex.getMessage(), ex);
        String rootCauseMsg = ex.getCause() != null && ex.getCause().getMessage() != null
                ? ex.getCause().getMessage()
                : (ex.getMessage() != null ? ex.getMessage() : "Operation failed");
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "RUNTIME_EXCEPTION",
                        "exception", ex.getClass().getSimpleName(),
                        "message", ex.getMessage() != null ? ex.getMessage() : "Operation failed",
                        "detail", rootCauseMsg
                ));
    }
}