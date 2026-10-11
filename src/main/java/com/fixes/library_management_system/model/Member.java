package com.fixes.library_management_system.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is mandatory")
    @Size(min = 2, max = 100, message = "Name should be between 2 and 100 characters")
    @Column(nullable = false, length = 100)
    private String name;


    @NotBlank(message = "Email is mandatory")
    @Email(message = "Email should be valid")
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @PastOrPresent(message = "Membership date cannot be in the future")
    private LocalDate membershipDate;

    @OneToMany(mappedBy = "member")
    @JsonIgnore
    private List<Book> borrowedBooks = new ArrayList<>();


    public Member()
    {


    }
    public Member(String name, String email, LocalDate membershipDate) {
        this.name = name;
        this.email = email;
        this.membershipDate = membershipDate;
    }


    public Long getId()
    {
        return id;
    }
    public void setId(Long id)
    {
        this.id = id;
    }

    public String getName()
    {
        return name;
    }
    public void setName(String name)
    {
        this.name = name;
    }

    public String getEmail()
    {
        return email;
    }
    public void setEmail(String email)
    {
        this.email = email;
    }

    public LocalDate getMembershipDate()
    {
        return membershipDate;
    }
    public void setMembershipDate(LocalDate membershipDate)
    {
        this.membershipDate = membershipDate;
    }
    public List<Book> getBorrowedBooks()
    {
        return borrowedBooks;
    }
    public void setBorrowedBooks(List<Book> borrowedBooks)
    {
        this.borrowedBooks = borrowedBooks;
    }
}