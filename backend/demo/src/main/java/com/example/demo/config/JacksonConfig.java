package com.example.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.format.DateTimeFormatter;

@Configuration
public class JacksonConfig {

    /**
     * สร้างและตั้งค่า ObjectMapper เป็น Bean หลักของระบบ (@Primary)
     * เพื่อปรับแต่งการแปลงวัตถุ (Object) ให้เป็น JSON และในทางกลับกัน 
     * โดยเน้นการจัดฟอร์แมตข้อมูลประเภทวันที่และเวลา (DateTime) ให้เป็นมาตรฐานสากล
     */
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        
        // ปิดการแปลง Date เป็น Timestamps (ตัวเลข Unix)
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // กำหนดรูปแบบ Formatter ให้ LocalDateTime เติม 'Z' ต่อท้ายเสมอเมื่อแปลงเป็น JSON
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        javaTimeModule.addSerializer(java.time.LocalDateTime.class, new LocalDateTimeSerializer(formatter));
        
        mapper.registerModule(javaTimeModule);

        return mapper;
    }
}