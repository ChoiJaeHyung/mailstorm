// com.mailstorm.be.service.MailLogService.java
package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailLog;
import com.mailstorm.be.dto.MailLogDetailDto;
import com.mailstorm.be.repository.MailLogRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MailLogService {

    private final MailLogRepository repo;

    @PersistenceContext
    private EntityManager em;

    public MailLog create(MailLog log) {
        return repo.save(log);
    }

    public List<MailLog> findAll() {
        return repo.findAll();
    }

    public MailLog findOne(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Log " + id + " not found"));
    }

    public MailLog update(Long id, MailLog dto) {
        MailLog log = findOne(id);
        log.setStatus(dto.getStatus());
        log.setBounceReason(dto.getBounceReason());
        log.setBounceCode(dto.getBounceCode());
        log.setMailFrom(dto.getMailFrom());
        log.setMailTo(dto.getMailTo());
        log.setAttempt(dto.getAttempt());
        return repo.save(log);
    }

    public void remove(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Log " + id + " not found");
        }
        repo.deleteById(id);
    }

    // 상태별 상세 조회
    public List<MailLogDetailDto> findDetailStats(Long campaignId, String status) {
        String sql = """
        SELECT a.id,
               COALESCE(b.name, '삭제고객') AS name,
               COALESCE(b.email, '삭제이메일') AS email,
               a.bounce_reason AS etc,
               a.updated_at,
               a.created_at
          FROM mail_logs a
     LEFT JOIN mail_recipients b
            ON a.recipient_id = b.id AND a.group_id = b.group_id
         WHERE a.campaign_id = :cid
           AND a.status = :status
    """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("cid", campaignId)
                .setParameter("status", status)
                .getResultList();

        return rows.stream()
                .map(row -> new MailLogDetailDto(
                        ((Number) row[0]).longValue(),
                        (String) row[1],
                        (String) row[2],
                        (String) row[3],
                        ((Timestamp) row[4]).toLocalDateTime(),
                        ((Timestamp) row[5]).toLocalDateTime()
                ))
                .toList();
    }
}
