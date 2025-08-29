package com.mailstorm.be.controller;

import com.mailstorm.be.domain.User;
import com.mailstorm.be.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${google.client-id}")
    private String googleClientId;

    @Value("${google.redirect-uri}")
    private String googleRedirectUri;

    @Value("${google.front-redirect-uri}")
    private String frontRedirectUri;

    @Value("${google.error-redirect-uri}")
    private String errorRedirectUri;

    @GetMapping("/google")
    public Map<String, String> getGoogleLoginUrl() {
        String url = "https://accounts.google.com/o/oauth2/v2/auth?" +
                "client_id=" + googleClientId +
                "&redirect_uri=" + URLEncoder.encode(googleRedirectUri, StandardCharsets.UTF_8) +
                "&response_type=code" +
                "&scope=openid%20email%20profile";
        return Map.of("url", url);
    }

    @GetMapping("/callback")
    public void googleCallback(@RequestParam String code, HttpServletResponse response) throws IOException {
        try {
            Map<String, Object> result = authService.handleGoogleLogin(code);
            String token = (String) result.get("accessToken");
            User user = (User) result.get("user");
            String encodedUser = URLEncoder.encode(
                    String.format("{\"id\":%d,\"email\":\"%s\",\"name\":\"%s\"}",
                            user.getId(), user.getEmail(), user.getName()), StandardCharsets.UTF_8);
            String redirectUrl = frontRedirectUri + "?token=" + token + "&user=" + encodedUser;
            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            String reason = URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            response.sendRedirect(errorRedirectUri + "?reason=" + reason);
        }
    }
}
