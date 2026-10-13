package com.fixes.library_management_system.dto.author;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
@NoArgsConstructor
public class SaveAuthorRequest {

    @NotBlank(message = "Name is mandatory")
    @Size(min = 2, max = 100, message = "Name should be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Biography is mandatory")
    @Size(max = 5000, message = "Biography must not exceed 5000 characters")
    private String biography;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dob;



    public SaveAuthorRequest(String name, String biography, LocalDate dob)
    {
        this.name = name;
        this.biography = biography;
        this.dob = dob;
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
