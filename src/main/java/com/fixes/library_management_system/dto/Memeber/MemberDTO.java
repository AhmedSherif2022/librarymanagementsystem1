package com.fixes.library_management_system.dto.Memeber;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
@NoArgsConstructor
@Setter
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MemberDTO
{

    private Long id;
    private String name;
    private String email;
    private LocalDate membershipDate;
    private List<BorrowedBook> borrowedBooks = new ArrayList<>();


    public MemberDTO(Long id, String name, String email, LocalDate membershipDate,
                     List<BorrowedBook> borrowedBooks)
    {
        this.id = id;
        this.name = name;
        this.email = email;
        this.membershipDate = membershipDate;
        this.borrowedBooks = borrowedBooks == null ? new ArrayList<>() : borrowedBooks;
    }

    public void setBorrowedBooks(List<BorrowedBook> borrowedBooks)
    {
        this.borrowedBooks = borrowedBooks == null ? new ArrayList<>() : borrowedBooks;
    }

    public static class BorrowedBook
    {
        private Long id;
        private String title;
        private String isbn;

        public BorrowedBook()
        {


        }
        public BorrowedBook(Long id, String title, String isbn)
        {
            this.id = id;
            this.title = title;
            this.isbn = isbn;
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
    }
}