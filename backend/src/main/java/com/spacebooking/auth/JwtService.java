package com.spacebooking.auth;

import com.spacebooking.user.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String VERSION = "ver";

    private final SecretKey key;
    private final Duration lifetime;

    public JwtService(
            @Value("${app.jwt.secret}") String secret, @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes) {
        // HS256 needs at least 32 bytes; fail at startup rather than on the first login.
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.lifetime = Duration.ofMinutes(accessTokenMinutes);
    }

    public String issue(AppUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("role", user.getRole().name())
                .claim(VERSION, user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(lifetime)))
                .signWith(key)
                .compact();
    }

    /** The username and token version of a valid, unexpired token, or empty. */
    public Optional<TokenInfo> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (claims.getSubject() == null) {
                return Optional.empty();
            }
            // Tokens issued before versions existed have no claim, which means version 0.
            Integer version = claims.get(VERSION, Integer.class);
            return Optional.of(new TokenInfo(claims.getSubject(), version == null ? 0 : version));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public record TokenInfo(String username, int version) {}
}
