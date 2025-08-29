package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailSendInfo;
import com.mailstorm.be.repository.MailSendInfoRepository;
import com.mailstorm.be.service.MailSendInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/mail-sendinfo")
@RequiredArgsConstructor
public class MailSendInfoController {

    private final MailSendInfoRepository repo;
    private final MailSendInfoService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailSendInfo create(@RequestBody MailSendInfo dto) {
        return repo.save(dto);
    }

    @GetMapping
    public List<MailSendInfo> findAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public MailSendInfo findOne(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("SendInfo " + id + " not found"));
    }

    @GetMapping("/by-campaign/{campaignId}")
    public MailSendInfo findByCampaignId(@PathVariable Long campaignId) {
        return repo.findByCampaignId(campaignId)
                .orElseThrow(() -> new RuntimeException("메일 발송정보가 없습니다."));
    }

    @PatchMapping("/{id}")
    public MailSendInfo update(@PathVariable Long id, @RequestBody MailSendInfo dto) {
        MailSendInfo existing = findOne(id);
        existing.updateFrom(dto);
        return repo.save(existing);
    }

    @PatchMapping("/by-campaign/{campaignId}")
    public MailSendInfo patch(@PathVariable Long campaignId, @RequestBody MailSendInfo patch) {
        return repo.findByCampaignId(campaignId)
                .map(existing -> {
                    patch.setCampaignId(campaignId);               // 경로 우선
                    BeanUtils.copyProperties(patch, existing, MailSendInfoService.nullProps(patch)); // null은 복사 제외
                    existing.setUpdatedAt(LocalDateTime.now());
                    return repo.save(existing);
                })
                .orElseGet(() -> {
                    patch.setCampaignId(campaignId);
                    patch.setUpdatedAt(LocalDateTime.now());
                    return repo.save(patch); // 최초 생성
                });
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("SendInfo " + id + " not found");
        }
        repo.deleteById(id);
    }
}
