package com.fixes.library_management_system.service;

import com.fixes.library_management_system.dto.user.AddUserRequest;
import com.fixes.library_management_system.dto.user.LoginRequest;
import com.fixes.library_management_system.dto.user.LoginResponse;
import com.fixes.library_management_system.dto.user.RegisterResponse;
import com.fixes.library_management_system.dto.user.SaveUserRequest;
import com.fixes.library_management_system.dto.user.UpdateRolesRequest;
import com.fixes.library_management_system.dto.user.UserDTO;
import com.fixes.library_management_system.dto.user.ViewUsersResponse;
import com.fixes.library_management_system.exception.ConflictException;
import com.fixes.library_management_system.exception.EntityAlreadyExistingException;
import com.fixes.library_management_system.exception.EntityNotFoundException;
import com.fixes.library_management_system.exception.InvalidPasswordException;
import com.fixes.library_management_system.mapper.UserMapper;
import com.fixes.library_management_system.model.Role;
import com.fixes.library_management_system.model.User;
import com.fixes.library_management_system.repository.RoleRepository;
import com.fixes.library_management_system.repository.UserRepository;
import com.fixes.library_management_system.enums.EntityEnum;
import com.fixes.library_management_system.enums.OperationEnum;
import com.fixes.library_management_system.enums.RoleEnum;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private final TokenService tokenService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AuditlogService auditLogService;

    public UserService(TokenService tokenService,
                       UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       UserMapper userMapper,
                       AuditlogService auditLogService) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
        this.auditLogService = auditLogService;
    }

    // ---------------------------------------------------------------- login / register

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request)
    {
        // Unknown username and wrong password give the SAME answer,
        // so an attacker cannot find out which usernames exist.
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Login failed: unknown username");
                    return new InvalidPasswordException();
                });
        validatePassword(request.getPassword(), user.getPassword(), user.getUsername());

        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .toList();
        String token = tokenService.generateToken(Map.of("roles", roles), user.getUsername());
        return new LoginResponse(user.getUsername(), token);
    }

    @Transactional
    public RegisterResponse register(SaveUserRequest request)
    {
        String username = request.getUsername().trim();
        String email = normalizeEmail(request.getEmail());
        assertUsernameFree(username);
        assertEmailFree(email);

        // A new account always gets ROLE_USER. The request cannot choose roles.
        Set<Role> roles = new HashSet<>();
        roles.add(findRole(RoleEnum.ROLE_USER));

        User saved = userRepository.save(
                new User(username, passwordEncoder.encode(request.getPassword()), email, roles));
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.CREATE, saved.getId(), saved.getId());
        return new RegisterResponse(saved.getUsername());
    }

    // ---------------------------------------------------------------- my own account

    @Transactional(readOnly = true)
    public UserDTO viewUserDetails()
    {
        return userMapper.toDTO(currentUser());
    }
    @Transactional
    public UserDTO updateUserDetails(SaveUserRequest request)
    {
        User user = currentUser();
        applyChanges(user, request);
        User saved = userRepository.save(user);
        // The user id is passed directly: if the username changed, the token no longer matches it
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.UPDATE, saved.getId(), saved.getId());
        return userMapper.toDTO(saved);
    }

    @Transactional
    public void deleteUserDetails()
    {
        User user = currentUser();
        Long id = user.getId();
        userRepository.delete(user);
        // The user no longer exists, so the audit entry gets the id directly
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.DELETE, id, id);
    }

    // ---------------------------------------------------------------- admin: any account

    @Transactional(readOnly = true)
    public UserDTO viewUserDetails(Long id)
    {
        return userMapper.toDTO(findUser(id));
    }

    @Transactional(readOnly = true)
    public ViewUsersResponse viewUsers()
    {
        List<UserDTO> users = userRepository.findAll().stream()
                .map(userMapper::toDTO)
                .toList();
        return new ViewUsersResponse(users);
    }

    @Transactional
    public UserDTO updateUserDetails(Long id, SaveUserRequest request)
    {
        Long actorId = currentUser().getId();
        User user = findUser(id);
        applyChanges(user, request);
        User saved = userRepository.save(user);
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.UPDATE, saved.getId(), actorId);
        return userMapper.toDTO(saved);
    }

    @Transactional
    public void deleteUserDetails(Long id)
    {
        Long actorId = currentUser().getId();
        User user = findUser(id);
        userRepository.delete(user);
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.DELETE, id, actorId);
    }

    @Transactional
    public UserDTO addUser(AddUserRequest request) {
        Long actorId = currentUser().getId();
        String username = request.getUsername().trim();
        String email = normalizeEmail(request.getEmail());
        assertUsernameFree(username);
        assertEmailFree(email);

        Set<Role> roles = request.getRoles().stream()
                .map(this::findRole)
                .collect(Collectors.toCollection(HashSet::new));

        User saved = userRepository.save(
                new User(username, passwordEncoder.encode(request.getPassword()), email, roles));
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.CREATE, saved.getId(), actorId);
        return userMapper.toDTO(saved);
    }

    // Replaces a user's roles, e.g. to make them an admin or take admin away.
    // The change shows up in their token the next time they log in.
    @Transactional
    public UserDTO updateUserRoles(Long id, UpdateRolesRequest request)
    {
        User actor = currentUser();
        User user = findUser(id);

        boolean wasAdmin = hasRole(user, RoleEnum.ROLE_ADMIN);
        boolean staysAdmin = request.getRoles().contains(RoleEnum.ROLE_ADMIN);
        if (wasAdmin && !staysAdmin) {
            if (user.getId().equals(actor.getId())) {
                throw new ConflictException("You cannot remove your own admin role");
            }
            if (userRepository.countByRoles_Name(RoleEnum.ROLE_ADMIN) <= 1) {
                throw new ConflictException("The last admin cannot lose the admin role");
            }
        }

        Set<Role> roles = request.getRoles().stream()
                .map(this::findRole)
                .collect(Collectors.toCollection(HashSet::new));
        user.setRoles(roles);
        User saved = userRepository.save(user);
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.UPDATE, saved.getId(), actor.getId());
        log.info("User {} changed the roles of {} to {}", actor.getUsername(), saved.getUsername(), request.getRoles());
        return userMapper.toDTO(saved);
    }

    // ---------------------------------------------------------------- helpers

    private boolean hasRole(User user, RoleEnum name) {
        return user.getRoles().stream().anyMatch(r -> r.getName() == name);
    }

    private User currentUser() {
        String username = tokenService.getUsernameFromToken();
        return userRepository.findByUsername(username).orElseThrow(EntityNotFoundException::new);
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User", id));
    }

    private Role findRole(RoleEnum name) {
        return roleRepository.findByName(name).orElseThrow(() -> {
            log.error("Role {} is missing from the roles table", name);
            return new EntityNotFoundException();
        });
    }

    // Applies a profile change. The password is ALWAYS hashed before it is stored.
    private void applyChanges(User user, SaveUserRequest request) {
        String username = request.getUsername().trim();
        String email = normalizeEmail(request.getEmail());

        if (!user.getUsername().equalsIgnoreCase(username)) {
            assertUsernameFree(username);
        }
        if (!user.getEmail().equalsIgnoreCase(email)) {
            assertEmailFree(email);
        }
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
    }

    private void assertUsernameFree(String username) {
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new EntityAlreadyExistingException("Username is already taken");
        }
    }

    private void assertEmailFree(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EntityAlreadyExistingException("Email is already registered");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validatePassword(String rawPassword, String encodedPassword, String username) {
        if (!passwordEncoder.matches(rawPassword, encodedPassword)) {
            log.warn("Login failed: wrong password for user {}", username);
            throw new InvalidPasswordException();
        }
    }
}