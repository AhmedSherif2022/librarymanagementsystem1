package com.fixes.library_management_system.dto.Book;
import java.util.List;

public class ViewBookSResponse
{

    private List<BookDTO> books;

    public ViewBookSResponse(List<BookDTO> books)
    {
        this.books = books == null ? List.of() : books;   // never send null
    }

    public List<BookDTO> getBooks()
    {
        return books;
    }
    public void setBooks(List<BookDTO> books)
    {
        this.books = books;
    }
}
