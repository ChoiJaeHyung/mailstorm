package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MailContentRepository extends JpaRepository<MailContent, Long> {
    Optional<MailContent> findByCampaignId(Long campaignId);
}

