package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MailTrackerRepository extends JpaRepository<MailTracker, Long> {
    Optional<MailTracker> findByTypeAndCampaignIdAndGroupIdAndRecipientId(String type, Long campaignId, Long groupId, Long recipientId);

    Optional<MailTracker> findByTypeAndCampaignIdAndGroupIdAndRecipientIdAndUrl(
            String type, Long campaignId, Long groupId, Long recipientId, String url);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
      update MailTracker t
         set t.updatedAt = CURRENT_TIMESTAMP
       where t.type = :type
         and t.campaignId = :campaignId
         and t.groupId = :groupId
         and t.recipientId = :recipientId
         and ( (:url is null and t.url is null) or t.url = :url )
    """)
    int touch(@Param("type") String type,
              @Param("campaignId") Long campaignId,
              @Param("groupId") Long groupId,
              @Param("recipientId") Long recipientId,
              @Param("url") String url);
}

