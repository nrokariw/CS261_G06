package com.example.demo.service;

import com.example.demo.dto.CategoryDto;
import com.example.demo.model.Category;
import com.example.demo.repository.CategoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class CategoryService {

    private static final Map<String, String> LEGACY_THAI_TO_CODE = Map.of(
            "อุปกรณ์การเรียน", "STUDY",
            "อุปกรณ์อิเล็กทรอนิกส์", "ELECTRONICS",
            "อุปกรณ์กีฬา", "SPORTS",
            "ของใช้ทั่วไป", "GENERAL"
    );

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getCategories(boolean includeInactive) {
        return includeInactive
                ? categoryRepository.findAllByOrderBySortOrderAscCodeAsc()
                : categoryRepository.findByActiveTrueOrderBySortOrderAscCodeAsc();
    }

    public Category createCategory(CategoryDto dto) {
        if (dto == null
                || dto.getCode() == null || dto.getCode().trim().isEmpty()
                || dto.getNameTh() == null || dto.getNameTh().trim().isEmpty()
                || dto.getNameEn() == null || dto.getNameEn().trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category code, nameTh, and nameEn are required."
            );
        }

        String normalizedCode = dto.getCode().trim().toUpperCase(Locale.ROOT);
        Optional<Category> existing = categoryRepository.findByCodeIgnoreCase(normalizedCode);

        if (existing.isPresent()) {
            Category cat = existing.get();
            if (cat.isActive()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Category code already exists: " + normalizedCode
                );
            }
            cat.setNameTh(dto.getNameTh().trim());
            cat.setNameEn(dto.getNameEn().trim());
            cat.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : cat.getSortOrder());
            cat.setActive(dto.getActive() != null ? dto.getActive() : true);
            return categoryRepository.save(cat);
        }

        int sortOrder = dto.getSortOrder() != null
                ? dto.getSortOrder()
                : (int) categoryRepository.count() + 1;
        boolean active = dto.getActive() == null || dto.getActive();
        Category category = new Category(
                normalizedCode,
                dto.getNameTh().trim(),
                dto.getNameEn().trim(),
                sortOrder,
                active
        );
        return categoryRepository.save(category);
    }

    public Category updateCategory(String code, CategoryDto dto) {
        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category payload is required.");
        }
        Category category = categoryRepository.findByCodeIgnoreCase(code == null ? "" : code.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Category not found: " + code
                ));

        if (dto.getNameTh() != null && !dto.getNameTh().trim().isEmpty()) {
            category.setNameTh(dto.getNameTh().trim());
        }
        if (dto.getNameEn() != null && !dto.getNameEn().trim().isEmpty()) {
            category.setNameEn(dto.getNameEn().trim());
        }
        if (dto.getSortOrder() != null) {
            category.setSortOrder(dto.getSortOrder());
        }
        if (dto.getActive() != null) {
            category.setActive(dto.getActive());
        }
        return categoryRepository.save(category);
    }

    public void deleteCategory(String code, boolean hard) {
        Category category = categoryRepository.findByCodeIgnoreCase(code == null ? "" : code.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Category not found: " + code
                ));

        if (hard) {
            categoryRepository.delete(category);
            return;
        }
        category.setActive(false);
        categoryRepository.save(category);
    }

    /**
     * Validate and normalize an incoming item category against active database categories.
     * Supports legacy Thai category names by resolving them to their canonical uppercase codes.
     */
    public String validateAndNormalizeCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is required.");
        }

        String trimmed = rawCategory.trim();
        String mappedLegacy = LEGACY_THAI_TO_CODE.get(trimmed);
        String candidateCode = (mappedLegacy != null ? mappedLegacy : trimmed).toUpperCase(Locale.ROOT);

        if (categoryRepository.count() == 0) {
            return candidateCode;
        }

        Optional<Category> matched = categoryRepository.findByCodeIgnoreCase(candidateCode);
        if (matched.isEmpty()) {
            matched = categoryRepository.findAll().stream()
                    .filter(c -> trimmed.equalsIgnoreCase(c.getNameTh()) || trimmed.equalsIgnoreCase(c.getNameEn()))
                    .findFirst();
        }

        Category category = matched.orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid or inactive category: " + rawCategory
        ));

        if (!category.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or inactive category: " + rawCategory
            );
        }

        return category.getCode();
    }
}
