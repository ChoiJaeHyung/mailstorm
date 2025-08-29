# 백엔드 개발 가이드

## 목차
- [프로젝트 폴더 구조] 
- [계층구조 및 역할 정의]
- [공통 설정 예시]
- [OpenAPI(Swagger)]


## 프로젝트 폴더 구조

    src
    ├── main
    │   ├── java/com/mailstorm/be
    │   │   ├── MailStormBeApplication.java         # Main Application Entry
    │   │   ├── controller                          # API Layer
    │   │   ├── domain                              # Entity Layer
    │   │   ├── dto                                 # DTO
    │   │   ├── global                              # 공통/보안/인증 
    │   │   ├── repository                          # Persistence Layer
    │   │   ├── service                             # Business Login Layer
    │   └── resources
    │       ├── application.yml
    │       └── logback-spring.xml
    └── test

## 계층구조 및 역할 정의

### 컨트롤러
- API Endpoint 정의 및 요청/응답 처리 담당
- 핵심 비즈니스 로직은 절대 작성하지 않고, Service에 위임
- 기본적인 CRUD는 Repository 사용 가능
```Controller
    @RestController
    @RequestMapping("/mail-campaigns")
    @RequiredArgsConstructor
    public class MailCampaignsController {
    
        private final MailCampaignService service;
        private final MailCampaignRepository repo;
    
        @PostMapping
        @ResponseStatus(HttpStatus.CREATED)
        public MailCampaign create(@RequestBody CreateMailCampaignDto dto) {
            return service.create(dto);
        }
        ........
    }
```
### 서비스
- 실제 비즈니스 로직 처리
- 트랜잭션 범위 관리 (@Transactional)
- 도메인 간 통합 로직, 조건 분기, 유효성 체크 포함
- 외부 API 연동 포함 가능
```Service
    @Service
    @RequiredArgsConstructor
    public class MailCampaignService {
        @Transactional
        public MailCampaign create(CreateMailCampaignDto dto) {
            ObjectMapper mapper = new ObjectMapper();
            MailCampaign campaign = new MailCampaign();
            campaign.setName(dto.getName());
            campaign.setDescription(dto.getDescription());
            campaign.setUserId(dto.getUserId());
            campaign.setGroupId(dto.getGroupId());
    
            campaign = campaignRepo.save(campaign);
            ........
```

### Domain
- JPA 엔티티 정의
```Domain
    @Entity
    @Table(name = "mail_campaigns")
    @Getter
    @Setter
    @NoArgsConstructor
    public class MailCampaign {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
    
        @Column(nullable = false, columnDefinition = "text")
        private String name;
        ........
```

### Repository
- JPA 또는 QueryDSL 기반 데이터 액세스
- 단순 쿼리는 JpaRepository 상속으로 처리
- 복잡한 SQL은 @Query or NativeQuery 활용
```Repository
    public interface MailCampaignRepository extends JpaRepository<MailCampaign, Long> {
        List<MailCampaign> findByUserIdOrderByCreatedAtDesc(Long userId);
    }
```

### DTO
- lombok @DATA 어노테이션을 통해 Getter/Setter 
```DTO
    @Data
    public class CreateMailCampaignDto {
        private String name;
        private String description;
        private Long userId;
        private Long groupId;
    }
```

## 공통 설정 예시

### 🔐 보안 설정 (WebToken, TrackingToken)

#### WebToken (AccessToken/JWT)
- 클라이언트의 인증 상태 유지를 위한 JWT 토큰 설정
- 일반 사용자 인증 토큰으로, 요청 시 Authorization: Bearer {token} 헤더 사용 
- 만료시간은 짧게 설정 (예: 30분)

#### TrackingToken (메일 수신자 트래킹용)
- 이메일 오픈, 클릭, 수신거부 등 행동 추적을 위한 특수 토큰
- 일반 인증 토큰과 분리하여 긴 유효기간 유지 (예: 30일)
- 토큰 구조: cid, gid, rid 정보를 포함하고 서명된 JWT 형태

#### 구현 포인트
- JwtTokenUtil → AccessToken 발급/검증

#### CORS 설정
- 프론트엔드(React 등)에서 API 서버로의 교차 출처 요청을 허용하기 위한 설정
- WebMvcConfigurer를 구현하여 특정 Origin만 허용
```CORS
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(corsProperties.getAllowedOrigins().toArray(new String[0]))
                        .allowedMethods("*")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
```

####  GC Metrics 등록 (GcMetricsRegister)
- JVM GC 및 힙 메모리 사용량 등을 Prometheus로 수집하기 위한 설정
```
  @Component
  public class GcMetricsRegistrar {

  private final MeterRegistry registry;

  public GcMetricsRegistrar(MeterRegistry registry) {
    this.registry = registry;
  }

  @PostConstruct
      public void bindGcMetrics() {
      new JvmGcMetrics().bindTo(registry);
      }
  }
```

### OpenAPI(Swagger)
- API 문서 자동 생성 및 UI 제공을 위한 설정
- 사용 라이브러리: springdoc-openapi-starter-webmvc-ui
- 접근 경로: /swagger-ui.html 혹은 리다이렉트 /docs
```
springdoc:
    swagger-ui:
        path: "/docs"
    api-docs:
        enabled: true
    override-with-generic-response: false
```
