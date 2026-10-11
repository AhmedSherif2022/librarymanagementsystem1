package com.fixes.library_management_system.service;
import com.fixes.library_management_system.dto.author.AuthorDTO;
import com.fixes.library_management_system.dto.author.SaveAuthorRequest;
import com.fixes.library_management_system.dto.author.ViewAuthorsResponse;
import com.fixes.library_management_system.exception.EntityAlreadyExistingException;
import com.fixes.library_management_system.exception.EntityNotFoundException;
import com.fixes.library_management_system.mapper.AuthorMapper;
import com.fixes.library_management_system.model.Author;
import com.fixes.library_management_system.repository.AuthorRepository;
import com.fixes.library_management_system.repository.BookRepository;
import com.fixes.library_management_system.Enums.EntityEnum;
import com.fixes.library_management_system.Enums.OperationEnum;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Service
public class AuthorService
{

    private final AuthorRepository authorRepository;
    private final BookRepository bookRepository;
    private final AuthorMapper authorMapper;
    private final AuditlogService auditLogService;

    public AuthorService(AuthorRepository authorRepository,
                         BookRepository bookRepository,
                         AuthorMapper authorMapper,
                         AuditlogService auditLogService)
    {
        this.authorRepository = authorRepository;
        this.bookRepository = bookRepository;
        this.authorMapper = authorMapper;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public ViewAuthorsResponse viewAuthors()
    {
        List<AuthorDTO> authors = authorRepository.findAll().stream()
                .map(authorMapper::toDTO)
                .toList();
        return new ViewAuthorsResponse(authors);
    }
    @Transactional(readOnly = true)
    public AuthorDTO viewAuthorDetails(Long id)
    {
        return authorMapper.toDTO(findAuthor(id));
    }

    @Transactional
    public AuthorDTO addAuthor(SaveAuthorRequest request)
    {
        Author saved = authorRepository.save(authorMapper.toEntity(request));
        auditLogService.auditLog(EntityEnum.AUTHOR, OperationEnum.CREATE, saved.getId());
        return authorMapper.toDTO(saved);
    }
    @Transactional
    public AuthorDTO updateAuthor(Long id, SaveAuthorRequest request)
    {
        Author author = findAuthor(id);
        authorMapper.updateEntity(request, author);   // changes name, biography, dob only
        Author saved = authorRepository.save(author);
        auditLogService.auditLog(EntityEnum.AUTHOR, OperationEnum.UPDATE, saved.getId());
        return authorMapper.toDTO(saved);
    }

    @Transactional
    public void deleteAuthor(Long id)
    {
        Author author = findAuthor(id);
        if (bookRepository.existsByAuthorId(id)) {
            throw new EntityAlreadyExistingException("Author still has books and cannot be deleted");
        }
        authorRepository.delete(author);
        auditLogService.auditLog(EntityEnum.AUTHOR, OperationEnum.DELETE, id);
    }
    private Author findAuthor(Long id)
    {
        return authorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Author", id));
    }
}