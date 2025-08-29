package com.mailstorm.be;

import com.mailstorm.be.global.TrackerJwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(TrackerJwtProperties.class)
public class MailStormBeApplication {

    public static void main(String[] args) {
        SpringApplication.run(MailStormBeApplication.class, args);
    }

}
