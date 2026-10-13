package com.fixes.library_management_system.dto.Book;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Setter
@Getter

public class ViewBookSResponse
{

    private List<BookDTO> books;

    public ViewBookSResponse(List<BookDTO> books)
    {
        this.books = books == null ? List.of() : books;   // never send null
    }
}
