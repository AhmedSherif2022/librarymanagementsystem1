package com.fixes.library_management_system.controller;
import com.fixes.library_management_system.dto.Memeber.MemberDTO;
import com.fixes.library_management_system.dto.Memeber.SaveMemeberRequest;
import com.fixes.library_management_system.dto.Memeber.ViewMemebersResponse;
import com.fixes.library_management_system.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/members")
public class MemberController
{
    private final MemberService memberService;

    public MemberController(MemberService memberService)
    {
        this.memberService = memberService;
    }

    // Any logged-in user (USER or ADMIN)
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ViewMemebersResponse> viewMembers()
    {
        return ResponseEntity.ok(memberService.viewMembers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<MemberDTO> viewMemberDetails(@PathVariable Long id)
    {
        return ResponseEntity.ok(memberService.viewMemberDetails(id));
    }

    // Admin only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MemberDTO> addMember(@Valid @RequestBody SaveMemeberRequest request)
    {
        MemberDTO created = memberService.addMember(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);   // 201 + Location header
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MemberDTO> updateMember(@PathVariable Long id,
                                                  @Valid @RequestBody SaveMemeberRequest request)
    {
        return ResponseEntity.ok(memberService.updateMember(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMember(@PathVariable Long id)
    {
        memberService.deleteMember(id);
    }
}
