package com.fixes.library_management_system.dto.author;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthorDTO {

    private Long id;
    private String name;
    private String biography;
    private LocalDate dob;

    public AuthorDTO() {}

    public AuthorDTO(Long id, String name, String biography, LocalDate dob)
    {
        this.id = id;
        this.name = name;
        this.biography = biography;
        this.dob = dob;
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
    public String getBiography()
    {

        return biography;
    }
    public void setBiography(String biography)
    {
        this.biography = biography;
    }
    public LocalDate getDob()
    {

        return dob;
    }
    public void setDob(LocalDate dob)
    {
        this.dob = dob;
    }
}



