package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailLog;
import com.mailstorm.be.dto.MailSendRequest;
import com.mailstorm.be.service.MailerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailerService mailerService;

    @PostMapping("/send")
    public ResponseEntity<?> sendMail(@RequestBody MailSendRequest req) {
        if (req.getCampaignId() == null) {
            return ResponseEntity.badRequest().body("campaignId가 필요합니다.");
        }

        try {
            LocalDateTime execAt = parseToKstLocalDateTime(req.getExecuteAt());
            LocalDateTime exec2At = parseToKstLocalDateTime(req.getExecute2At());

            if (req.getType().equals("S")) {
                return ResponseEntity.ok(
                        mailerService.sendByCampaignId(req.getCampaignId())
                );
            } else {
                return ResponseEntity.ok(
                        mailerService.sendByCampaignIdBacth(req.getCampaignId(), execAt, exec2At)
                );
            }

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private LocalDateTime parseToKstLocalDateTime(String s) {
        if (s == null || s.isBlank()) return null;

        // 1) 오프셋이 있으면 OffsetDateTime으로
        try {
            OffsetDateTime odt = OffsetDateTime.parse(s, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            return odt.atZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime();
        } catch (DateTimeParseException ignore) {
        }

        // 2) Z로 끝나는 UTC 형태도 허용
        try {
            Instant ins = Instant.parse(s); // e.g. 2025-08-20T11:00:00Z
            return LocalDateTime.ofInstant(ins, ZoneId.of("Asia/Seoul"));
        } catch (DateTimeParseException ignore) {
        }

        // 3) 오프셋이 없으면 로컬(오프셋 없음)로 해석
        try {
            return LocalDateTime.parse(s, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("잘못된 날짜 형식입니다. ISO_OFFSET_DATE_TIME 또는 ISO_LOCAL_DATE_TIME를 사용하세요.");
        }
    }
}