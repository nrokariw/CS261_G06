package com.example.demo.controller;

import com.example.demo.constant.TransactionStatus;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser; // [เพิ่ม] import สำหรับจำลอง User login
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private EvidenceProofService evidenceProofService;

    @Test
    @WithMockUser(username = "6400000001") // [เพิ่ม] จำลอง User ที่ผ่านการ Authentication แล้ว
    void submitReturnEvidence_Success() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "test-return.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "test image content".getBytes()
        );

        Transaction mockTransaction = new Transaction();
        mockTransaction.setId("tx-001");
        mockTransaction.setStatus(TransactionStatus.COMPLETED);

        when(transactionService.submitReturnEvidence(eq("req-001"), any(String.class), any()))
                .thenReturn(mockTransaction);

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .file(imageFile)
                        .param("note", "คืนสินค้าเรียบร้อย สภาพดี")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk());
    }

    @Test
    // ไม่ใส่ @WithMockUser ในเคสนี้ เพื่อทดสอบตอนที่ยังไม่ผ่าน Authenticated หรือ Token ไม่ถูกต้อง
    void submitReturnEvidence_Unauthorized_MissingToken() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "test-return.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "test image content".getBytes()
        );

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .file(imageFile)
                        .param("note", "คืนสินค้า"))
                .andExpect(status().isUnauthorized());
    }
}
