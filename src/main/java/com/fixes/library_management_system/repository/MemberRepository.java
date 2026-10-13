package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.Memeber;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Memeber, Long>
{
    boolean existsByEmailIgnoreCase(String email);                   // when creating
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);  // when updating
    Optional<Memeber> findByEmailIgnoreCase(String email);


    @Override
    @EntityGraph(attributePaths = {"borrowedBooks"})
    List<Memeber> findAll();
}
