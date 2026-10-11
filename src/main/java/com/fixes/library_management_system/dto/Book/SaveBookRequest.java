package com.fixes.library_management_system.dto.Book;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class SaveBookRequest
{

    @NotBlank(message = "Title is mandatory")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "ISBN is mandatory")
    @Size(max = 20, message = "ISBN must not exceed 20 characters")
    private String isbn;

    @NotNull(message = "Published date is mandatory")
    @PastOrPresent(message = "Published date cannot be in the future")
    private LocalDate publishedDate;

    @NotNull(message = "Author id is mandatory")
    @Positive(message = "Author id must be a positive number")
    private Long authorId;

    // Empty constructor: Jackson needs it to read JSON reliably
    public SaveBookRequest() {}

    public SaveBookRequest(String title, Long authorId, LocalDate publishedDate, String isbn)
    {
        this.title = title;
        this.authorId = authorId;
        this.publishedDate = publishedDate;
        this.isbn = isbn;
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
    public Long getAuthorId()
    {
        return authorId;
    }
    public void setAuthorId(Long authorId)
    {
        this.authorId = authorId;
    }
}