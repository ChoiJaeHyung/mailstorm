package com.mailstorm.be.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_campaigns")
@Getter
@Setter
@NoArgsConstructor
public class MailCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "text")
    private String name;

    private Long groupId;

    @Column(columnDefinition = "text")
    private String description;

    private Long userId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = true)
    private LocalDateTime sendDate;

    @Column(nullable = true)
    private LocalDateTime endDate;

    @Column(length = 20)
    private String status = "draft";
}
