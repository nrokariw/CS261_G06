package com.example.demo.config;

import com.example.demo.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CorsProperties corsProperties;
    private final ObjectMapper objectMapper;

    public SecurityConfig(CorsProperties corsProperties, ObjectMapper objectMapper) {
        this.corsProperties = corsProperties;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {

        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    writeJsonError(
                            response,
                            HttpStatus.UNAUTHORIZED,
                            "401 UNAUTHORIZED",
                            "AuthenticationException",
                            "Unauthorized: Missing or invalid JWT Token"
                    );
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    writeJsonError(
                            response,
                            HttpStatus.FORBIDDEN,
                            "FORBIDDEN",
                            "AccessDeniedException",
                            "Forbidden: You do not have permission to perform this action"
                    );
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                .requestMatchers("/uploads/products/**", "/actuator/**", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/items", "/api/items/all", "/api/items/*").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        String[] origins = corsProperties.getProcessedOrigins();
        if (origins != null && origins.length > 0) {
            configuration.setAllowedOrigins(Arrays.asList(origins));
        } else {
            configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private void writeJsonError(
            HttpServletResponse response,
            HttpStatus status,
            String errorCode,
            String exceptionName,
            String message) throws java.io.IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "error", errorCode,
                "exception", exceptionName,
                "message", message
        ));
    }
}
