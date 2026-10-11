package com.fixes.library_management_system.service;
import com.fixes.library_management_system.exception.EntityNotFoundException;
import com.fixes.library_management_system.model.AuditLog;
import com.fixes.library_management_system.model.User;
import com.fixes.library_management_system.repository.AuditLogRepository;
import com.fixes.library_management_system.repository.UserRepository;
import com.fixes.library_management_system.Enums.EntityEnum;
import com.fixes.library_management_system.Enums.OperationEnum;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AuditlogService
{

    private static final Logger log = LoggerFactory.getLogger(AuditlogService.class);

    private final TokenService tokenService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public AuditlogService(TokenService tokenService,
                           UserRepository userRepository,
                           AuditLogRepository auditLogRepository)
    {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }
    @Transactional
    public void auditLog(EntityEnum entityEnum, OperationEnum operationEnum, Long entityId)
    {
        String username = tokenService.getUsernameFromToken();
        Long userId = userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(EntityNotFoundException::new);
        auditLog(entityEnum, operationEnum, entityId, userId);
    }
    @Transactional
    public void auditLog(EntityEnum entityEnum, OperationEnum operationEnum, Long entityId, Long userId)
    {
        auditLogRepository.save(new AuditLog(entityEnum.name(), entityId, operationEnum.name(), userId));
        log.info("AUDIT: user {} applied {} on {} {}", userId, operationEnum, entityEnum, entityId);
    }

}
