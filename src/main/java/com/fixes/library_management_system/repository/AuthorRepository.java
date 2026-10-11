package com.fixes.library_management_system.repository;
import com.fixes.library_management_system.model.Author;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, Long>
{
    // Nothing to fix. The built-in methods (findById, findAll(Pageable), save, deleteById)
    // are enough. "Does this author still have books?" is asked in BookRepository.
}
