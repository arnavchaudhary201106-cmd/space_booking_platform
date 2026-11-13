package com.spacebooking.auth;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A long-lived refresh token. Only a SHA-256 hash is stored, so a copy of the database
 * can't be used to refresh anyone's session.
 */
@Entity
@Table(name = "refresh_tokens", indexes = @Index(columnList = "userId"))
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant expiresAt;

    /** Set when the token was used, logged out or invalidated by a password change. */
    private Instant revokedAt;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected RefreshToken() {}

    public RefreshToken(String tokenHash, Long userId, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isUsable(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public void expireNow() {
        this.expiresAt = Instant.now();
    }
}
