package com.mailstorm.be.controller;

import com.mailstorm.be.domain.MailRecipient;
import com.mailstorm.be.dto.RecipientDTO;
import com.mailstorm.be.service.MailRecipientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/mail-recipients")
@RequiredArgsConstructor
public class MailRecipientController {

    private final MailRecipientService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<MailRecipient> create(@RequestBody RecipientDTO.CreateRequest request) {
        return service.createMany(request);
    }

    @GetMapping
    public List<MailRecipient> findByGroupId(@RequestParam(required = false) Long group_id) {
        if (group_id != null) return service.findByGroupId(group_id);
        return service.findAll();
    }

    @GetMapping("/{id}")
    public MailRecipient findOne(@PathVariable Long id) {
        return service.findOne(id);
    }

    @PatchMapping("/{id}")
    public MailRecipient update(@PathVariable Long id, @RequestBody RecipientDTO.ReceiveUpdateRequest request) {
        return service.updateReceive(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.remove(id);
    }

    @PostMapping("/upload-excel")
    public List<MailRecipient> uploadExcel(
            @RequestPart("file") MultipartFile file,
            @RequestParam("group_id") Long groupId
    ) throws IOException {
        return service.importFromCsv(file, groupId);
    }
}
