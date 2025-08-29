package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailTracker;
import com.mailstorm.be.repository.MailTrackerRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailTrackerService {

    private final MailTrackerRepository repo;
    private final JdbcTemplate jdbc;

    @Transactional
    public void logEvent(String type, Long campaignId, Long groupId, Long recipientId, String url) {
        int updated = repo.touch(type, campaignId, groupId, recipientId, url);
        if (updated > 0) return;

        try {
            // 없으면 새로 insert
            MailTracker t = new MailTracker(type, campaignId, groupId, recipientId, url);
            repo.save(t);
        } catch (DataIntegrityViolationException e) {
            // 레이스로 유니크 충돌 → 다시 업데이트 시도
            repo.touch(type, campaignId, groupId, recipientId, url);
        }
    }

    public List<Map<String, Object>> findDetailStats(Long campaignId, String type) {
        String sql = """
            SELECT a.id, 
                   COALESCE(b.name, '-') as name,
                   COALESCE(b.email, '-') as email,
                   a.url as etc,
                   a.updated_at,
                   a.created_at
              FROM mail_tracker a
         LEFT JOIN mail_recipients b ON a.recipient_id = b.id
             WHERE a.campaign_id = ?
               %s
             ORDER BY a.updated_at DESC
        """.formatted(
                (type != null && List.of("open", "click", "unsubscribe").contains(type))
                        ? "AND a.type = '" + type + "'" : ""
        );

        return jdbc.queryForList(sql, campaignId);
    }
}
