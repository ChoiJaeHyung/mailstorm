package com.mailstorm.be.dto;

import lombok.Data;

@Data
public class CreateMailCampaignDto {
    private String name;
    private String description;
    private Long userId;
    private Long groupId;
}

