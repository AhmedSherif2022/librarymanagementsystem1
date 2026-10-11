package com.fixes.library_management_system.service;

import com.fixes.library_management_system.dto.Book.BookDTO;
import com.fixes.library_management_system.dto.Book.SaveBookRequest;
import com.fixes.library_management_system.dto.Book.ViewBookSResponse;
import com.fixes.library_management_system.exception.EntityAlreadyExistingException;
import com.fixes.library_management_system.exception.EntityNotFoundException;
import com.fixes.library_management_system.mapper.BookMapper;
import com.fixes.library_management_system.model.Author;
import com.fixes.library_management_system.model.Book;
import com.fixes.library_management_system.repository.Authorrepository;
import com.fixes.library_management_system.repository.Bookrepository;
import com.fixes.library_management_system.util.enums.EntityEnum;
import com.fixes.library_management_system.util.enums.OperationEnum;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookService
{
    private final Bookrepository bookRepository;
    private final Authorrepository authorRepository;
    private final BookMapper bookMapper;
    private final AuditlogService auditLogService;

    public BookService(Bookrepository bookRepository,
                       Authorrepository authorRepository,
                       BookMapper bookMapper,
                       AuditlogService auditLogService)
    {
        this.bookRepository = bookRepository;
        this.authorRepository = authorRepository;
        this.bookMapper = bookMapper;
        this.auditLogService = auditLogService;
    }

    // @Transactional is required: the mapper reads the lazy author and member
    @Transactional(readOnly = true)
    public ViewBookSResponse viewBooks()
    {
        List<BookDTO> books = bookRepository.findAll().stream()
                .map(bookMapper::toDTO)
                .toList();
        return new ViewBookSResponse(books);
    }

    @Transactional(readOnly = true)
    public BookDTO viewBookDetails(Long id)
    {
        return bookMapper.toDTO(findBook(id));
    }

    @Transactional
    public BookDTO addBook(SaveBookRequest request)
    {
        String isbn = request.getIsbn().trim();
        if (bookRepository.existsByIsbn(isbn)) {
            throw new EntityAlreadyExistingException("A book with this ISBN already exists");
        }
        Author author = findAuthor(request.getAuthorId());

        Book book = bookMapper.toEntity(request);
        book.setIsbn(isbn);
        book.setAuthor(author);

        Book saved = bookRepository.save(book);
        auditLogService.auditLog(EntityEnum.BOOK, OperationEnum.CREATE, saved.getId());
        return bookMapper.toDTO(saved);
    }

    @Transactional
    public BookDTO updateBook(Long id, SaveBookRequest request)
    {
        Book book = findBook(id);

        String isbn = request.getIsbn().trim();
        if (bookRepository.existsByIsbnAndIdNot(isbn, id)) {
            throw new EntityAlreadyExistingException("Another book already uses this ISBN");
        }
        Author author = findAuthor(request.getAuthorId());

        bookMapper.updateEntity(request, book);   // keeps the id and who has the book
        book.setIsbn(isbn);
        book.setAuthor(author);

        Book saved = bookRepository.save(book);
        auditLogService.auditLog(EntityEnum.BOOK, OperationEnum.UPDATE, saved.getId());
        return bookMapper.toDTO(saved);
    }

    @Transactional
    public void deleteBook(Long id)
    {
        Book book = findBook(id);
        if (book.getMember() != null) {
            throw new EntityAlreadyExistingException("Book is currently borrowed and cannot be deleted");
        }
        bookRepository.delete(book);
        auditLogService.auditLog(EntityEnum.BOOK, OperationEnum.DELETE, id);
    }

    private Book findBook(Long id)
    {
        return bookRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Book", id));
    }

    private Author findAuthor(Long id)
    {
        return authorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Author", id));
    }
}