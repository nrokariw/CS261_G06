package com.example.demo.repository;

import com.example.demo.constant.LendOfferStatus;
import com.example.demo.model.LendOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LendOfferRepository extends JpaRepository<LendOffer, String> {
    List<LendOffer> findByWantedPostIdOrderByCreatedAtDesc(String wantedPostId);
    List<LendOffer> findByWantedPostIdAndLenderIdOrderByCreatedAtDesc(String wantedPostId, String lenderId);
    boolean existsByWantedPostIdAndLenderIdAndStatus(String wantedPostId, String lenderId, LendOfferStatus status);
    long countByWantedPostIdAndStatus(String wantedPostId, LendOfferStatus status);
    List<LendOffer> findByOfferedItemIdAndStatus(String offeredItemId, LendOfferStatus status);
}
