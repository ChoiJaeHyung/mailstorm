package com.mailstorm.be.repository;

import com.mailstorm.be.domain.MailGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MailGroupRepository extends JpaRepository<MailGroup, Long> {
    List<MailGroup> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
      SELECT DISTINCT g
      FROM MailGroup g
      JOIN User u ON g.userId = u.id
      WHERE g.userId = :userId
         OR u.departmentId = :departmentId
      ORDER BY g.createdAt DESC
    """)
    List<MailGroup> findVisibleGroups(Long userId, Long departmentId);
}
