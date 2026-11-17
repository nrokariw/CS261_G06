package com.example.demo.controller;

import com.example.demo.dto.LendOfferDto;
import com.example.demo.dto.WantedPostDto;
import com.example.demo.service.WantedPostService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${app.api.wanted-posts-path:/api/wanted-posts}")
public class WantedPostController {

    private final WantedPostService wantedPostService;

    public WantedPostController(WantedPostService wantedPostService) {
        this.wantedPostService = wantedPostService;
    }

    @GetMapping
    public List<Map<String, Object>> listOpenPosts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q) {
        return wantedPostService.listOpenPosts(category, q);
    }

    @GetMapping("/my")
    public List<Map<String, Object>> getMyPosts(Authentication authentication) {
        return wantedPostService.getMyPosts(requireUserId(authentication));
    }

    @GetMapping("/{id}")
    public Map<String, Object> getPostDetail(
            @PathVariable String id,
            Authentication authentication) {
        String viewerId = (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal()))
                ? authentication.getName()
                : null;
        return wantedPostService.getPostDetail(id, viewerId);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPost(
            Authentication authentication,
            @RequestBody WantedPostDto dto) {
        Map<String, Object> created = wantedPostService.createPost(requireUserId(authentication), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public Map<String, Object> updatePost(
            @PathVariable String id,
            Authentication authentication,
            @RequestBody WantedPostDto dto) {
        return wantedPostService.updatePost(id, requireUserId(authentication), dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelPost(
            @PathVariable String id,
            Authentication authentication) {
        wantedPostService.cancelPost(id, requireUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/offers")
    public ResponseEntity<Map<String, Object>> createOffer(
            @PathVariable String id,
            Authentication authentication,
            @RequestBody LendOfferDto dto) {
        Map<String, Object> offer = wantedPostService.createOffer(id, requireUserId(authentication), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(offer);
    }

    @PostMapping("/{id}/offers/{offerId}/accept")
    public Map<String, Object> acceptOffer(
            @PathVariable String id,
            @PathVariable String offerId,
            Authentication authentication) {
        return wantedPostService.acceptOffer(id, offerId, requireUserId(authentication));
    }

    @PostMapping("/{id}/offers/{offerId}/reject")
    public Map<String, Object> rejectOffer(
            @PathVariable String id,
            @PathVariable String offerId,
            Authentication authentication) {
        return wantedPostService.rejectOffer(id, offerId, requireUserId(authentication));
    }

    private String requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return authentication.getName();
    }
}
