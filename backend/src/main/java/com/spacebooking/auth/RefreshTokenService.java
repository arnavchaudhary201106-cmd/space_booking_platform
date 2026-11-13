package com.spacebooking.auth;

import com.spacebooking.common.UnauthorizedException;
import com.spacebooking.user.AppUser;
import com.spacebooking.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Opaque refresh tokens kept in the database. Each token works once: refreshing revokes it
 * and issues a new one ("rotation"), and a password change revokes all of a user's tokens.
 */
@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final Duration lifetime;

    public RefreshTokenService(
            RefreshTokenRepository tokens,
            UserRepository users,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays) {
        this.tokens = tokens;
        this.users = users;
        this.lifetime = Duration.ofDays(refreshTokenDays);
    }

    /** Creates a refresh token for the user and returns its raw value (never stored). */
    @Transactional
    public String issue(AppUser user) {
        Instant now = Instant.now();
        tokens.deleteExpired(now);

        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokens.save(new RefreshToken(hash(raw), user.getId(), now.plus(lifetime)));
        return raw;
    }

    /** Validates and revokes the token (it can't be used again); returns its user. */
    @Transactional
    public AppUser consume(String raw) {
        Instant now = Instant.now();
        RefreshToken token = tokens.findByTokenHash(hash(raw))
                .filter(t -> t.isUsable(now))
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired refresh token"));

        // The update only succeeds once, so two requests can't both use the same token.
        if (tokens.revoke(token.getId(), now) == 0) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        return users.findById(token.getUserId())
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired refresh token"));
    }

    /** Logout: revokes the token if it exists; unknown tokens are ignored. */
    @Transactional
    public void revoke(String raw) {
        tokens.findByTokenHash(hash(raw)).ifPresent(t -> tokens.revoke(t.getId(), Instant.now()));
    }

    @Transactional
    public void revokeAll(Long userId) {
        tokens.revokeAllForUser(userId, Instant.now());
    }

    private static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
