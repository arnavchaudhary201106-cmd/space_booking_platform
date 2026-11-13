package com.spacebooking.auth;

import com.spacebooking.user.AppUser;
import com.spacebooking.user.UserResponse;
import com.spacebooking.user.UserService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService users;
    private final TokenService tokens;
    private final RefreshTokenService refreshTokens;

    public AuthController(UserService users, TokenService tokens, RefreshTokenService refreshTokens) {
        this.users = users;
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return tokens.issue(users.authenticate(request.identifier(), request.password()));
    }

    /** Swaps a refresh token for a new access + refresh token pair. The old refresh token stops working. */
    @PostMapping("/refresh-token")
    public LoginResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return tokens.issue(refreshTokens.consume(request.refreshToken()));
    }

    /** Revokes the refresh token, ending that session. Always 204, so it can't be used to probe tokens. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshTokenRequest request) {
        refreshTokens.revoke(request.refreshToken());
    }

    /**
     * Any signed-in user. Returns a new token pair: the old access tokens stop working and every
     * refresh token (all devices) is revoked.
     */
    @PostMapping("/change-password")
    public LoginResponse changePassword(
            @Valid @RequestBody ChangePasswordRequest request, Principal principal) {
        AppUser user = users.changePassword(principal.getName(), request.currentPassword(), request.newPassword());
        refreshTokens.revokeAll(user.getId());
        return tokens.issue(user);
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return UserResponse.from(users.getByUsername(principal.getName()));
    }
}
