package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailSendInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MailSendInfoRepository extends JpaRepository<MailSendInfo, Long> {
    Optional<MailSendInfo> findByCampaignId(Long campaignId);
}

