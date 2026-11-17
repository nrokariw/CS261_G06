package com.example.demo.config;

import com.example.demo.model.Category;
import com.example.demo.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(2)
public class CategorySeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CategorySeeder.class);

    private final CategoryRepository categoryRepository;

    public CategorySeeder(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(String... args) {
        seedDefaultCategoriesIfEmpty();
    }

    /**
     * Seed default categories only when the table is empty so deleted categories
     * are not silently re-created across restarts.
     */
    public void seedDefaultCategoriesIfEmpty() {
        if (categoryRepository.count() > 0) {
            log.info("[CategorySeeder] Categories table already populated ({} records).", categoryRepository.count());
            return;
        }

        List<Category> defaults = List.of(
                new Category("STUDY", "อุปกรณ์การเรียน", "Study Materials", 1, true),
                new Category("ELECTRONICS", "อุปกรณ์อิเล็กทรอนิกส์", "Electronics", 2, true),
                new Category("SPORTS", "อุปกรณ์กีฬา", "Sports Gear", 3, true),
                new Category("GENERAL", "ของใช้ทั่วไป", "General Items", 4, true)
        );
        categoryRepository.saveAll(defaults);
        log.info("[CategorySeeder] Seeded {} default categories.", defaults.size());
    }
}
