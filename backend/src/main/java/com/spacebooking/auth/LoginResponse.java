package com.spacebooking.auth;

import com.spacebooking.user.UserResponse;

/** {@code accessToken} is short-lived (1 day); {@code refreshToken} lasts 7 days and works once. */
public record LoginResponse(String accessToken, String refreshToken, UserResponse user) {}
