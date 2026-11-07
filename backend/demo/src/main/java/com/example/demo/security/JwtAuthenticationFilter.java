package com.example.demo.security;

import com.example.demo.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtService jwtService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return false;
        }
        return path.endsWith("/auth/login")
                || path.endsWith("/auth/refresh")
                || path.endsWith("/auth/logout");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || authHeader.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "Unauthorized: Invalid Authorization header format");
            return;
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            sendUnauthorized(response, "Unauthorized: Missing JWT token");
            return;
        }

        try {
            Claims claims = jwtService.validateAndExtractClaims(token);
            String studentId = claims.getSubject();
            String role = claims.get("role", String.class);
            String normalizedRole = (role != null && !role.isBlank()) ? role.toUpperCase() : "STUDENT";

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    studentId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + normalizedRole))
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            sendUnauthorized(response, "Unauthorized: Invalid or expired JWT token");
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "error", "401 UNAUTHORIZED",
                "exception", "JwtAuthenticationException",
                "message", message
        ));
    }
}
