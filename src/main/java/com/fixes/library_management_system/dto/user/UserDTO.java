package com.fixes.library_management_system.dto.user;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;
@Setter
@Getter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO
{

    private Long id;
    private String username;
    private String email;
    private Set<String> roles = new HashSet<>();   // role names such as "USER", never Role entities

    public UserDTO(Long id, String username, String email, Set<String> roles) {

        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles == null ? new HashSet<>() : roles;
    }


}