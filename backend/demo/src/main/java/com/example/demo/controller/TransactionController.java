package com.example.demo.controller;

import com.example.demo.model.Transaction;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController 
@RequestMapping ("/api/transactions")
@CrossOrigin(origins = "http://localhost:3000")

public class TransactionController {
    
    private final List<Transaction> transactions = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong();
    
    @GetMapping
    public List<Transaction> getTransactions() {
        return transactions;
    }

    @PostMapping
    public Transaction addTransaction(@RequestBody Transaction transaction) {
        transaction.setId(String.valueOf(idCounter.incrementAndGet()));
        transactions.add(transaction);
        return transaction;
    }

}
