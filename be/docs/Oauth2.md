# 인증 및 보안

OAuth2 콜백 기반 인증 시스템의 핵심 패턴을 설명함

외부 유입전용 토큰 설명

## 🔐 시스템 개요

### 인증 플로우
```
인증토큰 획득 → /auth/callback?token=xxx → JWT 토큰 반환 → 홈으로 이동
```

### 주요 구성 요소
- **authStore (Zustand)** - 토큰 저장/관리 (쿠키)
- **axios 인터셉터** - 자동 토큰 첨부
- **페이지 접근 제어** - Router 제어
- **OAuth 콜백** - 토큰 처리
- **사용자 Context** - 사용자 정보 관리

---

## 🔧 백엔드

### 인증 토큰 획득
    @GetMapping("/google")
        public Map<String, String> getGoogleLoginUrl() {
            String url = "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=" + googleClientId +
            "&redirect_uri=" + URLEncoder.encode(googleRedirectUri, StandardCharsets.UTF_8) +
            "&response_type=code" +
            "&scope=openid%20email%20profile";
        return Map.of("url", url);
    }

### /auth/callback?token=xxx
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
                System.out.println("redirectUrl: " + redirectUrl);
                response.sendRedirect(redirectUrl);
            } catch (Exception e) {
                String reason = URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
                response.sendRedirect(errorRedirectUri + "?reason=" + reason);
        }
    }

### 토큰체크 && 예외 URI
global/JwtAuthenticationFilter.java

    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
    FilterChain filterChain) throws ServletException, IOException {
        // tracker 경로는 인증 필터 건너뜀
        String uri = request.getRequestURI();
        if (uri.startsWith("/tracker")) {
        filterChain.doFilter(request, response);
        return;
    }

### 유저정보 확인
global/JwtTokenProvider.java

    public String getUserId(String token) {
        return Jwts.parserBuilder()
        .setSigningKey(signingKey)
        .build()
        .parseClaimsJws(token)
        .getBody()
        .getSubject();
    }

### 외부유입 전용 토큰
global/TrackerJwtUtil.java

    public String generateTrackingToken(Long cid, Long gid, Long rid) {
    public TrackingInfo verifyTrackingToken(String token) {

### 외부유입 토큰 체크 예시
controller/MailTrackerController

사용자가 메일을 확인 시 호출하는 메소드 

    @GetMapping("/open")
    public ResponseEntity<String> open(@RequestParam String token) {
        try {
            var decoded = trackerJwtUtil.verifyTrackingToken(sanitizeToken(token));
            mailTrackerService.logEvent("open", decoded.cid(), decoded.gid(), decoded.rid(), null);
            log.info("Open tracked: {}", decoded);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("JWT 검증 에러", e);
            return ResponseEntity.badRequest().body("Invalid token");
        }
    }