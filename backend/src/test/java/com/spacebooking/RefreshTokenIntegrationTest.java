package com.spacebooking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacebooking.auth.RefreshToken;
import com.spacebooking.auth.RefreshTokenRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:refreshtest")
class RefreshTokenIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RefreshTokenRepository refreshTokens;

    private JsonNode call(String url, String body, int expectedStatus) throws Exception {
        String response = mvc.perform(MockMvcRequestBuilders.post(url).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectedStatus))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return response.isBlank() ? null : json.readTree(response);
    }

    private JsonNode login() throws Exception {
        return call("/api/auth/login", "{\"identifier\":\"superadmin\",\"password\":\"ChangeMe@123\"}", 200);
    }

    private static String refreshBody(String refreshToken) {
        return "{\"refreshToken\":\"" + refreshToken + "\"}";
    }

    private void assertAccessTokenWorks(String accessToken, int expectedStatus) throws Exception {
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void loginReturnsOneDayAccessTokenAndSevenDayRefreshToken() throws Exception {
        JsonNode tokens = login();
        String access = tokens.get("accessToken").asText();
        String refresh = tokens.get("refreshToken").asText();
        assertNotEquals(access, refresh);

        // Access token: exp - iat = 1 day.
        JsonNode claims = json.readTree(Base64.getUrlDecoder().decode(access.split("\\.")[1]));
        assertEquals(Duration.ofDays(1).toSeconds(), claims.get("exp").asLong() - claims.get("iat").asLong());

        // Refresh token: stored for 7 days, and only as a hash.
        RefreshToken stored = refreshTokens.findAll().get(0);
        Duration lifetime = Duration.between(Instant.now(), stored.getExpiresAt());
        assertTrue(lifetime.compareTo(Duration.ofDays(7).minusMinutes(1)) > 0);
        assertTrue(lifetime.compareTo(Duration.ofDays(7).plusMinutes(1)) < 0);
        assertTrue(refreshTokens.findByTokenHash(refresh).isEmpty());
    }

    @Test
    void refreshRotatesTheTokenPair() throws Exception {
        JsonNode first = login();
        String refresh1 = first.get("refreshToken").asText();

        JsonNode second = call("/api/auth/refresh-token", refreshBody(refresh1), 200);
        String access2 = second.get("accessToken").asText();
        String refresh2 = second.get("refreshToken").asText();
        assertNotEquals(refresh1, refresh2);
        assertEquals("superadmin", second.get("user").get("username").asText());
        assertAccessTokenWorks(access2, 200);

        // Each refresh token works once.
        call("/api/auth/refresh-token", refreshBody(refresh1), 401);
        JsonNode third = call("/api/auth/refresh-token", refreshBody(refresh2), 200);
        assertAccessTokenWorks(third.get("accessToken").asText(), 200);
    }

    @Test
    void rejectsInvalidExpiredAndMisusedRefreshTokens() throws Exception {
        JsonNode tokens = login();
        String access = tokens.get("accessToken").asText();
        String refresh = tokens.get("refreshToken").asText();

        call("/api/auth/refresh-token", refreshBody("not-a-real-token"), 401);
        call("/api/auth/refresh-token", "{\"refreshToken\":\" \"}", 400);
        call("/api/auth/refresh-token", "{}", 400);
        // An access token is not a refresh token, and the other way round.
        call("/api/auth/refresh-token", refreshBody(access), 401);
        assertAccessTokenWorks(refresh, 401);

        // Expired.
        RefreshToken stored = refreshTokens.findAll().get(0);
        stored.expireNow();
        refreshTokens.saveAndFlush(stored);
        call("/api/auth/refresh-token", refreshBody(refresh), 401);
    }

    @Test
    void logoutRevokesTheRefreshToken() throws Exception {
        String refresh = login().get("refreshToken").asText();

        call("/api/auth/logout", refreshBody(refresh), 204);
        call("/api/auth/refresh-token", refreshBody(refresh), 401);

        // Logging out twice, or with an unknown token, is harmless.
        call("/api/auth/logout", refreshBody(refresh), 204);
        call("/api/auth/logout", refreshBody("unknown"), 204);
    }

    @Test
    void changingThePasswordInvalidatesOtherSessionsRefreshTokens() throws Exception {
        String accessPhone = login().get("accessToken").asText();
        String refreshLaptop = login().get("refreshToken").asText();

        String response = mvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + accessPhone)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"ChangeMe@123\",\"newPassword\":\"NewPassw0rd!\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode changed = json.readTree(response);

        // The other session can no longer refresh, and the old access token is dead.
        call("/api/auth/refresh-token", refreshBody(refreshLaptop), 401);
        assertAccessTokenWorks(accessPhone, 401);

        // The session that changed the password continues with the new pair.
        assertAccessTokenWorks(changed.get("accessToken").asText(), 200);
        JsonNode refreshed = call("/api/auth/refresh-token", refreshBody(changed.get("refreshToken").asText()), 200);
        assertAccessTokenWorks(refreshed.get("accessToken").asText(), 200);
    }
}
