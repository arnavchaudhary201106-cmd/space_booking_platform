package com.spacebooking.auth;

import com.spacebooking.user.AppUser;
import com.spacebooking.user.Role;
import com.spacebooking.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first super admin on startup, since only a super admin can create more. */
@Component
class SuperAdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String username;
    private final String email;
    private final String password;

    SuperAdminSeeder(
            UserRepository users,
            PasswordEncoder encoder,
            @Value("${app.bootstrap.super-admin.username}") String username,
            @Value("${app.bootstrap.super-admin.email}") String email,
            @Value("${app.bootstrap.super-admin.password}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.username = username.trim().toLowerCase();
        this.email = email.trim().toLowerCase();
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(Role.SUPER_ADMIN)) {
            return;
        }
        users.save(new AppUser("Super", "Admin", username, email, encoder.encode(password), Role.SUPER_ADMIN));
        log.warn("Created super admin '{}'. Change its password from the default before deploying.", username);
    }
}
