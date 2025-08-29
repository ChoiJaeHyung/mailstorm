package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailCampaign;
import com.mailstorm.be.domain.MailGroup;
import com.mailstorm.be.repository.DepartmentsRepository;
import com.mailstorm.be.repository.MailCampaignRepository;
import com.mailstorm.be.repository.MailGroupRepository;
import com.mailstorm.be.repository.MailRecipientRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MailGroupService {

    private final MailGroupRepository repo;
    private final MailCampaignRepository campaignRepo;
    private final MailRecipientRepository recipientRepo;
    private final DepartmentService departmentService;

    public MailGroup create(MailGroup dto) {
        return repo.save(dto);
    }

    public List<MailGroup> findAll() {
        return repo.findAll();
    }

    public List<MailGroup> findAllByUser(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<MailGroup> findAllByDepartment(Long userId) {
        Long departmentId = departmentService.getCurrentUserDepartmentId(userId);
        return repo.findVisibleGroups(userId, departmentId);
    }

    public MailGroup findOne(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group " + id + " not found"));
    }

    public Long findByCampaignId(Long id) {
        MailCampaign campaign = campaignRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaign not found"));
        Long groupId = campaign.getGroupId();
        return recipientRepo.countByGroupId(groupId);
    }

    public MailGroup update(Long id, MailGroup dto) {
        MailGroup existing = findOne(id);
        existing.updateFrom(dto);
        return repo.save(existing);
    }

    public void remove(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group " + id + " not found");
        }
        repo.deleteById(id);
    }
}
