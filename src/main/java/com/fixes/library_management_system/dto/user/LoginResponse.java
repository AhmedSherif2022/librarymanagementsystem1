package com.fixes.library_management_system.dto.user;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class LoginResponse
{

    private String username;
    private String token;

    public LoginResponse(String username, String token)
    {
        this.username = username;
        this.token = token;
    }

}