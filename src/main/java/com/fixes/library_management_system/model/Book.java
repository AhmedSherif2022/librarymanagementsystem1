package com.fixes.library_management_system.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

@Entity
@Table(name = "books")
public class Book
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is mandatory")
    @Column(nullable = false, length = 200)
    private String title;


    @NotBlank(message = "ISBN is mandatory")
    @Column(nullable = false, unique = true, length = 20)
    private String isbn;

    @PastOrPresent(message = "Published date cannot be in the future")
    private LocalDate publishedDate;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private Author author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    // Constructors
    public Book() {}

    public Book(String title, String isbn, LocalDate publishedDate, Author author, Member member) {
        this.title = title;
        this.isbn = isbn;
        this.publishedDate = publishedDate;
        this.author = author;
        this.member = member;
    }

    // Getters and Setters
    public Long getId()
    {
        return id;
    }
    public void setId(Long id)
    {
        this.id = id;
    }
    public String getTitle()
    {
        return title;
    }
    public void setTitle(String title)
    {
        this.title = title;
    }

    public String getIsbn()
    {
        return isbn;
    }
    public void setIsbn(String isbn)
    {
        this.isbn = isbn;
    }
    public LocalDate getPublishedDate()
    {
        return publishedDate;
    }
    public void setPublishedDate(LocalDate publishedDate)
    {
        this.publishedDate = publishedDate;
    }

    public Author getAuthor()
    {
        return author;
    }
    public void setAuthor(Author author)
    {
        this.author = author;
    }
    public Member getMember()
    {
        return member;
    }
    public void setMember(Member member)
    {
        this.member = member;
    }
}