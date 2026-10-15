package com.example.demo.controller;

import com.example.demo.model.BorrowRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController 
@RequestMapping ("/api/borrow-requests")

public class BorrowRequestController {
    
    private final List<BorrowRequest> borrowRequests = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong();
    
    @GetMapping
    public List<BorrowRequest> getBorrowRequests() {
        return borrowRequests;
    }

    @PostMapping
    public BorrowRequest addBorrowRequest(@RequestBody BorrowRequest borrowRequest) {
        borrowRequest.setId(String.valueOf(idCounter.incrementAndGet()));
        borrowRequests.add(borrowRequest);
        return borrowRequest;
    }

}
