package com.fixes.library_management_system.dto.author;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Setter
@Getter
public class ViewAuthorsResponse
{

    private List<AuthorDTO> authors;

    public ViewAuthorsResponse(List<AuthorDTO> authors)
    {
        this.authors = authors == null ? List.of() : authors;   // never send null
    }

    public List<AuthorDTO> getAuthors()
    {

        return authors;
    }
    public void setAuthors(List<AuthorDTO> authors)
    {

        this.authors = authors;
    }
}
