package com.mailstorm.be.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Column(nullable = false)
    private String name;

    private String footerCompany;
    private String footerFromMail;
    private String footerAddress;
    private String footerTel;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateFrom(MailGroup dto) {
        this.name = dto.getName();
        this.footerCompany = dto.getFooterCompany();
        this.footerFromMail = dto.getFooterFromMail();
        this.footerAddress = dto.getFooterAddress();
        this.footerTel = dto.getFooterTel();
        this.updatedAt = LocalDateTime.now();
    }
}
