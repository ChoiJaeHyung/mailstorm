package com.mailstorm.be.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_sendinfo")
@Getter
@Setter
@NoArgsConstructor
public class MailSendInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column
    private Boolean abTest;

    @Column
    @Comment("1:이메일제목, 2:발신자이름, 3:발송스케쥴, 4:콘텐츠")
    private Long abType;

    @Column
    @Comment("시간/일")
    private String dailyUnit;

    @Column
    private String dailyUnitB;

    @Column
    private Long dailyValue;

    @Column
    private Long dailyValueB;

    @Column
    private Long testRatio;

    @Column(length = 255)
    private String subject;

    @Column(length = 255)
    private String subjectB;

    @Column(length = 100)
    private String senderName;

    @Column(length = 100)
    private String senderNameB;

    @Column(length = 100)
    private String senderEmail;

    @Column(length = 255)
    private String previewText;

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

    public void updateFrom(MailSendInfo dto) {
        this.campaignId = dto.getCampaignId();
        this.senderName = dto.getSenderName();
        this.senderEmail = dto.getSenderEmail();
        this.subject = dto.getSubject();
        this.previewText = dto.getPreviewText();
        this.updatedAt = LocalDateTime.now();
        this.abTest = dto.getAbTest();
        this.senderNameB = dto.getSenderNameB();
        this.subjectB = dto.getSubjectB();
        this.abTest = dto.getAbTest();
        this.abType = dto.getAbType();
        this.testRatio = dto.getTestRatio();
        this.dailyUnit = dto.getDailyUnit();
        this.dailyValue = dto.getDailyValue();
        this.dailyUnitB = dto.getDailyUnitB();
        this.dailyValueB = dto.getDailyValueB();
    }

}

