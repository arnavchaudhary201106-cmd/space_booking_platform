package com.spacebooking.auth;

import jakarta.validation.constraints.NotBlank;

/** {@code identifier} is the username or the email address. */
public record LoginRequest(@NotBlank String identifier, @NotBlank String password) {}
