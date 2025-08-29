package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailSendInfo;
import com.mailstorm.be.repository.MailSendInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.beans.PropertyDescriptor;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class MailSendInfoService {

    private final MailSendInfoRepository repo;

    public MailSendInfo create(MailSendInfo dto) {
        return repo.save(dto);
    }

    public List<MailSendInfo> findAll() {
        return repo.findAll();
    }

    public MailSendInfo findOne(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "SendInfo " + id + " not found"));
    }

    public MailSendInfo findByCampaignId(Long campaignId) {
        return repo.findByCampaignId(campaignId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "메일 발송정보가 없습니다."));
    }

    public MailSendInfo update(Long id, MailSendInfo dto) {
        MailSendInfo existing = findOne(id);
        existing.updateFrom(dto);
        return repo.save(existing);
    }

    public MailSendInfo updateOrCreateByCampaignId(Long campaignId, MailSendInfo dto) {
        return repo.findByCampaignId(campaignId)
                .map(existing -> {
                    existing.updateFrom(dto);
                    return repo.save(existing);
                })
                .orElseGet(() -> {
                    dto.setCampaignId(campaignId);
                    return repo.save(dto);
                });
    }

    public void remove(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "SendInfo " + id + " not found");
        }
        repo.deleteById(id);
    }

    public static String[] nullProps(Object src) {
        BeanWrapper bw = new BeanWrapperImpl(src);
        return Arrays.stream(bw.getPropertyDescriptors())
                .map(PropertyDescriptor::getName)
                .filter(name -> bw.getPropertyValue(name) == null)
                .toArray(String[]::new);
    }
}
