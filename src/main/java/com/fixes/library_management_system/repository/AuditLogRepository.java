package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>
{


    Page<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Long entityId, Pageable pageable);



    Page<AuditLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
}