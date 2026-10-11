package com.fixes.library_management_system.dto.user;
import java.util.List;

public class ViewUsersResponse
{
    private List<UserDTO> users;

    public ViewUsersResponse(List<UserDTO> users)
    {
        this.users = users == null ? List.of() : users;   // never send null
    }
    public List<UserDTO> getUsers()
    {
        return users;
    }
    public void setUsers(List<UserDTO> users)
    {
        this.users = users;
    }
}

