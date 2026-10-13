package com.fixes.library_management_system.dto.user;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Setter
@Getter


public class ViewUsersResponse
{
    private List<UserDTO> users;

    public ViewUsersResponse(List<UserDTO> users)
    {
        this.users = users == null ? List.of() : users;
    }

}

