package com.fixes.library_management_system.controller;

import com.fixes.library_management_system.dto.user.AddUserRequest;
import com.fixes.library_management_system.dto.user.LoginRequest;
import com.fixes.library_management_system.dto.user.LoginResponse;
import com.fixes.library_management_system.dto.user.RegisterResponse;
import com.fixes.library_management_system.dto.user.SaveUserRequest;
import com.fixes.library_management_system.dto.user.UserDTO;
import com.fixes.library_management_system.dto.user.ViewUsersResponse;
import com.fixes.library_management_system.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/users")
public class UserController
{
    private final UserService userService;

    public UserController(UserService userService)
    {
        this.userService = userService;
    }

    // ------------------------------------------------------------ public (no token)

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody SaveUserRequest request)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request)
    {
        return ResponseEntity.ok(userService.login(request));
    }

    // ------------------------------------------------------------ my own account

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<UserDTO> viewUserDetails()
    {
        return ResponseEntity.ok(userService.viewUserDetails());
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<UserDTO> updateUserDetails(@Valid @RequestBody SaveUserRequest request)
    {
        return ResponseEntity.ok(userService.updateUserDetails(request));
    }

    @DeleteMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)   // 204, no body
    public void deleteUserDetails()
    {
        userService.deleteUserDetails();
    }

    // ------------------------------------------------------------ admin only

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ViewUsersResponse> viewUsers()
    {
        return ResponseEntity.ok(userService.viewUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> viewUserDetails(@PathVariable Long id)
    {
        return ResponseEntity.ok(userService.viewUserDetails(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> updateUserDetails(@PathVariable Long id,
                                                     @Valid @RequestBody SaveUserRequest request)
    {
        return ResponseEntity.ok(userService.updateUserDetails(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)   // 204, no body
    public void deleteUserDetails(@PathVariable Long id)
    {
        userService.deleteUserDetails(id);
    }

    // Accepts roles from the request body, so it MUST stay admin only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> addUser(@Valid @RequestBody AddUserRequest request)
    {
        UserDTO created = userService.addUser(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);   // 201 + Location header
    }
}