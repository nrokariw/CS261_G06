package com.example.demo.controller;

import com.example.demo.model.Item;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController 
@RequestMapping ("/api/items")
@CrossOrigin(origins = "http://localhost:3000")

public class ItemController {

    private final List<Item> items = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong();
    
    @GetMapping
    public List<Item> getItems() {
        return items;
    }

    @PostMapping 
    public Item addItem(@RequestBody Item item) {
        item.setId(String.valueOf(idCounter.incrementAndGet()));
        items.add(item);
        return item;
    }

}
