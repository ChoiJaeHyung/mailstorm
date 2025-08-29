// com.mailstorm.be.entity.MailLog.java
package com.mailstorm.be.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_logs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long campaignId;
    private Long groupId;
    private Long recipientId;

    private String queueId;
    private String messageId;
    private String status;

    private String bounceCode;

    @Column(columnDefinition = "text")
    private String bounceReason;
    private String mailFrom;
    private String mailTo;

    private String abVariant;

    @Column(nullable = false)
    @Builder.Default
    private int attempt = 1;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
