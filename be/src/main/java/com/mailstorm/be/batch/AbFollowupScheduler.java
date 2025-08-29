package com.mailstorm.be.batch;

import com.mailstorm.be.service.MailerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AbFollowupScheduler {

    private final JdbcTemplate jdbcTemplate;
    private final MailerService mailerService;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void pollAndRun() {
        LocalDateTime now = LocalDateTime.now();

        // type, ab_type, 두 타임스탬프, status 함께 조회
        List<FollowRow> rows = jdbcTemplate.query(
                "SELECT campaign_id, type, ab_type, execute_at, execute2_at, status " +
                        "FROM mail_ab_follow " +
                        "WHERE status IN ('PENDING','PARTIAL') " +
                        "AND ( (execute_at IS NOT NULL AND execute_at <= now()) " +
                        "   OR (execute2_at IS NOT NULL AND execute2_at <= now()) )",
                (rs, i) -> new FollowRow(
                        rs.getLong("campaign_id"),
                        rs.getString("type"),
                        rs.getLong("ab_type"),
                        toLdt(rs.getTimestamp("execute_at")),
                        toLdt(rs.getTimestamp("execute2_at")),
                        rs.getString("status")
                )
        );

        for (FollowRow row : rows) {
            try {
                switch (row.type()) {
                    case "S" -> handleTypeS(row, now); // 일반 흐름(이미 테스트 발송됨) → 후속만
                    case "B" -> handleTypeB(row, now); // 예약 흐름(테스트/본발송 모두 이 배치에서)
                    default -> log.warn("Unknown type: {} (campaignId={})", row.type(), row.campaignId());
                }
            } catch (Exception ex) {
                log.error("Batch step failed. campaignId={}", row.campaignId(), ex);
                jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='FAILED', updated_at=now() WHERE campaign_id=?",
                        row.campaignId()
                );
            }
        }
    }

    // ---------- type = 'S' ----------
    // 이미 테스트는 발송된 상태. ab_type ∈ {1,2,4} → execute2_at 시 승자 본발송
    private void handleTypeS(FollowRow row, LocalDateTime now) throws Exception {
        // ab_type=3(스케줄 AB)는 이 흐름에서 제외
        if (row.abType() == 3L) return;

        // 일반 후속 본발송: execute2_at due + PENDING/ PARTIAL 둘 다 허용
        if (isDue(row.executeAt(), now) && ("PENDING".equals(row.status()) || "PARTIAL".equals(row.status()))) {
            int claimed = jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='RUNNING', updated_at=now() " +
                            "WHERE campaign_id=? AND status IN ('PENDING','PARTIAL')",
                    row.campaignId()
            );
            if (claimed == 0) return;

            log.info("[S] Winner follow-up run. campaignId={}", row.campaignId());
            mailerService.runAbFollowup(row.campaignId());

            jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='DONE', updated_at=now() WHERE campaign_id=?",
                    row.campaignId()
            );
        }
    }

    // ---------- type = 'B' ----------
    private void handleTypeB(FollowRow row, LocalDateTime now) throws Exception {
        if (row.abType() == 0L) {
            // 일반 예약: execute_at에 전체 발송
            if (isDue(row.executeAt(), now) && "PENDING".equals(row.status())) {
                int claimed = jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='RUNNING', updated_at=now() " +
                                "WHERE campaign_id=? AND status='PENDING'",
                        row.campaignId()
                );
                if (claimed == 0) return;

                log.info("[B/ab0] Scheduled bulk send. campaignId={}", row.campaignId());
                mailerService.sendBatchMail(row.campaignId());

                jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='DONE', updated_at=now() WHERE campaign_id=?",
                        row.campaignId()
                );
            }
            return;
        }

        if (row.abType() == 3L) {
            // 스케줄 AB: A at execute_at → PARTIAL, B at execute2_at → DONE
            // A: execute_at
            if (isDue(row.executeAt(), now) && "PENDING".equals(row.status())) {
                int claimed = jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='RUNNING_A', updated_at=now() " +
                                "WHERE campaign_id=? AND status='PENDING'",
                        row.campaignId()
                );
                if (claimed == 0) return;

                log.info("[B/ab3] Send A at execute_at. campaignId={}", row.campaignId());
                mailerService.runAbBatch(row.campaignId(), false); // A

                jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='PARTIAL', updated_at=now() WHERE campaign_id=?",
                        row.campaignId()
                );
            }
            // B: execute2_at
            if (isDue(row.execute2At(), now) && ("PENDING".equals(row.status()) || "PARTIAL".equals(row.status()))) {
                int claimed = jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='RUNNING_B', updated_at=now() " +
                                "WHERE campaign_id=? AND status IN ('PENDING','PARTIAL')",
                        row.campaignId()
                );
                if (claimed == 0) return;

                log.info("[B/ab3] Send B at execute2_at. campaignId={}", row.campaignId());
                mailerService.runAbBatch(row.campaignId(), true); // B

                jdbcTemplate.update(
                        "UPDATE mail_ab_follow SET status='DONE', updated_at=now() WHERE campaign_id=?",
                        row.campaignId()
                );
            }
            return;
        }

        // 일반 AB(제목/발신자/콘텐츠): 테스트 → 본발송
        // 1) 테스트: execute_at
        if (isDue(row.executeAt(), now) && "PENDING".equals(row.status())) {
            int claimed = jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='RUNNING_TEST', updated_at=now() " +
                            "WHERE campaign_id=? AND status='PENDING'",
                    row.campaignId()
            );
            if (claimed == 0) return;

            log.info("[B/ab{}] Initial test send (50:50). campaignId={}", row.abType(), row.campaignId());
            // 이 메서드는 테스트 그룹만 보내도록 구현(전체 X)
            mailerService.runAbInitialTest(row.campaignId());

            jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='PARTIAL', updated_at=now() WHERE campaign_id=?",
                    row.campaignId()
            );
        }

        // 2) 승자 본발송: execute2_at
        if (isDue(row.execute2At(), now) && ("PENDING".equals(row.status()) || "PARTIAL".equals(row.status()))) {
            int claimed = jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='RUNNING', updated_at=now() " +
                            "WHERE campaign_id=? AND status IN ('PENDING','PARTIAL')",
                    row.campaignId()
            );
            if (claimed == 0) return;

            log.info("[B/ab{}] Winner follow-up. campaignId={}", row.abType(), row.campaignId());
            mailerService.runAbFollowup(row.campaignId());

            jdbcTemplate.update(
                    "UPDATE mail_ab_follow SET status='DONE', updated_at=now() WHERE campaign_id=?",
                    row.campaignId()
            );
        }
    }

    private static boolean isDue(LocalDateTime when, LocalDateTime now) {
        return when != null && (now.isAfter(when) || now.isEqual(when));
    }

    private static LocalDateTime toLdt(Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }

    record FollowRow(Long campaignId,
                     String type,         // 'S' or 'B'
                     Long abType,         // 0,1,2,3,4
                     LocalDateTime executeAt,
                     LocalDateTime execute2At,
                     String status) {}
}
