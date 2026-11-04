package com.example.demo.service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    //define attributes
    private final UserRepository userRepository;

    //define constructor
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 1. บันทึกหรือสร้างผู้ใช้งานใหม่
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    // 2.1. ค้นหาผู้ใช้จากรหัสนักศึกษา (studentId)
    public Optional<User> getUserByStudentId(String studentId) {
        return userRepository.findById(studentId);
    }

    // 2.2. ดึงรายชื่อผู้ใช้ทั้งหมดในระบบ
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // 3. ลบผู้ใช้งาน
    public void deleteUser(String studentId) {
        userRepository.deleteById(studentId);
    }

}
