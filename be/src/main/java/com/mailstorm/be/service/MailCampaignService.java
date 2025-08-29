package com.mailstorm.be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mailstorm.be.domain.MailCampaign;
import com.mailstorm.be.domain.MailContent;
import com.mailstorm.be.domain.MailSendInfo;
import com.mailstorm.be.dto.CreateMailCampaignDto;
import com.mailstorm.be.repository.MailCampaignRepository;
import com.mailstorm.be.repository.MailContentRepository;
import com.mailstorm.be.repository.MailSendInfoRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MailCampaignService {

    private final MailCampaignRepository campaignRepo;
    private final MailContentRepository contentRepo;
    private final MailSendInfoRepository sendInfoRepo;
    private final EntityManager entityManager;

    @Transactional
    public MailCampaign create(CreateMailCampaignDto dto) {
        ObjectMapper mapper = new ObjectMapper();
        MailCampaign campaign = new MailCampaign();
        campaign.setName(dto.getName());
        campaign.setDescription(dto.getDescription());
        campaign.setUserId(dto.getUserId());
        campaign.setGroupId(dto.getGroupId());

        campaign = campaignRepo.save(campaign);

        MailContent content = new MailContent();
        content.setCampaignId(campaign.getId());
        content.setHtml("");
        content.setHtmlB("");
        content.setDesign(mapper.createObjectNode());
        content.setDesignB(mapper.createObjectNode());
        content.setCreatedAt(LocalDateTime.now());
        content.setUpdatedAt(LocalDateTime.now());
        contentRepo.save(content);

        MailSendInfo sendInfo = new MailSendInfo();
        sendInfo.setCampaignId(campaign.getId());
        sendInfo.setSubject("");
        sendInfo.setSubjectB("");
        sendInfo.setSenderEmail("");
        sendInfo.setSenderName("");
        sendInfo.setSenderNameB("");
        sendInfo.setPreviewText("");
        sendInfo.setCreatedAt(LocalDateTime.now());
        sendInfo.setUpdatedAt(LocalDateTime.now());
        sendInfoRepo.save(sendInfo);

        return campaign;
    }

    public Map<String, Object> getStatusInfo(Long campaignId) {
        List<Object[]> result = entityManager.createNativeQuery("""
            SELECT 
              a.name AS campaign_name,
              a.send_date,
              a.end_date,
              b.name AS group_name,
              c.sender_name,
              c.sender_email,
              d.html AS content_html
            FROM mail_campaigns a
              LEFT JOIN mail_groups b ON a.group_id = b.id
              LEFT JOIN mail_sendinfo c ON a.id = c.campaign_id
              LEFT JOIN mail_contents d ON a.id = d.campaign_id
            WHERE a.id = ?1
            LIMIT 1
        """).setParameter(1, campaignId).getResultList();

        if (result.isEmpty()) return null;

        Object[] base = result.get(0);

        List<Object[]> stats = entityManager.createNativeQuery("""
            SELECT 
              COUNT(a.recipient_id) AS total_count,
              (SELECT COUNT(id) FROM mail_logs WHERE status = 'SENT' AND campaign_id = ?1) AS success_count,
              (SELECT COUNT(id) FROM mail_tracker WHERE type = 'open' AND campaign_id = ?1) AS open_count,
              (SELECT COUNT(id) FROM mail_tracker WHERE type = 'click' AND campaign_id = ?1) AS click_count,
              (SELECT COUNT(id) FROM mail_tracker WHERE type = 'unsubscribe' AND campaign_id = ?1) AS reject_count
            FROM mail_logs a
            WHERE a.campaign_id = ?1
            GROUP BY a.campaign_id
        """).setParameter(1, campaignId).getResultList();

        Object[] stat = stats.isEmpty() ? null : stats.get(0);

        Map<String, Object> map = new java.util.HashMap<>();

        map.put("campaignName", base[0]);
        map.put("sendDate", base[1]);
        map.put("endDate", base[2]);
        map.put("groupName", base[3]);
        map.put("senderName", base[4]);
        map.put("senderEmail", base[5]);
        map.put("contentHtml", base[6]);

        map.put("totalCount", stat != null ? stat[0] : 0);
        map.put("successCount", stat != null ? stat[1] : 0);
        map.put("openCount", stat != null ? stat[2] : 0);
        map.put("clickCount", stat != null ? stat[3] : 0);
        map.put("rejectCount", stat != null ? stat[4] : 0);

        return map;
    }

    @Transactional
    public void updateGroupId(Long id, Long groupId) {
        MailCampaign campaign = campaignRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Campaign not found"));
        campaign.setGroupId(groupId); // null 허용됨
        campaignRepo.save(campaign);
    }

    @Transactional
    public void updatePartial(Long id, Map<String, Object> updates) {
        MailCampaign campaign = campaignRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"캠페인을 찾을 수 없습니다."));

        if (updates.containsKey("name")) {
            campaign.setName((String) updates.get("name"));
        }
        if (updates.containsKey("description")) {
            campaign.setDescription((String) updates.get("description"));
        }
        if (updates.containsKey("status")) {
            campaign.setStatus((String) updates.get("status"));
        }
        if (updates.containsKey("group_id")) {
            Object groupId = updates.get("group_id");
            if (groupId == null) {
                campaign.setGroupId(null);
            } else if (groupId instanceof Number) {
                campaign.setGroupId(((Number) groupId).longValue());
            }
        }

        campaignRepo.save(campaign);
    }
}
