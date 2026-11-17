package com.example.demo.controller;

import com.example.demo.dto.CategoryDto;
import com.example.demo.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("${app.api.categories-path:/api/categories}")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<CategoryDto>> getCategories(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        List<CategoryDto> result = categoryService.getCategories(includeInactive)
                .stream()
                .map(CategoryDto::fromEntity)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<CategoryDto> createCategory(@RequestBody CategoryDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CategoryDto.fromEntity(categoryService.createCategory(dto)));
    }

    @PutMapping("/{code}")
    public ResponseEntity<CategoryDto> updateCategory(
            @PathVariable String code,
            @RequestBody CategoryDto dto) {
        return ResponseEntity.ok(
                CategoryDto.fromEntity(categoryService.updateCategory(code, dto))
        );
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Map<String, Object>> deleteCategory(
            @PathVariable String code,
            @RequestParam(defaultValue = "false") boolean hard) {
        categoryService.deleteCategory(code, hard);
        return ResponseEntity.ok(Map.of(
                "code", code == null ? "" : code.trim().toUpperCase(Locale.ROOT),
                "deleted", true,
                "hard", hard
        ));
    }
}
