package com.fixes.library_management_system.mapper;

import com.fixes.library_management_system.dto.user.UserDTO;
import com.fixes.library_management_system.model.Role;
import com.fixes.library_management_system.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserMapper
{
    UserDTO toDTO(User user);


    default String roleToName(Role role)
    {
        return role == null || role.getName() == null ? null : role.getName().name();
    }

}