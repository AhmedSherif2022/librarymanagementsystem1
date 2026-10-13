package com.fixes.library_management_system.repository;

import com.fixes.library_management_system.model.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long>
 {


    boolean existsByIsbn(String isbn);                    // when creating a book
    boolean existsByIsbnAndIdNot(String isbn, Long id);   // when updating a book


    boolean existsByAuthorId(Long authorId);
    boolean existsByMemberId(Long memberId);

    List<Book> findByMemberId(Long memberId);



    @Override
    @EntityGraph(attributePaths = {"author", "member"})
    List<Book> findAll();

    @Override
    @EntityGraph(attributePaths = {"author", "member"})
    Page<Book> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"author", "member"})
    Optional<Book> findById(Long id);
}
