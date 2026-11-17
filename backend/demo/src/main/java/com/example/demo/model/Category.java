package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @Column(name = "code", length = 50, nullable = false, updatable = false)
    private String code;

    @Column(name = "name_th", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String nameTh;

    @Column(name = "name_en", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String nameEn;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public Category() {}

    public Category(String code, String nameTh, String nameEn, Integer sortOrder, boolean active) {
        this.code = normalizeCode(code);
        this.nameTh = nameTh;
        this.nameEn = nameEn;
        this.sortOrder = sortOrder != null ? sortOrder : 0;
        this.active = active;
    }

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.code = normalizeCode(this.code);
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
    }

    private static String normalizeCode(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = normalizeCode(code);
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
        this.sortOrder = sortOrder != null ? sortOrder : 0;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
