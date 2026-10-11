package com.fixes.library_management_system.dto.user;
public class RegisterResponse
{

    private String username;

    public RegisterResponse(String username)
    {
        this.username = username;
    }

    public String getUsername()
    {
        return username;
    }
    public void setUsername(String username)
    {
        this.username = username;
    }
}