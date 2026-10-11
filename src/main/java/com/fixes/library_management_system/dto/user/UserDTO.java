package com.fixes.library_management_system.dto.user;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.HashSet;
import java.util.Set;
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO
{

    private Long id;
    private String username;
    private String email;
    private Set<String> roles = new HashSet<>();   // role names such as "USER", never Role entities

    public UserDTO()
    {

    }
    public UserDTO(Long id, String username, String email, Set<String> roles) {

        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles == null ? new HashSet<>() : roles;
    }

    public Long getId()
    {
        return id;
    }
    public void setId(Long id)
    {
        this.id = id;
    }
    public String getUsername()
    {
        return username;
    }
    public void setUsername(String username)
    {
        this.username = username;
    }
    public String getEmail()
    {
        return email;
    }
    public void setEmail(String email)
    {
        this.email = email;
    }
    public Set<String> getRoles()
    {
        return roles;
    }
    public void setRoles(Set<String> roles)
    {
        this.roles = roles == null ? new HashSet<>() : roles;
    }
}