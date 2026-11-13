package com.spacebooking.user;

import jakarta.validation.Valid;
import java.util.Map;
import com.spacebooking.common.ForbiddenException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Restricted to SUPER_ADMIN and ADMIN in SecurityConfig. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request, Authentication auth) {
        // The role comes from the database-backed authorities set by the JWT filter.
        Role creator = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .map(Role::valueOf)
                .findFirst()
                .orElseThrow(() -> new ForbiddenException("No role"));
        return service.create(request, creator);
    }

    @GetMapping("/username-available")
    public Map<String, Object> usernameAvailable(@RequestParam String username) {
        return Map.of("username", username.trim(), "available", service.isUsernameAvailable(username));
    }
}
