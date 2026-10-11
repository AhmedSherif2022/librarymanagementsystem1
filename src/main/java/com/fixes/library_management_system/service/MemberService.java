package com.fixes.library_management_system.service;
import com.fixes.library_management_system.dto.Memeber.MemberDTO;
import com.fixes.library_management_system.dto.Memeber.SaveMemeberRequest;
import com.fixes.library_management_system.dto.Memeber.ViewMemebersResponse;
import com.fixes.library_management_system.exception.EntityAlreadyExistingException;
import com.fixes.library_management_system.exception.EntityNotFoundException;
import com.fixes.library_management_system.mapper.MemberMapper;
import com.fixes.library_management_system.model.Member;
import com.fixes.library_management_system.repository.Bookrepository;
import com.fixes.library_management_system.repository.Memberrepository;
import com.fixes.library_management_system.util.enums.EntityEnum;
import com.fixes.library_management_system.util.enums.OperationEnum;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Locale;

@Service
public class MemberService
{
    private final Memberrepository memberRepository;
    private final Bookrepository bookRepository;
    private final MemberMapper memberMapper;
    private final AuditlogService auditLogService;

    public MemberService(Memberrepository memberRepository,
                         Bookrepository bookRepository,
                         MemberMapper memberMapper,
                         AuditlogService auditLogService)
    {
        this.memberRepository = memberRepository;
        this.bookRepository = bookRepository;
        this.memberMapper = memberMapper;
        this.auditLogService = auditLogService;
    }

    // @Transactional is required: borrowedBooks is loaded lazily by the mapper
    @Transactional(readOnly = true)
    public ViewMemebersResponse viewMembers()
    {
        List<MemberDTO> members = memberRepository.findAll().stream()
                .map(memberMapper::toDTO)
                .toList();
        return new ViewMemebersResponse(members);
    }

    @Transactional(readOnly = true)
    public MemberDTO viewMemberDetails(Long id)
    {
        return memberMapper.toDTO(findMember(id));
    }

    @Transactional
    public MemberDTO addMember(SaveMemeberRequest request)
    {
        String email = normalizeEmail(request.getEmail());
        if (memberRepository.existsByEmailIgnoreCase(email)) {
            throw new EntityAlreadyExistingException("A member with this email already exists");
        }
        Member member = memberMapper.toEntity(request);
        member.setEmail(email);

        Member saved = memberRepository.save(member);
        auditLogService.auditLog(EntityEnum.MEMBER, OperationEnum.CREATE, saved.getId());
        return memberMapper.toDTO(saved);
    }

    @Transactional
    public MemberDTO updateMember(Long id, SaveMemeberRequest request)
    {
        Member member = findMember(id);

        String email = normalizeEmail(request.getEmail());
        if (memberRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new EntityAlreadyExistingException("Another member already uses this email");
        }
        memberMapper.updateEntity(request, member);   // keeps the id and the borrowed books
        member.setEmail(email);

        Member saved = memberRepository.save(member);
        auditLogService.auditLog(EntityEnum.MEMBER, OperationEnum.UPDATE, saved.getId());
        return memberMapper.toDTO(saved);
    }

    @Transactional
    public void deleteMember(Long id)
    {
        Member member = findMember(id);
        // The cascade was removed from Member, so borrowed books must be checked here (answer: 409)
        if (bookRepository.existsByMemberId(id)) {
            throw new EntityAlreadyExistingException("Member still has borrowed books and cannot be deleted");
        }
        memberRepository.delete(member);
        auditLogService.auditLog(EntityEnum.MEMBER, OperationEnum.DELETE, id);
    }

    private Member findMember(Long id)
    {
        return memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member", id));
    }
    private String normalizeEmail(String email)
    {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}