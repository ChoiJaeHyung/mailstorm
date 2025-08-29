package com.mailstorm.be.dto;

import java.time.LocalDateTime;

public record MailLogDetailDto(
        Long id,
        String name,
        String email,
        String etc,
        LocalDateTime updatedAt,
        LocalDateTime createdAt
) {}

