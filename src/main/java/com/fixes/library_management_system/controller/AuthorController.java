package com.fixes.library_management_system.controller;

import com.fixes.library_management_system.dto.author.AuthorDTO;
import com.fixes.library_management_system.dto.author.SaveAuthorRequest;
import com.fixes.library_management_system.dto.author.ViewAuthorsResponse;
import com.fixes.library_management_system.service.AuthorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/authors")
public class AuthorController
{
    private final AuthorService authorService;

    public AuthorController(AuthorService authorService)
    {
        this.authorService = authorService;
    }

    // Any logged-in user (USER or ADMIN)
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ViewAuthorsResponse> viewAuthors()
    {
        return ResponseEntity.ok(authorService.viewAuthors());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<AuthorDTO> viewAuthorDetails(@PathVariable Long id)
    {
        return ResponseEntity.ok(authorService.viewAuthorDetails(id));
    }

    // Admin only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthorDTO> addAuthor(@Valid @RequestBody SaveAuthorRequest request)
    {
        AuthorDTO created = authorService.addAuthor(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);   // 201 + Location header
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthorDTO> updateAuthor(@PathVariable Long id,
                                                  @Valid @RequestBody SaveAuthorRequest request)
    {
        return ResponseEntity.ok(authorService.updateAuthor(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)   // 204, no body
    public void deleteAuthor(@PathVariable Long id)
    {
        authorService.deleteAuthor(id);
    }
}

