package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailContent;
import com.mailstorm.be.service.MailContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mail-contents")
@RequiredArgsConstructor
public class MailContentController {

    private final MailContentService mailContentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailContent create(@RequestBody MailContent dto) {
        return mailContentService.create(dto);
    }

    @GetMapping
    public List<MailContent> findAll() {
        return mailContentService.findAll();
    }

    @GetMapping("/{id}")
    public MailContent findOne(@PathVariable Long id) {
        return mailContentService.findOne(id);
    }

    @GetMapping("/by-campaign/{campaignId}")
    public MailContent findByCampaignId(@PathVariable Long campaignId) {
        return mailContentService.findByCampaignId(campaignId);
    }

    @PatchMapping("/{id}")
    public MailContent update(@PathVariable Long id, @RequestBody MailContent dto) {
        return mailContentService.update(id, dto);
    }

    @PatchMapping("/by-campaign/{campaignId}")
    public MailContent updateByCampaignId(@PathVariable Long campaignId, @RequestBody MailContent dto) {
        return mailContentService.updateOrCreateByCampaignId(campaignId, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id) {
        mailContentService.remove(id);
    }
}
