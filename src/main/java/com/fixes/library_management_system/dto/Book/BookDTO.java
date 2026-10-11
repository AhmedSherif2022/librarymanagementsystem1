package com.fixes.library_management_system.dto.Book;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookDTO
{

    private Long id;
    private String title;
    private String isbn;
    private LocalDate publishedDate;


    private Long authorId;
    private String authorName;
    private Long memberId;      // null means the book is available
    private String memberName;

    public BookDTO() {}

    public BookDTO(Long id, String title, String isbn, LocalDate publishedDate,
                   Long authorId, String authorName, Long memberId, String memberName)
    {
        this.id = id;
        this.title = title;
        this.isbn = isbn;
        this.publishedDate = publishedDate;
        this.authorId = authorId;
        this.authorName = authorName;
        this.memberId = memberId;
        this.memberName = memberName;
    }

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
    public Long getAuthorId()
    {
        return authorId;
    }
    public void setAuthorId(Long authorId)
    {
        this.authorId = authorId;
    }
    public String getAuthorName()
    {
        return authorName;
    }
    public void setAuthorName(String authorName)
    {
        this.authorName = authorName;
    }
    public Long getMemberId()
    {
        return memberId;
    }
    public void setMemberId(Long memberId)
    {
        this.memberId = memberId;
    }
    public String getMemberName()
    {
        return memberName;
    }
    public void setMemberName(String memberName)
    {
        this.memberName = memberName;
    }
}