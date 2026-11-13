package com.spacebooking.user;

import java.time.Instant;

public record UserResponse(
        Long id, String firstName, String lastName, String username, String email, Role role, Instant createdAt) {

    public static UserResponse from(AppUser u) {
        return new UserResponse(
                u.getId(), u.getFirstName(), u.getLastName(), u.getUsername(), u.getEmail(), u.getRole(), u.getCreatedAt());
    }
}
