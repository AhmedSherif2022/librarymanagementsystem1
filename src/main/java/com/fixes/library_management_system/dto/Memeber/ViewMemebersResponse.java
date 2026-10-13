package com.fixes.library_management_system.dto.Memeber;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Setter
@Getter

public class ViewMemebersResponse
{
    private List<MemberDTO> members;

    public ViewMemebersResponse(List<MemberDTO> members)
    {
        this.members = members == null ? List.of() : members;
    }

}