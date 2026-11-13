package com.spacebooking.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Pattern(regexp = UserService.USERNAME_REGEX, message = UserService.USERNAME_MESSAGE) String username,
        @NotBlank @Email @Pattern(regexp = UserService.EMAIL_REGEX, message = "must be a valid email address") @Size(max = 255) String email,
        // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull Role role) {}
