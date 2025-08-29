package com.mailstorm.be.dto;

import lombok.Data;

import java.util.List;

public class RecipientDTO {

    @Data
    public static class CreateRequest {
        private Long groupId;
        private List<RecipientData> recipients;
    }

    @Data
    public static class RecipientData {
        private String email;
        private String name;
    }

    @Data
    public static class UpdateRequest {
        private String email;
        private String name;
        private Boolean receive;
    }

    @Data
    public static class ReceiveUpdateRequest {
        private Boolean receive;
    }
}
