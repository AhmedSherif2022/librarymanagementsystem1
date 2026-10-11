package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.Role;
import com.fixes.library_management_system.util.enums.RoleEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface Rolerespository extends JpaRepository<Role, Long>
{

    Optional<Role> findByName(RoleEnum name);
}
