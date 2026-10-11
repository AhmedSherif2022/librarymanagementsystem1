package com.fixes.library_management_system.mapper;
import com.fixes.library_management_system.dto.author.AuthorDTO;
import com.fixes.library_management_system.dto.author.SaveAuthorRequest;
import com.fixes.library_management_system.model.Author;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface AuthorMapper
{

    AuthorDTO toDTO(Author author);


    @Mapping(target = "id", ignore = true)
    @Mapping(target = "books", ignore = true)
    Author toEntity(SaveAuthorRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "books", ignore = true)
    void updateEntity(SaveAuthorRequest request, @MappingTarget Author author);
}
