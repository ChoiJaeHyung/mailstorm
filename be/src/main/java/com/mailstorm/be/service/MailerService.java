package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailAbFollowUp;
import com.mailstorm.be.global.TrackerJwtUtil;
import com.mailstorm.be.repository.MailAbFollowUpRepository;
import io.micrometer.core.instrument.Counter;
import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailerService {

    private static final String CAMPAIGN_STATUS_SENT = "sent";
    private static final String CAMPAIGN_STATUS_PARTIAL = "partial";
    private static final String CAMPAIGN_STATUS_TEST = "test";
    private static final String SUCCESS_MESSAGE = "메시지 전송 완료";
    private static final String NO_CAMPAIGN_MESSAGE = "캠페인/콘텐츠 정보 없음";
    private static final String NO_RECIPIENTS_MESSAGE = "수신자 없음";
    private static final String SUCCESS_BATCH = "예약발송 등록 성공";

    private final JdbcTemplate jdbcTemplate;
    private final HtmlTrackingProcessor htmlTrackingProcessor;

    private JavaMailSenderImpl mailSender;

    private final MailAbFollowUpRepository mailAbrepo;

    @Value("${app.smtp.host}")
    private String smtpHost;

    @Value("${app.smtp.port}")
    private int smtpPort;

    @Value("${app.receive-url}")
    private String receiveUrl;

    @Value("${app.smtp.username}")
    private String smtpUsername;

    @Value("${app.smtp.password}")
    private String smtpPassword;

    @Value("${app.smtp.auth:false}")
    private boolean smtpAuth;

    @PostConstruct
    public void setupTransporter() {
        mailSender = new JavaMailSenderImpl();
        mailSender.setHost(smtpHost);
        mailSender.setPort(smtpPort);
        mailSender.setDefaultEncoding(StandardCharsets.UTF_8.name());

        Properties props = mailSender.getJavaMailProperties();

        props.put("mail.smtp.auth", smtpUsername != null && !smtpUsername.isBlank() ? "true" : "false");
        props.put("mail.smtp.starttls.enable", smtpPort == 587 ? "true" : "false");
        props.put("mail.smtp.starttls.required", smtpPort == 587 ? "true" : "false");

        // nodemailer와 동일하게 인증서 무시
        props.put("mail.smtp.ssl.trust", "*");
        props.put("mail.smtp.ssl.checkserveridentity", "false");

        // EHLO에 사용할 이름 지정 (nodemailer의 `name` 대응)
        props.put("mail.smtp.localhost", "mail.rsup.io");

        // 커넥션 풀 설정 (nodemailer와 비슷한 목적)
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
    }

    // 예약발송 전용
    public void sendBatchMail(Long campaignId) {
        try {
            Optional<CampaignData> campaignData = fetchCampaignData(campaignId);
            if (campaignData.isEmpty()) {
                return;
            }
            CampaignData c = campaignData.get();

            MailGroup mailGroup = fetchMailGroup(c.groupId());
            List<Recipient> recipients = fetchRecipients(c.groupId());

            if (recipients.isEmpty()) {
                return;
            }

            // 발송 시작 시간 기록
            updateSendStartTime(campaignId);

            MailSendResult result = sendMailsToRecipients(c, mailGroup, recipients);

            if (result.success() > 0) {
                updateCampaignStatus(campaignId, CAMPAIGN_STATUS_SENT);
            }
        } catch (Exception e) {
            log.error("sendBatchMail({}) - error", campaignId, e);
            throw new RuntimeException(e);
        }
    }

    // 예약발송 버튼 클릭시 최초 인입
    public Map<String, Object> sendByCampaignIdBacth(Long campaignId, LocalDateTime executeAt, LocalDateTime execute2At){
        try{
            Optional<CampaignData> campaignData = fetchCampaignData(campaignId);
            if (campaignData.isEmpty()) {
                return createResultMap(0, 0, NO_CAMPAIGN_MESSAGE);
            }
            CampaignData c = campaignData.get();

            MailAbFollowUp follow = new MailAbFollowUp();
            follow.setCampaignId(campaignId);
            follow.setType("B");

            if (c.abTest()){ //AB테스트 발송
                follow.setAbType(c.abType());
                follow.setExecuteAt(executeAt);
                if(c.abType() == 3){
                    follow.setExecute2At(execute2At);
                } else {
                    LocalDateTime winnerSendAt = plusByUnit(executeAt, c.dailyUnitA, c.dailyValueA);
                    follow.setExecute2At(winnerSendAt);
                }
            } else { // 일반발송
                follow.setAbType(0L);
                follow.setExecuteAt(executeAt);
            }

            mailAbrepo.save(follow);
            updateCampaignStatus(campaignId, CAMPAIGN_STATUS_PARTIAL);
            return createResultMap(0, 0, SUCCESS_BATCH);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Map<String, Object> sendByCampaignId(Long campaignId) {
        Optional<CampaignData> campaignData = fetchCampaignData(campaignId);
        if (campaignData.isEmpty()) {
            return createResultMap(0, 0, NO_CAMPAIGN_MESSAGE);
        }
        CampaignData c = campaignData.get();

        MailGroup mailGroup = fetchMailGroup(c.groupId());
        List<Recipient> recipients = fetchRecipients(c.groupId());

        if (recipients.isEmpty()) {
            return createResultMap(0, 0, NO_RECIPIENTS_MESSAGE);
        }

        // 발송 시작 시간 기록
        updateSendStartTime(campaignId);

        MailSendResult result = sendMailsToRecipients(c, mailGroup, recipients);

//        if (result.success() > 0) {
//            updateCampaignStatus(campaignId);
//        }
        // ✅ 상태 업데이트: AB 여부/발송 범위에 따라 분기
        if (Boolean.TRUE.equals(c.abTest())) {
            int total = recipients.size();
            long ratio = c.testRatio() == null ? 0 : Math.max(0, Math.min(100, c.testRatio()));
            int testCount = (int) Math.round(total * (ratio / 100.0));
            if (testCount > 0 && result.success() > 0) {
                // 테스트 샷을 실제로 보냈으면 test 상태로
                updateCampaignStatus(campaignId, CAMPAIGN_STATUS_TEST);
            } else if (result.success() > 0) {
                // testRatio=0 등으로 결국 전체 발송(혹은 AB 미의미) → sent
                updateCampaignStatus(campaignId, CAMPAIGN_STATUS_SENT);
            }
        } else {
            if (result.success() > 0) {
                updateCampaignStatus(campaignId, CAMPAIGN_STATUS_SENT);
            }
        }

        return createResultMap(result.success(), result.failed(), SUCCESS_MESSAGE);
    }

    private Optional<CampaignData> fetchCampaignData(Long campaignId) {
        try {
            List<CampaignData> list =
                    jdbcTemplate.query(SQL_FETCH_CAMPAIGN, CAMPAIGN_MAPPER, campaignId);
            return list.stream().findFirst();
        } catch (Exception e) {
            log.error("fetchCampaignData({}) - error", campaignId, e);
            return Optional.empty();
        }
    }

    private MailGroup fetchMailGroup(Long groupId) {
        Map<String, Object> footer = jdbcTemplate.queryForMap("""
                    SELECT footer_company, footer_from_mail, footer_address, footer_tel
                    FROM mail_groups WHERE id = ?
                """, groupId);

        return new MailGroup(
                (String) footer.getOrDefault("footer_company", ""),
                (String) footer.getOrDefault("footer_from_mail", ""),
                (String) footer.getOrDefault("footer_address", ""),
                (String) footer.getOrDefault("footer_tel", "")
        );
    }

    private List<Recipient> fetchRecipients(Long groupId) {
        List<Map<String, Object>> recipientRows = jdbcTemplate.queryForList("""
                    SELECT id AS recipient_id, email
                    FROM mail_recipients WHERE group_id = ? AND receive = true
                """, groupId);

        return recipientRows.stream()
                .map(row -> new Recipient(
                        ((Number) row.get("recipient_id")).longValue(),
                        (String) row.get("email")
                ))
                .toList();
    }

    private MailSendResult sendMailsToRecipients(CampaignData campaignData, MailGroup mailGroup, List<Recipient> recipients) {
        int success = 0;
        int failed = 0;

        // A/B 테스트가 아닌 경우: 기존 로직 유지
        if (!Boolean.TRUE.equals(campaignData.abTest())) {
            for (Recipient recipient : recipients) {
                try {
                    sendSingleMail(campaignData, mailGroup, recipient);
                    success++;
                } catch (MessagingException | UnsupportedEncodingException e) {
                    failed++;
                    log.error("Send failed to {}", recipient.email(), e);
                }
            }
            return new MailSendResult(success, failed);
        }

        // A/B 테스트 일 경우
        final int total = recipients.size();
        final long ratio = campaignData.testRatio() == null ? 0 : Math.max(0, Math.min(100, campaignData.testRatio()));
        final int testCount = (int) Math.round(total * (ratio / 100.0));

        final int aCount = testCount / 2;
        final int bCount = testCount - aCount;

        for (int i = 0; i < total; i++) {
            Recipient r = recipients.get(i);

            // 테스트 그룹 외: 지금은 발송하지 않음(스킵)
            if (campaignData.abType() != 3){
                if (i >= testCount) {
                    log.debug("Skip(non-test) recipient: {}", r.email());
                    continue;
                }
            }

            boolean useB = (i >= aCount); // 앞쪽 aCount는 A, 이어서 bCount는 B
            try {
                sendSingleMailAB(campaignData, mailGroup, r, useB);
                success++;
            } catch (MessagingException | UnsupportedEncodingException e) {
                failed++;
                log.error("AB send failed to {} (variant={})", r.email(), useB ? "B" : "A", e);
            }
        }

        // 루프 끝나고, 실제 테스트 발송이 1건 이상이면 예약 1회만 생성
        if (testCount > 0 && success > 0) {
            // 이미 스케쥴 발송일 경우 수행하지않음
            if (campaignData.abType() != 3) {
                scheduleAbFollowup(campaignData);
            }
        }
        return new MailSendResult(success, failed);
    }

    private void scheduleAbFollowup(CampaignData c) {
        // delay: daily_unit/value (H/D) — 스케줄 테스트는 제외지만 지연 기준은 A안 값 사용
        long delay = c.dailyValueA() != null ? c.dailyValueA() : 1;
        String unit = c.dailyUnitA() != null ? c.dailyUnitA() : "D";
        log.info("scheduleAbFollowup: cid={}, unit={}, delay={}", c.campaignId(), unit, delay);

        // 1) 기존 예약 존재 여부 로깅
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM mail_ab_follow WHERE campaign_id=?",
                Integer.class, c.campaignId()
        );
        log.info("scheduleAbFollowup: existing rows for cid={} -> {}", c.campaignId(), exists);

        // 2) INSERT (table명/interval 방식 OK)
        final String sql =
                "INSERT INTO mail_ab_follow (campaign_id, ab_type, type, status, execute_at, created_at, updated_at) " +
                        "VALUES (?, ?, 'S', 'PENDING', " +
                        ("H".equals(unit) ? "now() + (? * interval '1 hour')" : "now() + (? * interval '1 day')") +
                        ", now(), now()) " +
                        "ON CONFLICT (campaign_id) DO NOTHING";

        int rows = jdbcTemplate.update(sql, c.campaignId(), c.abType() ,delay);
        log.info("scheduleAbFollowup: inserted rows={}", rows);
    }


    private void sendSingleMailAB(CampaignData campaignData, MailGroup mailGroup, Recipient recipient, boolean useB)
            throws MessagingException, UnsupportedEncodingException {

        long abType = campaignData.abType() == null ? 0 : campaignData.abType();

        // 기본값(항상 기준으로 사용)
        String subject     = campaignData.subject();
        String senderName  = campaignData.senderName();
        String htmlRaw     = campaignData.html();
        String senderEmail = campaignData.senderEmail() != null ? campaignData.senderEmail() : "";
        String previewText = campaignData.previewText() != null ? campaignData.previewText() : "";

        // 테스트 차원만 B로 스왑
        if (useB) {
            if (abType == 1) subject    = campaignData.subjectB();
            if (abType == 2) senderName = campaignData.senderNameB();
            if (abType == 3) {
                // 스케줄 테스트: 콘텐츠/제목/발신자명은 그대로. 발송 타이밍은 별도 로직에서 처리.
                // 여기서는 아무 것도 바꾸지 않습니다.
            }
            if (abType == 4) htmlRaw    = campaignData.htmlB();
        }

        // 안전 폴백 (정말 null이면 빈 문자열로)
        if (subject == null)    subject    = "";
        if (senderName == null) senderName = "";
        if (htmlRaw == null)    htmlRaw    = "";

        // 트래킹 처리
        String processedHtml = htmlTrackingProcessor.processHtml(
                htmlRaw,
                campaignData.campaignId(),
                campaignData.groupId(),
                recipient.id(),
                mailGroup,
                receiveUrl
        );

        // 메일 구성/발송
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(new InternetAddress(senderEmail, senderName, "UTF-8"));
        helper.setTo(recipient.email());
        helper.setSubject(subject);
        helper.setText(previewText, processedHtml);

        setCustomHeaders(message, campaignData.campaignId(), campaignData.groupId(), recipient.id());
        message.setHeader("X-AB-Variant", useB ? "B" : "A");

        mailSender.send(message); // 운영에서 주석 해제
    }

    private void sendSingleMail(CampaignData campaignData, MailGroup mailGroup, Recipient recipient) throws MessagingException, UnsupportedEncodingException {
        String processedHtml = htmlTrackingProcessor.processHtml(
                campaignData.html(),
                campaignData.campaignId(),
                campaignData.groupId(),
                recipient.id(),
                mailGroup,
                receiveUrl
        );

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        //helper.setFrom(campaignData.senderEmail());
        helper.setFrom(
                new InternetAddress(
                        campaignData.senderEmail(),
                        campaignData.senderName(),  // 예: "홍길동"
                        "UTF-8"
                )
        );
        helper.setTo(recipient.email());
        helper.setSubject(campaignData.subject());
        helper.setText(campaignData.previewText(), processedHtml);

        setCustomHeaders(message, campaignData.campaignId(), campaignData.groupId(), recipient.id());

        mailSender.send(message);
    }

    private void setCustomHeaders(MimeMessage message, Long campaignId, Long groupId, Long recipientId) throws MessagingException {
        message.setHeader("X-Campaign-ID", String.valueOf(campaignId));
        message.setHeader("X-Group-ID", String.valueOf(groupId));
        message.setHeader("X-Recipient-ID", String.valueOf(recipientId));
    }

    public void runAbInitialTest (Long campaignId) {
        Optional<CampaignData> campaignData = fetchCampaignData(campaignId);
        if (campaignData.isEmpty()) {
            return;
        }
        CampaignData c = campaignData.get();

        MailGroup mailGroup = fetchMailGroup(c.groupId());
        List<Recipient> recipients = fetchRecipients(c.groupId());

        if (recipients.isEmpty()) {
            return;
        }

        // 발송 시작 시간 기록
        updateSendStartTime(campaignId);

        int total = recipients.size();
        long ratio = c.testRatio() == null ? 0 : Math.max(0, Math.min(100, c.testRatio()));
        int testCount = (int) Math.round(total * (ratio / 100.0));

        int aCount = testCount / 2;
        int bCount = testCount - aCount;

        for (int i = 0; i < total; i++) {
            Recipient r = recipients.get(i);

            // 테스트 그룹 외: 지금은 발송하지 않음(스킵)
            if (c.abType() != 3) {
                if (i >= testCount) {
                    log.debug("Skip(non-test) recipient: {}", r.email());
                    continue;
                }
            }

            boolean useB = (i >= aCount); // 앞쪽 aCount는 A, 이어서 bCount는 B
            try {
                sendSingleMailAB(c, mailGroup, r, useB);
            } catch (MessagingException | UnsupportedEncodingException e) {
                log.error("AB send failed to {} (variant={})", r.email(), useB ? "B" : "A", e);
            }
        }
    }
    // abtype:3 예약발송 전용
    public void runAbBatch(Long campaignId, boolean useB) throws Exception {
        // 1) 캠페인 로드
        CampaignData c = fetchCampaignData(campaignId)
                .orElseThrow(() -> new IllegalStateException("Campaign not found: " + campaignId));

        MailGroup mailGroup = fetchMailGroup(c.groupId());
        List<Recipient> recipients = fetchRecipients(c.groupId());

        if (recipients.isEmpty()) {
            log.info("No remaining recipients for campaign. {}", c.groupId());
            return;
        }

        // 발송 시작 시간 기록
        updateSendStartTime(campaignId);

        // 메일발송
        List<Recipient> targets;
        if (!useB) {
            // A그룹: 단순 50% 분할
            int half = recipients.size() / 2;
            targets = recipients.subList(0, half);
            log.info("Sending AB Variant A. campaignId={}, targetCount={}", campaignId, targets.size());
        } else {
            // B그룹: mail_logs 기준 A로 발송된 이메일 제외
            Set<Long> alreadySentEmails = fetchAbVariantAEmails(campaignId);
            targets = recipients.stream()
                    .filter(r -> !alreadySentEmails.contains(r.id()))
                    .toList();
            log.info("Sending AB Variant B. campaignId={}, filteredTargetCount={}", campaignId, targets.size());
        }

        int success = 0, failed = 0;
        for (Recipient r : targets) {
            try {
                sendSingleMailAB(c, mailGroup, r, useB); // Variant에 따라 mail 내용 스왑
                success++;
            } catch (Exception e) {
                failed++;
                log.warn("AB Variant {} mail failed to {}: {}", (useB ? "B" : "A"), r.email(), e.getMessage());
            }
        }

        if (!useB && success > 0) {
            updateCampaignStatus(campaignId, CAMPAIGN_STATUS_PARTIAL);
        } else if (useB && success > 0) {
            updateCampaignStatus(campaignId, CAMPAIGN_STATUS_SENT);
        }

        log.info("AB Variant {} finished. success={}, failed={}", (useB ? "B" : "A"), success, failed);
    }

    // abtype: 1,2,4 승자선정 발송 전용
    public void runAbFollowup(Long campaignId) throws Exception {
        // 1) 캠페인 로드
        CampaignData c = fetchCampaignData(campaignId)
                .orElseThrow(() -> new IllegalStateException("Campaign not found: " + campaignId));

        // A/B 미사용이면 패스(아무 작업 안 함)
        if (!Boolean.TRUE.equals(c.abTest())) {
            log.info("Campaign {} is not in A/B test. Skip follow-up.", campaignId);
            return;
        }

        // 2) 승자 산정 (open 기준: 필요시 클릭으로 변경)
        String winner = pickWinnerVariantByOpen(campaignId); // "A" or "B"
        boolean useB = "B".equals(winner);

        // 3) 잔여 대상 추출 (이미 보낸 사람 제외)
        List<Recipient> remain = fetchRemainingRecipients(campaignId, c.groupId());
        if (remain.isEmpty()) {
            log.info("No remaining recipients for campaign {}", campaignId);
            return;
        }

        // 4) 승자 변형으로 발송
        MailGroup g = fetchMailGroup(c.groupId());
        int success = 0, failed = 0;

        for (Recipient r : remain) {
            try {
                // WINNER 단계 헤더로 발송
                sendSingleMailWinner(c, g, r, useB);
                success++;
            } catch (MessagingException | UnsupportedEncodingException e) {
                failed++;
                log.error("Winner resend failed to {}", r.email(), e);
            }
        }

        if (success > 0) {
            updateCampaignStatus(campaignId, CAMPAIGN_STATUS_SENT);
        }

        log.info("Follow-up done. campaign={}, winner={}, success={}, failed={}",
                campaignId, winner, success, failed);
    }

    // mai_logs 에서 A 발송내역 조회
    private Set<Long> fetchAbVariantAEmails(Long campaignId) {
        String sql = """
        SELECT DISTINCT recipient_id
        FROM mail_logs
        WHERE campaign_id = ? AND ab_variant = 'A'
    """;

        return new HashSet<>(jdbcTemplate.queryForList(sql, Long.class, campaignId));
    }

    // 승자 산정 (open 기준)
    String pickWinnerVariantByOpen(Long campaignId) {
        Integer openA = jdbcTemplate.queryForObject("""
        SELECT COUNT(DISTINCT t.recipient_id)
          FROM mail_logs l
          JOIN mail_tracker t
            ON t.campaign_id = l.campaign_id
           AND t.recipient_id = l.recipient_id
           AND t.type = 'open'
         WHERE l.campaign_id = ?
           AND l.ab_variant = 'A'
    """, Integer.class, campaignId);

        Integer openB = jdbcTemplate.queryForObject("""
        SELECT COUNT(DISTINCT t.recipient_id)
          FROM mail_logs l
          JOIN mail_tracker t
            ON t.campaign_id = l.campaign_id
           AND t.recipient_id = l.recipient_id
           AND t.type = 'open'
         WHERE l.campaign_id = ?
           AND l.ab_variant = 'B'
    """, Integer.class, campaignId);

        int a = openA == null ? 0 : openA;
        int b = openB == null ? 0 : openB;
        if (a == b) return "A";
        return (b > a) ? "B" : "A";
    }

    // 잔여 대상(아직 mail_logs에 없는)
    List<Recipient> fetchRemainingRecipients(Long campaignId, Long groupId) {
        List<Long> sent = jdbcTemplate.queryForList(
                "SELECT DISTINCT recipient_id FROM mail_logs WHERE campaign_id=?",
                Long.class, campaignId
        );
        var sentSet = new java.util.HashSet<>(sent);
        List<Recipient> all = fetchRecipients(groupId);
        return all.stream().filter(r -> !sentSet.contains(r.id())).toList();
    }

    // 승자(WINNER) 발송(헤더 구분)
    void sendSingleMailWinner(CampaignData c, MailGroup g, Recipient r, boolean useB)
            throws MessagingException, UnsupportedEncodingException {

        long abType = c.abType() == null ? 0 : c.abType();
        String subject    = c.subject();
        String senderName = c.senderName();
        String htmlRaw    = c.html();

        if (useB) {
            if (abType == 1) subject    = c.subjectB();
            if (abType == 2) senderName = c.senderNameB();
            if (abType == 4) htmlRaw    = c.htmlB();
        }

        if (subject == null) subject = "";
        if (senderName == null) senderName = "";
        if (htmlRaw == null) htmlRaw = "";

        String senderEmail = c.senderEmail() != null ? c.senderEmail() : "";
        String previewText = c.previewText() != null ? c.previewText() : "";

        String processedHtml = htmlTrackingProcessor.processHtml(
                htmlRaw, c.campaignId(), c.groupId(), r.id(), g, receiveUrl
        );

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(new InternetAddress(senderEmail, senderName, "UTF-8"));
        helper.setTo(r.email());
        helper.setSubject(subject);
        helper.setText(previewText, processedHtml);

        setCustomHeaders(message, c.campaignId(), c.groupId(), r.id());
        message.setHeader("X-AB-Variant", useB ? "B" : "A");
        message.setHeader("X-AB-Phase",   "WINNER");  // ← 밀터가 mail_logs에 단계 저장

        mailSender.send(message);
    }

    private void updateSendStartTime(Long campaignId) {
        jdbcTemplate.update("UPDATE mail_campaigns SET send_date = NOW() WHERE id = ?", campaignId);
    }

    private void updateCampaignStatus(Long campaignId, String status) {
        jdbcTemplate.update("UPDATE mail_campaigns SET status = ?, end_date = NOW() WHERE id = ?",
                status, campaignId);
    }

    private Map<String, Object> createResultMap(int success, int failed, String message) {
        return Map.of("success", success, "failed", failed, "message", message);
    }

    record MailGroup(
            String footerCompany,
            String footerFromMail,
            String footerAddress,
            String footerTel
    ) {
    }

    private record Recipient(Long id, String email) {
    }

    private record MailSendResult(int success, int failed) {
    }

    private static final String SQL_FETCH_CAMPAIGN = """
        SELECT
          a.id                             AS campaign_id,
          a.group_id                       AS group_id,
          b.ab_test                        AS ab_test,
          b.ab_type                        AS ab_type,
          b.test_ratio                     AS test_ratio,
          b.daily_unit     AS daily_unit_a,
          b.daily_value    AS daily_value_a,
          b.daily_unitB    AS daily_unit_b,
          b.daily_valueB   AS daily_value_b,
          b.subject        AS subject,
          b.subjectB       AS subject_b,
          b.sender_name    AS sender_name,
          b.sender_nameB   AS sender_name_b,
          b.preview_text   AS preview_text,
          b.sender_email   AS sender_email,
          c.html           AS html,
          c.htmlB          AS html_b
        FROM mail_campaigns a
        LEFT JOIN mail_sendinfo  b ON a.id = b.campaign_id
        LEFT JOIN mail_contents  c ON a.id = c.campaign_id
        WHERE a.id = ?
    """;

    public record CampaignData(
            Long campaignId,
            Long groupId,
            Boolean abTest,
            Long abType,
            Long testRatio,
            String dailyUnitA,
            Long dailyValueA,
            String dailyUnitB,
            Long dailyValueB,
            String subject,
            String subjectB,
            String senderName,
            String senderNameB,
            String previewText,
            String senderEmail,
            String html,
            String htmlB
    ) {}

    private static Long nlLong(ResultSet rs, String col) throws SQLException {
        Long v = rs.getObject(col, Long.class);
        return v;
    }
    private static Integer nlInt(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, Integer.class);
    }
    private static Boolean nlBool(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, Boolean.class);
    }
    private static String nlStr(ResultSet rs, String col) throws SQLException {
        String s = rs.getString(col);
        return (s != null) ? s : null;
    }
    // 단위/값을 LocalDateTime에 더해주는 헬퍼
    private LocalDateTime plusByUnit(LocalDateTime base,
                                     String unit, Long value) {
        if (base == null || unit == null || value == null) return null;
        if (value <= 0) return base; // 0 이하이면 그대로 둠(원하면 null 반환도 가능)

        return switch (unit) {
            case "H" -> base.plusHours(value);
            case "D" -> base.plusDays(value);
            default  -> base; // 정의되지 않은 단위는 무시 (또는 예외)
        };
    }

    private static final RowMapper<CampaignData> CAMPAIGN_MAPPER = (rs, rowNum) -> new CampaignData(
            nlLong(rs, "campaign_id"),
            nlLong(rs, "group_id"),
            nlBool(rs, "ab_test"),
            nlLong(rs, "ab_type"),
            nlLong(rs, "test_ratio"),
            nlStr(rs, "daily_unit_a"),
            nlLong(rs, "daily_value_a"),
            nlStr(rs, "daily_unit_b"),
            nlLong(rs, "daily_value_b"),
            nlStr(rs, "subject"),
            nlStr(rs, "subject_b"),
            nlStr(rs, "sender_name"),
            nlStr(rs, "sender_name_b"),
            nlStr(rs, "preview_text"),
            nlStr(rs, "sender_email"),
            nlStr(rs, "html"),
            nlStr(rs, "html_b")
    );
}
