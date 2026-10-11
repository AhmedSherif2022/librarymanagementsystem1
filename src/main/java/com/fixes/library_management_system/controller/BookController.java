package com.fixes.library_management_system.controller;
import com.fixes.library_management_system.dto.Book.BookDTO;
import com.fixes.library_management_system.dto.Book.SaveBookRequest;
import com.fixes.library_management_system.dto.Book.ViewBookSResponse;
import com.fixes.library_management_system.service.BookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/books")
public class BookController
{
    private final BookService bookService;

    public BookController(BookService bookService)
    {
        this.bookService = bookService;
    }

    // Any logged-in user (USER or ADMIN)
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ViewBookSResponse> viewBooks()
    {
        return ResponseEntity.ok(bookService.viewBooks());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<BookDTO> viewBookDetails(@PathVariable Long id)
    {
        return ResponseEntity.ok(bookService.viewBookDetails(id));
    }

    // Admin only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookDTO> addBook(@Valid @RequestBody SaveBookRequest request)
    {
        BookDTO created = bookService.addBook(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);   // 201 + Location header
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookDTO> updateBook(@PathVariable Long id,
                                              @Valid @RequestBody SaveBookRequest request)
    {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)   // 204, no body
    public void deleteBook(@PathVariable Long id)
    {
        bookService.deleteBook(id);
    }
}