package com.fixes.library_management_system.config;
import com.fixes.library_management_system.enums.EntityEnum;
import com.fixes.library_management_system.enums.OperationEnum;
import com.fixes.library_management_system.enums.RoleEnum;
import com.fixes.library_management_system.model.Role;
import com.fixes.library_management_system.model.User;
import com.fixes.library_management_system.repository.RoleRepository;
import com.fixes.library_management_system.repository.UserRepository;
import com.fixes.library_management_system.service.AuditlogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

// Makes sure an admin account exists, so someone can log in as admin on a fresh database.
// Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_EMAIL. If they are empty, nothing happens.
@Component
public class AdminInitializer implements ApplicationRunner
{
    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditlogService auditLogService;
    private final String username;
    private final String password;
    private final String email;

    public AdminInitializer(UserRepository userRepository,
                            RoleRepository roleRepository,
                            PasswordEncoder passwordEncoder,
                            AuditlogService auditLogService,
                            @Value("${app.admin.username:}") String username,
                            @Value("${app.admin.password:}") String password,
                            @Value("${app.admin.email:}") String email)
    {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.username = username.trim();
        this.password = password;
        this.email = email.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args)
    {
        if (username.isEmpty()) {
            log.info("No ADMIN_USERNAME set: skipping the admin account setup");
            return;
        }

        Role adminRole = findOrCreateRole(RoleEnum.ROLE_ADMIN);
        Role userRole = findOrCreateRole(RoleEnum.ROLE_USER);

        // The account already exists: only make sure it is an admin. Its password is left alone.
        User existing = userRepository.findByUsername(username).orElse(null);
        if (existing != null) {
            if (existing.getRoles().stream().anyMatch(r -> r.getName() == RoleEnum.ROLE_ADMIN)) {
                log.info("Admin account '{}' is ready", username);
                return;
            }
            existing.getRoles().add(adminRole);
            userRepository.save(existing);
            auditLogService.auditLog(EntityEnum.USER, OperationEnum.UPDATE, existing.getId(), existing.getId());
            log.info("Gave the admin role to the existing account '{}'", username);
            return;
        }

        // A new account needs the same checks as the register form
        if (password.length() < 8 || password.length() > 72) {
            log.warn("Admin account '{}' was not created: ADMIN_PASSWORD must be 8 to 72 characters", username);
            return;
        }
        if (email.isEmpty() || !email.contains("@")) {
            log.warn("Admin account '{}' was not created: ADMIN_EMAIL is missing or not an email", username);
            return;
        }
        if (userRepository.existsByUsernameIgnoreCase(username) || userRepository.existsByEmailIgnoreCase(email)) {
            log.warn("Admin account '{}' was not created: the username or email is already used by another account", username);
            return;
        }

        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);
        roles.add(userRole);
        User saved = userRepository.save(new User(username, passwordEncoder.encode(password), email, roles));
        auditLogService.auditLog(EntityEnum.USER, OperationEnum.CREATE, saved.getId(), saved.getId());
        log.info("Created the admin account '{}'", username);
    }

    // data.sql normally inserts the roles; this covers a database where it did not run.
    private Role findOrCreateRole(RoleEnum name)
    {
        return roleRepository.findByName(name).orElseGet(() -> {
            Role role = new Role();
            role.setName(name);
            return roleRepository.save(role);
        });
    }
}
