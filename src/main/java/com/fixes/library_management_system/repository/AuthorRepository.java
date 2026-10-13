package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.Author;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, Long>
{
}
