package com.mailstorm.be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mailstorm.be.domain.User;
import com.mailstorm.be.global.JwtTokenProvider;
import com.mailstorm.be.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${google.client-id}")
    private String clientId;

    @Value("${google.client-secret}")
    private String clientSecret;

    @Value("${google.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> handleGoogleLogin(String code) {
        // 1. 토큰 교환 요청
        String tokenUrl = "https://oauth2.googleapis.com/token";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("code", code);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("redirect_uri", redirectUri);
        formData.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(formData, headers);

        ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, request, Map.class);
        String idToken = (String) response.getBody().get("id_token");
        if (idToken == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google 토큰 수신 실패");
        }

        // 2. id_token 디코딩
        Map<String, Object> decoded = decodeJwt(idToken);
        String email = (String) decoded.get("email");
        String name = (String) decoded.get("name");

        if (email == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google 로그인 실패: 이메일 없음");
        }

        // 3. 사용자 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "등록되지 않은 계정입니다."));

        if (!"google".equals(user.getProvider())) {
            throw new ResponseStatusException(UNAUTHORIZED, "인증 정보가 일치하지 않습니다.");
        }

        // 4. JWT 생성
        String token = jwtTokenProvider.createToken(user);

        // 5. 반환
        return Map.of(
                "accessToken", token,
                "user", user
        );
    }

    private Map<String, Object> decodeJwt(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2) throw new IllegalArgumentException("잘못된 토큰 형식");

        byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
        String payload = new String(decodedBytes, StandardCharsets.UTF_8);

        try {
            return objectMapper.readValue(payload, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("토큰 디코딩 실패", e);
        }
    }

    private String serializeUser(User user) {
        try {
            return objectMapper.writeValueAsString(user);
        } catch (Exception e) {
            return "{}";
        }
    }
}
