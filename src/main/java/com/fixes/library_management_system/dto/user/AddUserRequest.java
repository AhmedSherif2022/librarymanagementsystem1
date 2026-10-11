package com.fixes.library_management_system.dto.user;
import com.fixes.library_management_system.Enums.RoleEnum;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.Set;

public class AddUserRequest
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

    @NotEmpty(message = "At least one role is mandatory")
    private Set<RoleEnum> roles = new HashSet<>();

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
    public Set<RoleEnum> getRoles()
    {
        return roles;
    }
    public void setRoles(Set<RoleEnum> roles)
    {
        this.roles = roles;
    }
}