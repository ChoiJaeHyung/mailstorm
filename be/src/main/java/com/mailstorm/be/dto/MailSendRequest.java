package com.mailstorm.be.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MailSendRequest {
    private Long campaignId;     // 필수
    private String type;         // S:즉시발송, B:예약발송
    private String executeAt;    // 선택 (예약 1차)
    private String execute2At;   // 선택 (예약 2차, A/B Test일 경우)
}
