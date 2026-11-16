package com.example.demo.repository;

import com.example.demo.constant.WantedPostStatus;
import com.example.demo.model.WantedPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WantedPostRepository extends JpaRepository<WantedPost, String> {
    List<WantedPost> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(WantedPostStatus status);
    List<WantedPost> findByRequesterIdAndDeletedAtIsNullOrderByCreatedAtDesc(String requesterId);
}
