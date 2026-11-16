package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.LendOfferStatus;
import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.WantedPostStatus;
import com.example.demo.dto.LendOfferDto;
import com.example.demo.dto.WantedPostDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.LendOffer;
import com.example.demo.model.User;
import com.example.demo.model.WantedPost;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.LendOfferRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WantedPostRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class WantedPostService {

    private static final int DEFAULT_LOAN_DAYS = 3;

    private final WantedPostRepository wantedPostRepository;
    private final LendOfferRepository lendOfferRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final BorrowRequestRepository borrowRequestRepository;

    public WantedPostService(
            WantedPostRepository wantedPostRepository,
            LendOfferRepository lendOfferRepository,
            UserRepository userRepository,
            ItemRepository itemRepository,
            BorrowRequestRepository borrowRequestRepository) {
        this.wantedPostRepository = wantedPostRepository;
        this.lendOfferRepository = lendOfferRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.borrowRequestRepository = borrowRequestRepository;
    }

    public List<Map<String, Object>> listOpenPosts(String category, String query) {
        String normalizedCategory = category != null ? category.trim() : "";
        String normalizedQuery = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";

        return wantedPostRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(WantedPostStatus.OPEN)
                .stream()
                .filter(post -> normalizedCategory.isEmpty()
                        || "ALL".equalsIgnoreCase(normalizedCategory)
                        || normalizedCategory.equalsIgnoreCase(post.getCategory()))
                .filter(post -> normalizedQuery.isEmpty()
                        || safeLower(post.getTitle()).contains(normalizedQuery)
                        || safeLower(post.getDescription()).contains(normalizedQuery)
                        || safeLower(post.getCategory()).contains(normalizedQuery))
                .map(post -> toPostMap(post, null, false))
                .toList();
    }

    public List<Map<String, Object>> getMyPosts(String requesterId) {
        return wantedPostRepository.findByRequesterIdAndDeletedAtIsNullOrderByCreatedAtDesc(requesterId)
                .stream()
                .map(post -> toPostMap(post, requesterId, true))
                .toList();
    }

    public Map<String, Object> getPostDetail(String postId, String viewerId) {
        WantedPost post = findActivePost(postId);
        return toPostMap(post, viewerId, true);
    }

    @Transactional
    public Map<String, Object> createPost(String requesterId, WantedPostDto dto) {
        validatePostDto(dto);

        WantedPost post = new WantedPost();
        post.setId(UUID.randomUUID().toString());
        post.setRequesterId(requesterId);
        post.setTitle(dto.getTitle().trim());
        post.setCategory(dto.getCategory().trim());
        post.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : "");
        post.setNeededFrom(dto.getNeededFrom());
        post.setNeededUntil(dto.getNeededUntil());
        post.setStatus(WantedPostStatus.OPEN);

        WantedPost saved = wantedPostRepository.save(post);
        return toPostMap(saved, requesterId, true);
    }

    @Transactional
    public Map<String, Object> updatePost(String postId, String requesterId, WantedPostDto dto) {
        WantedPost post = findActivePost(postId);
        ensureRequester(post, requesterId);
        if (post.getStatus() != WantedPostStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only OPEN wanted posts can be edited");
        }
        validatePostDto(dto);

        post.setTitle(dto.getTitle().trim());
        post.setCategory(dto.getCategory().trim());
        post.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : "");
        post.setNeededFrom(dto.getNeededFrom());
        post.setNeededUntil(dto.getNeededUntil());

        WantedPost saved = wantedPostRepository.save(post);
        return toPostMap(saved, requesterId, true);
    }

    @Transactional
    public void cancelPost(String postId, String requesterId) {
        WantedPost post = findActivePost(postId);
        ensureRequester(post, requesterId);
        if (post.getStatus() == WantedPostStatus.FULFILLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot cancel a fulfilled wanted post");
        }
        post.setStatus(WantedPostStatus.CANCELLED);
        post.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
        wantedPostRepository.save(post);
    }

    @Transactional
    public Map<String, Object> createOffer(String postId, String lenderId, LendOfferDto dto) {
        WantedPost post = findActivePost(postId);
        if (post.getStatus() != WantedPostStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wanted post is no longer open");
        }
        if (post.getRequesterId().equals(lenderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot offer to lend on your own wanted post");
        }

        String offeredItemId = dto != null && dto.getOfferedItemId() != null && !dto.getOfferedItemId().isBlank()
                ? dto.getOfferedItemId().trim()
                : null;
        String message = dto != null && dto.getMessage() != null ? dto.getMessage().trim() : "";

        if (offeredItemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select an AVAILABLE item to offer");
        }

        Item item = itemRepository.findById(offeredItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Offered item not found"));
        if (!lenderId.equals(item.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only offer your own items");
        }
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Offered item is not AVAILABLE");
        }

        if (lendOfferRepository.existsByWantedPostIdAndLenderIdAndStatus(postId, lenderId, LendOfferStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending offer on this post");
        }

        LendOffer offer = new LendOffer();
        offer.setId(UUID.randomUUID().toString());
        offer.setWantedPostId(postId);
        offer.setLenderId(lenderId);
        offer.setOfferedItemId(offeredItemId);
        offer.setMessage(message);
        offer.setStatus(LendOfferStatus.PENDING);

        LendOffer saved = lendOfferRepository.save(offer);
        return toOfferMap(saved);
    }

    @Transactional
    public Map<String, Object> acceptOffer(String postId, String offerId, String requesterId) {
        WantedPost post = findActivePost(postId);
        ensureRequester(post, requesterId);
        if (post.getStatus() != WantedPostStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wanted post is already closed");
        }

        LendOffer offer = lendOfferRepository.findById(offerId)
                .filter(o -> o.getWantedPostId().equals(postId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Offer not found"));
        if (offer.getStatus() != LendOfferStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Offer is no longer pending");
        }

        BorrowRequest createdRequest = null;
        if (offer.getOfferedItemId() != null && !offer.getOfferedItemId().isBlank()) {
            Item item = itemRepository.findById(offer.getOfferedItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Offered item not found"));
            if (item.getStatus() != ItemStatus.AVAILABLE) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Offered item is no longer AVAILABLE");
            }

            item.setStatus(ItemStatus.RESERVED);
            itemRepository.save(item);

            LocalDateTime start = post.getNeededFrom() != null ? post.getNeededFrom() : LocalDateTime.now(ZoneOffset.UTC);
            LocalDateTime end = post.getNeededUntil() != null ? post.getNeededUntil() : start.plusDays(DEFAULT_LOAN_DAYS);

            BorrowRequest request = new BorrowRequest();
            request.setId(UUID.randomUUID().toString());
            request.setItemId(item.getId());
            request.setBorrowerId(post.getRequesterId());
            request.setStartDate(start);
            request.setEndDate(end);
            String baseReason = (post.getDescription() != null && !post.getDescription().isBlank())
                    ? post.getDescription().trim()
                    : post.getTitle();
            request.setReason(baseReason);
            if (offer.getMessage() != null && !offer.getMessage().isBlank()) {
                request.setResponseReason(offer.getMessage().trim());
            }
            request.setStatus(RequestStatus.ACCEPTED);
            createdRequest = borrowRequestRepository.save(request);
        }

        offer.setStatus(LendOfferStatus.ACCEPTED);
        lendOfferRepository.save(offer);

        List<LendOffer> others = lendOfferRepository.findByWantedPostIdOrderByCreatedAtDesc(postId);
        for (LendOffer other : others) {
            if (!other.getId().equals(offerId) && other.getStatus() == LendOfferStatus.PENDING) {
                other.setStatus(LendOfferStatus.REJECTED);
                lendOfferRepository.save(other);
            }
        }

        post.setStatus(WantedPostStatus.FULFILLED);
        wantedPostRepository.save(post);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("post", toPostMap(post, requesterId, true));
        result.put("acceptedOffer", toOfferMap(offer));
        result.put("borrowRequestId", createdRequest != null ? createdRequest.getId() : null);
        result.put("borrowRequest", createdRequest);
        return result;
    }

    @Transactional
    public Map<String, Object> rejectOffer(String postId, String offerId, String requesterId) {
        WantedPost post = findActivePost(postId);
        ensureRequester(post, requesterId);

        LendOffer offer = lendOfferRepository.findById(offerId)
                .filter(o -> o.getWantedPostId().equals(postId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Offer not found"));
        if (offer.getStatus() != LendOfferStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Offer is no longer pending");
        }

        offer.setStatus(LendOfferStatus.REJECTED);
        LendOffer saved = lendOfferRepository.save(offer);
        return toOfferMap(saved);
    }

    private WantedPost findActivePost(String postId) {
        return wantedPostRepository.findById(postId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wanted post not found"));
    }

    private void ensureRequester(WantedPost post, String userId) {
        if (userId == null || !post.getRequesterId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the requester can manage this wanted post");
        }
    }

    private void validatePostDto(WantedPostDto dto) {
        if (dto == null || dto.getTitle() == null || dto.getTitle().isBlank()
                || dto.getCategory() == null || dto.getCategory().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and category are required");
        }
        if (dto.getNeededFrom() != null && dto.getNeededUntil() != null
                && dto.getNeededUntil().isBefore(dto.getNeededFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "neededUntil must not be before neededFrom");
        }
    }

    private Map<String, Object> toPostMap(WantedPost post, String viewerId, boolean includeOffers) {
        Optional<User> requesterOpt = userRepository.findById(post.getRequesterId());
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", post.getId());
        map.put("requesterId", post.getRequesterId());
        map.put("requesterName", requesterOpt.map(User::getFullName).orElse(post.getRequesterId()));
        map.put("requesterFaculty", requesterOpt.map(User::getFaculty).orElse(""));
        map.put("requesterEmail", requesterOpt.map(User::getEmail).orElse(""));
        map.put("title", post.getTitle());
        map.put("category", post.getCategory());
        map.put("description", post.getDescription());
        map.put("neededFrom", post.getNeededFrom());
        map.put("neededUntil", post.getNeededUntil());
        map.put("status", post.getStatus().name().toLowerCase(Locale.ROOT));
        map.put("createdAt", post.getCreatedAt());
        map.put("updatedAt", post.getUpdatedAt());
        map.put("pendingOfferCount", lendOfferRepository.countByWantedPostIdAndStatus(post.getId(), LendOfferStatus.PENDING));

        if (includeOffers && viewerId != null) {
            List<LendOffer> offers = post.getRequesterId().equals(viewerId)
                    ? lendOfferRepository.findByWantedPostIdOrderByCreatedAtDesc(post.getId())
                    : lendOfferRepository.findByWantedPostIdAndLenderIdOrderByCreatedAtDesc(post.getId(), viewerId);
            map.put("offers", offers.stream().map(this::toOfferMap).toList());
        }
        return map;
    }

    private Map<String, Object> toOfferMap(LendOffer offer) {
        Optional<User> lenderOpt = userRepository.findById(offer.getLenderId());
        Optional<Item> itemOpt = offer.getOfferedItemId() != null
                ? itemRepository.findById(offer.getOfferedItemId())
                : Optional.empty();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", offer.getId());
        map.put("wantedPostId", offer.getWantedPostId());
        map.put("lenderId", offer.getLenderId());
        map.put("lenderName", lenderOpt.map(User::getFullName).orElse(offer.getLenderId()));
        map.put("lenderEmail", lenderOpt.map(User::getEmail).orElse(""));
        map.put("offeredItemId", offer.getOfferedItemId());
        map.put("offeredItemTitle", itemOpt.map(Item::getTitle).orElse(null));
        map.put("offeredItemStatus", itemOpt.map(i -> i.getStatus().name().toLowerCase(Locale.ROOT)).orElse(null));
        map.put("message", offer.getMessage());
        map.put("status", offer.getStatus().name().toLowerCase(Locale.ROOT));
        map.put("createdAt", offer.getCreatedAt());
        return map;
    }

    private String safeLower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }
}
