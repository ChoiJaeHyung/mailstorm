package com.mailstorm.be.service;

import com.mailstorm.be.domain.MailRecipient;
import com.mailstorm.be.dto.RecipientDTO;
import com.mailstorm.be.repository.MailRecipientRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MailRecipientService {

    private final MailRecipientRepository repo;

    public List<MailRecipient> createMany(RecipientDTO.CreateRequest req) {
        List<MailRecipient> list = new ArrayList<>();
        for (RecipientDTO.RecipientData rec : req.getRecipients()) {
            MailRecipient entity = new MailRecipient();
            entity.setGroupId(req.getGroupId());
            entity.setEmail(rec.getEmail());
            entity.setName(rec.getName());
            entity.setReceive(true);
            list.add(repo.save(entity));
        }
        return list;
    }

    public List<MailRecipient> findByGroupId(Long groupId) {
        return repo.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public List<MailRecipient> findAll() {
        return repo.findAll();
    }

    public MailRecipient findOne(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient " + id + " not found"));
    }

    public MailRecipient update(Long id, RecipientDTO.UpdateRequest dto) {
        MailRecipient entity = findOne(id);
        entity.setEmail(dto.getEmail());
        entity.setName(dto.getName());
        entity.setReceive(dto.getReceive());
        return repo.save(entity);
    }

    public MailRecipient updateReceive(Long id, RecipientDTO.ReceiveUpdateRequest dto) {
        MailRecipient entity = findOne(id);
        entity.setReceive(dto.getReceive());
        return repo.save(entity);
    }

    public void remove(Long id) {
        MailRecipient entity = findOne(id);
        repo.delete(entity);
    }

    public List<MailRecipient> importFromCsv(MultipartFile file, Long groupId) throws IOException {
        String csvText = new String(file.getBytes(), StandardCharsets.UTF_8);
        CSVParser parser = CSVParser.parse(csvText, CSVFormat.DEFAULT.withFirstRecordAsHeader());
        List<MailRecipient> result = new ArrayList<>();

        for (CSVRecord rec : parser) {
            String email = rec.get("email");
            if (email == null || !email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) continue;

            MailRecipient entity = new MailRecipient();
            entity.setGroupId(groupId);
            entity.setEmail(email);
            entity.setName(rec.get("name"));
            entity.setReceive(true);
            result.add(repo.save(entity));
        }

        return result;
    }
}
