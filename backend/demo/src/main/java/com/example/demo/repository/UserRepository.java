package com.example.demo.repository;

import com.example.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    // Spring Data JPA สร้างเมธอดพื้นฐานให้โดยอัตโนมัติ (เช่น findAll(), findById(), save(), deleteById() เป็นต้น)
    // สามารถเพิ่มเมธอดค้นหาที่กำหนดเองได้ (เช่น findByUsername, findByEmail เป็นต้น)
    Optional<User> findByUsername(String username);
}
