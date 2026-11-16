package com.example.demo.controller;

import com.example.demo.constant.TransactionStatus;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransactionService transactionService;

    @MockitoBean
    private EvidenceProofService evidenceProofService;

    private UsernamePasswordAuthenticationToken authAs(String userId) {
        return new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );
    }

    @Test
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

        when(transactionService.submitReturnEvidence(eq("req-001"), eq("6809000001"), any()))
                .thenReturn(mockTransaction);

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .file(imageFile)
                        .param("note", "คืนสินค้าเรียบร้อย สภาพดี")
                        .principal(authAs("6809000001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("tx-001"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void submitReturnEvidence_Unauthorized_WhenUnauthenticated() throws Exception {
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

    @Test
    void submitReturnEvidence_BadRequest_WhenMissingImage() throws Exception {
        when(transactionService.submitReturnEvidence(eq("req-001"), eq("6809000001"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required"));

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .param("note", "ไม่มีรูปภาพ")
                        .principal(authAs("6809000001")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitReturnEvidence_Forbidden_WhenNotParticipant() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "test-return.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "test image content".getBytes()
        );

        when(transactionService.submitReturnEvidence(eq("req-001"), eq("6809000003"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant"));

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .file(imageFile)
                        .param("note", "บุคคลภายนอก")
                        .principal(authAs("6809000003")))
                .andExpect(status().isForbidden());
    }

    @Test
    void submitReturnEvidence_Conflict_WhenTransactionNotActive() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "test-return.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "test image content".getBytes()
        );

        when(transactionService.submitReturnEvidence(eq("req-001"), eq("6809000001"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Transaction is not ACTIVE"));

        mockMvc.perform(multipart("/api/transactions/request/req-001/return-evidence")
                        .file(imageFile)
                        .param("note", "ส่งคืนซ้ำ")
                        .principal(authAs("6809000001")))
                .andExpect(status().isConflict());
    }
}
