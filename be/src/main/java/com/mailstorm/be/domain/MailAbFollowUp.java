    package com.mailstorm.be.domain;

    import jakarta.persistence.*;
    import lombok.Getter;
    import lombok.NoArgsConstructor;
    import lombok.Setter;
    import org.hibernate.annotations.CreationTimestamp;
    import org.hibernate.annotations.UpdateTimestamp;

    import java.time.LocalDateTime;

    @Entity
    @Table(
            name = "mail_ab_follow",
            uniqueConstraints = {
                    @UniqueConstraint(name = "uq_mail_ab_follow_campaign", columnNames = "campaign_id")
            }
    )
    @Getter
    @Setter
    @NoArgsConstructor
    public class MailAbFollowUp {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        private Long campaignId;

        @Column(length = 20)
        private String status = "PENDING";

        private Long abType;

        @Column(length = 2)
        private String type = "S";  // S: 일반발송 B: 예약발송

        private LocalDateTime executeAt;

        @Column(name = "execute2_at")
        private LocalDateTime execute2At;

        @CreationTimestamp
        private LocalDateTime createdAt;

        @UpdateTimestamp
        private LocalDateTime updatedAt;
    }
