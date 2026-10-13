package com.fixes.library_management_system.dto.author;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
@Setter
@Getter
@NoArgsConstructor

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthorDTO {

    private Long id;
    private String name;
    private String biography;
    private LocalDate dob;

    public AuthorDTO(Long id, String name, String biography, LocalDate dob)
    {
        this.id = id;
        this.name = name;
        this.biography = biography;
        this.dob = dob;
    }

}



