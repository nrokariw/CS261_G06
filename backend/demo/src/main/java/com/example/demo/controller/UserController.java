package com.example.demo.controller;

import com.example.demo.model.User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController 
@RequestMapping ("/api/users")
@CrossOrigin(origins = "http://localhost:3000")

public class UserController {

    private final List<User> users = new ArrayList<>();
    private final AtomicLong idCounter = new AtomicLong();
    
    @GetMapping
    public List<User> getUsers() {
        return users;
    }

    @PostMapping
    public User addUser(@RequestBody User user) {
        user.setStudentId(String.valueOf(idCounter.incrementAndGet()));
        users.add(user);
        return user;
    }

}
