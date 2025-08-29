package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailCampaign;
import com.mailstorm.be.dto.CreateMailCampaignDto;
import com.mailstorm.be.dto.PatchGroupIdDto;
import com.mailstorm.be.repository.MailCampaignRepository;
import com.mailstorm.be.service.MailCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/mail-campaigns")
@RequiredArgsConstructor
public class MailCampaignsController {

    private final MailCampaignService service;
    private final MailCampaignRepository repo;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailCampaign create(@RequestBody CreateMailCampaignDto dto, @AuthenticationPrincipal Long userId) {
        dto.setUserId(userId);
        return service.create(dto);
    }

    @GetMapping
    public List<MailCampaign> findAll(@AuthenticationPrincipal Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/{id}")
    public MailCampaign findOne(@PathVariable Long id) {
        return repo.findById(id).orElse(null);
    }

//    @PatchMapping("/{id}")
//    public MailCampaign update(
//            @PathVariable Long id,
//            @RequestBody MailCampaign dto
//    ) {
//        return repo.save(dto);
//    }
    @PatchMapping("/{id}")
    public ResponseEntity<?> updatePartial(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        service.updatePartial(id, updates);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/group/{id}")
    public ResponseEntity<?> updateGroupId(
            @PathVariable Long id,
            @RequestBody PatchGroupIdDto dto) {

        service.updateGroupId(id, dto.getGroup_id());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id) {
        repo.deleteById(id);
    }

    @GetMapping("/status/{id}")
    public ResponseEntity<?> getStatus(@PathVariable Long id) {
        if (id == null || id <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "올바른 id를 입력하세요."));
        }
        var data = service.getStatusInfo(id);
        if (data == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "존재하지 않는 캠페인입니다."));
        }
        return ResponseEntity.ok(data);
    }
}
