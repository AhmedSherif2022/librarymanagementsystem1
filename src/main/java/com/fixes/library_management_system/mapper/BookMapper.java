package com.fixes.library_management_system.mapper;

import com.fixes.library_management_system.dto.Book.BookDTO;
import com.fixes.library_management_system.dto.Book.SaveBookRequest;
import com.fixes.library_management_system.model.Book;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface BookMapper
{

    @Mapping(source = "author.id", target = "authorId")
    @Mapping(source = "author.name", target = "authorName")
    @Mapping(source = "member.id", target = "memberId")
    @Mapping(source = "member.name", target = "memberName")
    BookDTO toDTO(Book book);


    @Mapping(target = "id", ignore = true)
    @Mapping(target = "author", ignore = true)
    @Mapping(target = "member", ignore = true)
    Book toEntity(SaveBookRequest request);


    @Mapping(target = "id", ignore = true)
    @Mapping(target = "author", ignore = true)
    @Mapping(target = "member", ignore = true)
    void updateEntity(SaveBookRequest request, @MappingTarget Book book);
}
