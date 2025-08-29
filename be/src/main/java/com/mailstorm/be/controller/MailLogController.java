package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailLog;
import com.mailstorm.be.dto.MailLogDetailDto;
import com.mailstorm.be.service.MailLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mail-logs")
@RequiredArgsConstructor
public class MailLogController {

    private final MailLogService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailLog create(@RequestBody MailLog dto) {
        return service.create(dto);
    }

    @GetMapping
    public List<MailLog> findAll() {
        return service.findAll();
    }

    @GetMapping("/status")
    public List<MailLogDetailDto> findByCampaignIdAndStatus(
            @RequestParam("campaign_id") Long campaignId,
            @RequestParam(value = "status", required = false) String status
    ) {
            return service.findDetailStats(campaignId, status);
    }

    @GetMapping("/{id}")
    public MailLog findOne(@PathVariable("id") Long id) {
        return service.findOne(id);
    }

    @PatchMapping("/{id}")
    public MailLog update(
            @PathVariable("id") Long id,
            @RequestBody MailLog dto
    ) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable("id") Long id) {
        service.remove(id);
    }
}
