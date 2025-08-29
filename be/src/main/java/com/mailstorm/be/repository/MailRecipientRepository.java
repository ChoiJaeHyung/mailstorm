package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MailRecipientRepository extends JpaRepository<MailRecipient, Long> {
    List<MailRecipient> findByGroupIdOrderByCreatedAtDesc(Long groupId);
    long countByGroupId(Long groupId);
}
