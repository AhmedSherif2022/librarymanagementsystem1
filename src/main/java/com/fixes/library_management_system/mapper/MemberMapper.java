package com.fixes.library_management_system.mapper;
import com.fixes.library_management_system.dto.Memeber.MemberDTO;
import com.fixes.library_management_system.dto.Memeber.SaveMemeberRequest;
import com.fixes.library_management_system.model.Book;
import com.fixes.library_management_system.model.Member;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface MemberMapper
{

    // Must run inside a @Transactional service method, because borrowedBooks loads lazily
    MemberDTO toDTO(Member member);

    // Small summary of one book: just id, title and isbn
    MemberDTO.BorrowedBook toBorrowedBook(Book book);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "borrowedBooks", ignore = true)
    Member toEntity(SaveMemeberRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "borrowedBooks", ignore = true)
    void updateEntity(SaveMemeberRequest request, @MappingTarget Member member);
}

