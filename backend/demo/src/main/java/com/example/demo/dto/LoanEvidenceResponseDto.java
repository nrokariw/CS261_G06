package com.example.demo.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class LoanEvidenceResponseDto {
    private String requestId;
    private String requestStatus;
    private String borrowerId;
    private String ownerId;
    
    // ข้อมูล Item
    private String itemId;
    private String itemTitle;
    private String itemCategory;

    // ข้อมูลหลักฐานการส่งมอบ (HANDOVER Evidence)
    private String handoverImageUrl;
    private String handoverNote;
    private LocalDateTime handoverTimestamp;

    // ข้อมูลหลักฐานการส่งคืน (RETURN Evidence)
    private String returnImageUrl;
    private String returnNote;
    private LocalDateTime returnTimestamp;
}