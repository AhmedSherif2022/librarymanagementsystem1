package com.fixes.library_management_system.dto.Memeber;
import java.util.List;

public class ViewMemebersResponse
{

    private List<MemberDTO> members;

    public ViewMemebersResponse(List<MemberDTO> members)
    {
        this.members = members == null ? List.of() : members;
    }

    public List<MemberDTO> getMembers()
    {
        return members;
    }
    public void setMembers(List<MemberDTO> members)
    {
        this.members = members;
    }
}