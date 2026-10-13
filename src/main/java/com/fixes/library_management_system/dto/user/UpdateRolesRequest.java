package com.fixes.library_management_system.dto.user;
import com.fixes.library_management_system.enums.RoleEnum;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
public class UpdateRolesRequest
{

    @NotEmpty(message = "At least one role is mandatory")
    private Set<RoleEnum> roles = new HashSet<>();

}
