// com.mailstorm.be.repository.MailLogRepository.java
package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MailLogRepository extends JpaRepository<MailLog, Long> {
}
