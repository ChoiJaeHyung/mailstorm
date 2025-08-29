package com.mailstorm.be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mailstorm.be.domain.MailContent;
import com.mailstorm.be.repository.MailContentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class MailContentService {

    private final MailContentRepository mailContentRepository;

    public MailContent create(MailContent dto) {
        dto.setHtml(minifyHtml(dto.getHtml()));
        dto.setHtmlB(minifyHtml(dto.getHtmlB()));
        return mailContentRepository.save(dto);
    }

    public List<MailContent> findAll() {
        return mailContentRepository.findAll();
    }

    public MailContent findOne(Long id) {
        return mailContentRepository.findByCampaignId(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Content " + id + " not found"));
    }

    public MailContent findByCampaignId(Long campaignId) {
        return mailContentRepository.findByCampaignId(campaignId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "메일 발송정보가 없습니다."));
    }

    public MailContent update(Long id, MailContent dto) {
        MailContent content = findOne(id);
        if (dto.getHtml() != null) {
            content.setHtml(minifyHtml(dto.getHtml()));
        }
        if (dto.getHtmlB() != null) {
            content.setHtmlB(minifyHtml(dto.getHtmlB()));
        }

        if (dto.getDesign() != null) {
            content.setDesign(dto.getDesign());
        }
        if (dto.getDesignB() != null) {
            content.setDesignB(dto.getDesignB());
        }
        return mailContentRepository.save(content);
    }

    @Transactional
    public MailContent updateOrCreateByCampaignId(Long campaignId, MailContent dto) {
        Optional<MailContent> existing = mailContentRepository.findByCampaignId(campaignId);
        String minifiedHtml = dto.getHtml() != null ? minifyHtml(dto.getHtml()) : null;
        ObjectMapper mapper = new ObjectMapper();

        if (existing.isPresent()) {
            MailContent content = existing.get();
            if (dto.getHtml() != null) {
                content.setHtml(minifyHtml(dto.getHtml()));
            }
            if (dto.getHtmlB() != null) {
                content.setHtmlB(minifyHtml(dto.getHtmlB()));
            }
            if (dto.getDesign() != null) {
                content.setDesign(dto.getDesign());
            }
            if (dto.getDesignB() != null) {
                content.setDesignB(dto.getDesignB());
            }
            return mailContentRepository.save(content);
        } else {
            MailContent newContent = new MailContent();
            newContent.setCampaignId(campaignId);
            newContent.setHtml(minifiedHtml);
            newContent.setHtmlB(minifiedHtml);
            newContent.setDesign(dto.getDesign() != null ? dto.getDesign() : mapper.createObjectNode());
            newContent.setDesignB(dto.getDesignB() != null ? dto.getDesignB() : mapper.createObjectNode());
            return mailContentRepository.save(newContent);
        }
    }

    public void remove(Long id) {
        if (!mailContentRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Content " + id + " not found");
        }
        mailContentRepository.deleteById(id);
    }

    private String minifyHtml(String html) {
        if (html == null) return null;
        return html.replaceAll(">\\s+<", "><")
                .replaceAll("\\s{2,}", " ")
                .replaceAll("[\\n\\r\\t]", "");
    }
}
