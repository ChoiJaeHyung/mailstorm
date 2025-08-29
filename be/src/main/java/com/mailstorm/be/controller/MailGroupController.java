package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailGroup;
import com.mailstorm.be.service.MailGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mail-groups")
@RequiredArgsConstructor
public class MailGroupController {

    private final MailGroupService service;

    // 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailGroup create(@RequestBody MailGroup dto, @AuthenticationPrincipal Long userId) {
        dto.setUserId(userId);
        return service.create(dto);
    }

    // 유저별 목록 조회
    @GetMapping
    public List<MailGroup> findAll(@AuthenticationPrincipal Long userId) {
        return service.findAllByDepartment(userId);
    }

    // 단건 조회
    @GetMapping("/{id}")
    public MailGroup findOne(@PathVariable Long id) {
        return service.findOne(id);
    }

    // 캠페인 아이디를 통한 주소록 건수 조회
    @GetMapping("/count/{campaign_id}")
    public Long countByCampaignId(@PathVariable Long campaign_id) {
        return service.findByCampaignId(campaign_id);
    }

    // 수정
    @PatchMapping("/{id}")
    public MailGroup update(@PathVariable Long id, @RequestBody MailGroup dto) {
        return service.update(id, dto);
    }

    // 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id) {
        service.remove(id);
    }
}
