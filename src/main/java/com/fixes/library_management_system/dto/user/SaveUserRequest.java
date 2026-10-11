package com.fixes.library_management_system.dto.user;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class SaveUserRequest
{

    @NotBlank(message = "Username is mandatory")
    @Size(min = 2, max = 50, message = "Username should be between 2 and 50 characters")
    @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "Username may contain only letters, digits, '.', '_' and '-'")
    private String username;

    @NotBlank(message = "Password is mandatory")
    @Size(min = 8, max = 72, message = "Password should be between 8 and 72 characters")
    private String password;

    @NotBlank(message = "Email is mandatory")
    @Email(message = "Email should be valid")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    // No "roles" field on purpose: the server always gives new accounts the USER role.

    public String getUsername()
    {
        return username;
    }
    public void setUsername(String username)
    {
        this.username = username;
    }
    public String getPassword()
    {
        return password;
    }
    public void setPassword(String password)
    {
        this.password = password;
    }
    public String getEmail()
    {
        return email;
    }
    public void setEmail(String email)
    {
        this.email = email;
    }
}
