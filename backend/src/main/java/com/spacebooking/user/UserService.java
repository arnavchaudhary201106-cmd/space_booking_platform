package com.spacebooking.user;

import com.spacebooking.common.BadRequestException;
import com.spacebooking.common.ForbiddenException;
import com.spacebooking.common.ConflictException;
import com.spacebooking.common.NotFoundException;
import com.spacebooking.common.UnauthorizedException;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    // Letters, digits, '_' and '-', 3-30 characters, with at least one letter and one digit.
    public static final String USERNAME_REGEX = "^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9_-]{3,30}$";
    public static final String USERNAME_MESSAGE =
            "must be 3-30 characters (letters, digits, underscore or hyphen) with at least one letter and one number";
    // local-part@domain.tld, no spaces and a single '@'.
    public static final String EMAIL_REGEX = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
    private static final Pattern USERNAME = Pattern.compile(USERNAME_REGEX);
    private static final Pattern EMAIL = Pattern.compile(EMAIL_REGEX);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    /** Compared against when the username is unknown, so response time doesn't reveal valid usernames. */
    private final String dummyHash;

    public UserService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public UserResponse create(CreateUserRequest request, Role creatorRole) {
        // Super admins can create any role; admins can create admins and viewers; viewers nothing.
        boolean allowed = switch (creatorRole) {
            case SUPER_ADMIN -> true;
            case ADMIN -> request.role() != Role.SUPER_ADMIN;
            case VIEWER -> false;
        };
        if (!allowed) {
            throw new ForbiddenException("You are not allowed to create a " + request.role() + " user");
        }
        String username = normalize(request.username());
        String email = normalize(request.email());
        if (users.existsByUsername(username)) {
            throw new ConflictException("Username '" + username + "' is already taken");
        }
        if (users.existsByEmail(email)) {
            throw new ConflictException("A user with email '" + email + "' already exists");
        }
        AppUser user = new AppUser(
                request.firstName().trim(),
                request.lastName().trim(),
                username,
                email,
                encoder.encode(request.password()),
                request.role());
        return UserResponse.from(users.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        if (username == null || !USERNAME.matcher(username.trim()).matches()) {
            throw new BadRequestException("username " + USERNAME_MESSAGE);
        }
        return !users.existsByUsername(normalize(username));
    }

    @Transactional(readOnly = true)
    public AppUser authenticate(String identifier, String password) {
        // Usernames can't contain '@', so anything shaped like an email address is looked up as one.
        String key = normalize(identifier);
        AppUser user = (EMAIL.matcher(key).matches() ? users.findByEmail(key) : users.findByUsername(key))
                .orElse(null);
        boolean matches = encoder.matches(password, user != null ? user.getPasswordHash() : dummyHash);
        if (user == null || !matches) {
            throw new UnauthorizedException("Invalid username/email or password");
        }
        return user;
    }

    @Transactional
    public AppUser changePassword(String username, String currentPassword, String newPassword) {
        AppUser user = getByUsername(username);
        // 400 rather than 401: the session is fine, only the typed password is wrong.
        if (!encoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (currentPassword.equals(newPassword)) {
            throw new BadRequestException("New password must be different from the current password");
        }
        user.changePassword(encoder.encode(newPassword));
        return users.save(user);
    }

    @Transactional(readOnly = true)
    public AppUser getByUsername(String username) {
        return users.findByUsername(username).orElseThrow(() -> new NotFoundException("User not found"));
    }
}
