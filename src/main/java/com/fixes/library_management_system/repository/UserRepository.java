package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.enums.RoleEnum;
import com.fixes.library_management_system.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>
{

    Optional<User> findByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);

    long countByRoles_Name(RoleEnum name);   // how many users have this role
}
