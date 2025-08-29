package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MailCampaignRepository extends JpaRepository<MailCampaign, Long> {
    List<MailCampaign> findByUserIdOrderByCreatedAtDesc(Long userId);
}

