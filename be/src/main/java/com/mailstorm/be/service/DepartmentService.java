package com.mailstorm.be.service;

import com.mailstorm.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor

public class DepartmentService {

    private final UserRepository userRepository;

    /**
     * 현재 로그인 유저의 부서 ID 반환
     */
    public Long getCurrentUserDepartmentId(Long userId) {
        if (userId == null) return null;

        return userRepository.findById(userId)
                .map(user -> user.getDepartmentId())
                .orElse(null);
    }
}
