package com.spacebooking.auth;

import com.spacebooking.user.AppUser;
import com.spacebooking.user.UserResponse;
import org.springframework.stereotype.Service;

/** Issues the access + refresh token pair returned by login, refresh and change-password. */
@Service
public class TokenService {

    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;

    public TokenService(JwtService jwt, RefreshTokenService refreshTokens) {
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
    }

    public LoginResponse issue(AppUser user) {
        return new LoginResponse(jwt.issue(user), refreshTokens.issue(user), UserResponse.from(user));
    }
}
