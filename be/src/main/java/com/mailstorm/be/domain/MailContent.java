package com.mailstorm.be.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.mailstorm.be.global.JsonStringConverter;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "mail_contents")
@Getter
@Setter
@NoArgsConstructor
public class MailContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(columnDefinition = "jsonb")
    @Type(JsonType.class)
    private JsonNode design;

    @Column(columnDefinition = "jsonb")
    @Type(JsonType.class)
    private JsonNode designB;

    @Column(columnDefinition = "text", nullable = false)
    private String html;

    @Column(columnDefinition = "text")
    private String htmlB;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

