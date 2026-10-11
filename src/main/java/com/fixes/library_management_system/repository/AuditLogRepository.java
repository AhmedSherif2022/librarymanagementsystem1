package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>
{

    // History of one record, newest first (e.g. everything that happened to Author 5)

    Page<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Long entityId, Pageable pageable);

    // Everything one user did, newest first

    Page<AuditLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
}