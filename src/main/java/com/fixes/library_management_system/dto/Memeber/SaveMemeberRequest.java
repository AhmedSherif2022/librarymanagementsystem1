package com.fixes.library_management_system.dto.Memeber;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class SaveMemeberRequest {

    @NotBlank(message = "Name is mandatory")
    @Size(min = 2, max = 100, message = "Name should be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is mandatory")
    @Email(message = "Email should be valid")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    @NotNull(message = "Membership date is mandatory")
    @PastOrPresent(message = "Membership date cannot be in the future")
    private LocalDate membershipDate;

    // Empty constructor: Jackson needs it to read JSON reliably
    public SaveMemeberRequest()
    {

    }
    public SaveMemeberRequest(String name, String email, LocalDate membershipDate)
    {
        this.name = name;
        this.email = email;
        this.membershipDate = membershipDate;
    }
    public String getName()
    {
        return name;
    }
    public void setName(String name)
    {
        this.name = name;
    }
    public String getEmail()
    {
        return email;
    }
    public void setEmail(String email)
    {
        this.email = email;
    }
    public LocalDate getMembershipDate()
    {
        return membershipDate;
    }
    public void setMembershipDate(LocalDate membershipDate)
    {
        this.membershipDate = membershipDate;
    }
}
