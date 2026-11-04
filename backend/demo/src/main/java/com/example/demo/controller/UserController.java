package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController 
@RequestMapping ("${app.api.users-path:/api/users}")

public class UserController {

    //define attributes
    private final UserService userService;

    //define constructor
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 1. เพิ่มผู้ใช้งานใหม่
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.saveUser(user);
    }

    // 2. ดึงรายการผู้ใช้งานทั้งหมด
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    // 3. ค้นหาผู้ใช้งานตาม Student ID
    @GetMapping("/{studentId}")
    public User getUserById(@PathVariable("studentId") String studentId) {
        return userService.getUserByStudentId(studentId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + studentId));
    }

}
