package com.example.demo.dto;

import com.example.demo.model.Category;

public class CategoryDto {
    private String code;
    private String nameTh;
    private String nameEn;
    private Integer sortOrder;
    private Boolean active;

    public CategoryDto() {}

    public CategoryDto(String code, String nameTh, String nameEn, Integer sortOrder, Boolean active) {
        this.code = code;
        this.nameTh = nameTh;
        this.nameEn = nameEn;
        this.sortOrder = sortOrder;
        this.active = active;
    }

    public static CategoryDto fromEntity(Category category) {
        return new CategoryDto(
                category.getCode(),
                category.getNameTh(),
                category.getNameEn(),
                category.getSortOrder(),
                category.isActive()
        );
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNameTh() {
        return nameTh;
    }

    public void setNameTh(String nameTh) {
        this.nameTh = nameTh;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
