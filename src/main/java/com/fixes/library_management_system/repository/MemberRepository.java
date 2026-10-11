package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long>
{

    boolean existsByEmailIgnoreCase(String email);                   // when creating
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);  // when updating

    Optional<Member> findByEmailIgnoreCase(String email);
}
