package com.mailstorm.be.global;

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@ConfigurationProperties(prefix = "tracker")
public class TrackerJwtProperties {
    private final String jwtSecret;
    private final long jwsExpireMs;

    public TrackerJwtProperties(String jwtSecret, long jwsExpireMs) {
        this.jwtSecret = jwtSecret;
        this.jwsExpireMs = jwsExpireMs;
    }
}
