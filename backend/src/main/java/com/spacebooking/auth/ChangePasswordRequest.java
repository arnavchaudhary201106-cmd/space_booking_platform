package com.spacebooking.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
        @NotBlank @Size(min = 8, max = 72) String newPassword) {}
