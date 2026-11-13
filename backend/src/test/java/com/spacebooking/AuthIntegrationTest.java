package com.spacebooking;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:authtest")
class AuthIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private static final String EVENT =
            """
            {"name":"Expo","startDateTime":"2030-12-01T09:00:00","endDateTime":"2030-12-03T18:00:00","description":"d","venueIds":[1]}""";

    private static String credentials(String identifier, String password) {
        return "{\"identifier\":\"" + identifier + "\",\"password\":\"" + password + "\"}";
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(username, password)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return "Bearer " + json.readTree(body).get("accessToken").asText();
    }

    private String userJson(String username, String role) {
        return "{\"firstName\":\"Asha\",\"lastName\":\"Rao\",\"username\":\"" + username
                + "\",\"email\":\"" + username + "@example.com\",\"password\":\"Passw0rd!\",\"role\":\"" + role + "\"}";
    }

    private void createUser(String bearer, String username, String role) throws Exception {
        mvc.perform(post("/api/users")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson(username, role)))
                .andExpect(status().isCreated());
    }

    @Test
    void loginIssuesTokenForSeededSuperAdmin() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SuperAdmin\",\"password\":\"ChangeMe@123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

        String bearer = login("superadmin", "ChangeMe@123");
        mvc.perform(get("/api/auth/me").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("superadmin"));
    }

    @Test
    void loginWorksWithEmailOrUsername() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");
        createUser(admin, "leo1", "VIEWER");

        // Email (any case) and username both work and return the same user.
        for (String identifier : new String[] {"leo1@example.com", "LEO1@Example.com", "leo1", "Leo1"}) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(credentials(identifier, "Passw0rd!")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user.username").value("leo1"));
        }
        // The seeded super admin too.
        login("superadmin@spacebooking.local", "ChangeMe@123");

        // Wrong password, unknown or malformed email, and a blank or missing identifier are rejected.
        for (String body : new String[] {
            "{\"identifier\":\"leo1@example.com\",\"password\":\"nope\"}",
            "{\"identifier\":\"ghost@example.com\",\"password\":\"Passw0rd!\"}",
            // Not shaped like an email, so treated as a username that doesn't exist.
            "{\"identifier\":\"leo1@example\",\"password\":\"Passw0rd!\"}",
            "{\"identifier\":\"@example.com\",\"password\":\"Passw0rd!\"}",
        }) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized());
        }
        for (String body : new String[] {
            "{\"identifier\":\" \",\"password\":\"Passw0rd!\"}",
            "{\"password\":\"Passw0rd!\"}",
        }) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void rejectsBadCredentialsAndMissingOrInvalidTokens() throws Exception {
        String bad = "{\"identifier\":\"superadmin\",\"password\":\"wrong\"}";
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"nobody\",\"password\":\"whatever1\"}"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/events")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/events").header("Authorization", "Bearer not.a.token"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/venues")).andExpect(status().isUnauthorized());
    }

    @Test
    void creationRulesPerRole() throws Exception {
        String superAdmin = login("superadmin", "ChangeMe@123");
        createUser(superAdmin, "alice1", "ADMIN");
        createUser(superAdmin, "bob1", "VIEWER");

        // A newly created admin can log in and create users too.
        String alice1 = login("alice1", "Passw0rd!");
        createUser(alice1, "carol1", "VIEWER");
        createUser(alice1, "dave1", "ADMIN");

        // Admins can't create super admins; super admins can.
        mvc.perform(post("/api/users")
                        .header("Authorization", alice1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("eve1", "SUPER_ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/username-available?username=eve1").header("Authorization", alice1))
                .andExpect(jsonPath("$.available").value(true));
        createUser(superAdmin, "sam1", "SUPER_ADMIN");
        String sam1 = login("sam1", "Passw0rd!");
        createUser(sam1, "tina1", "ADMIN");
        createUser(sam1, "uma1", "SUPER_ADMIN");

        // The password is never returned.
        mvc.perform(post("/api/users")
                        .header("Authorization", superAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("frank1", "VIEWER")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("VIEWER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        // Viewers can't create users or check usernames.
        String bob1 = login("bob1", "Passw0rd!");
        mvc.perform(post("/api/users")
                        .header("Authorization", bob1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("grace1", "VIEWER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/username-available?username=grace1").header("Authorization", bob1))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(userJson("grace1", "VIEWER")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validatesNewUsers() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");
        String valid = userJson("heidi1", "VIEWER");

        String[] invalid = {
            valid.replace("heidi1@example.com", "not-an-email"),
            valid.replace("Passw0rd!", "short"),
            valid.replace("\"username\":\"heidi1\"", "\"username\":\"a b\""),
            valid.replace("\"username\":\"heidi1\"", "\"username\":\"ab\""),
            valid.replace("\"firstName\":\"Asha\"", "\"firstName\":\" \""),
            valid.replace("\"lastName\":\"Rao\"", "\"lastName\":\"\""),
            valid.replace("\"role\":\"VIEWER\"", "\"role\":\"OWNER\""),
            valid.replace(",\"role\":\"VIEWER\"", ""),
        };
        for (String body : invalid) {
            mvc.perform(post("/api/users")
                            .header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void enforcesUsernameAndEmailFormat() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");
        String valid = userJson("zed1", "VIEWER");

        // Needs a letter and a digit; only letters, digits, '_' and '-'; 3-30 characters.
        for (String bad : new String[] {"abcdef", "123456", "a1", "a.b1", "a b1", "ab1!", "a1" + "x".repeat(29)}) {
            mvc.perform(post("/api/users")
                            .header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(valid.replace("\"username\":\"zed1\"", "\"username\":\"" + bad + "\"")))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/users/username-available").param("username", bad).header("Authorization", admin))
                    .andExpect(status().isBadRequest());
        }
        for (String ok : new String[] {"ab1", "A-1", "user_name-2", "9lives", "a1" + "x".repeat(28)}) {
            mvc.perform(get("/api/users/username-available").param("username", ok).header("Authorization", admin))
                    .andExpect(jsonPath("$.available").value(true));
        }
        mvc.perform(post("/api/users")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("user_name-2", "VIEWER")))
                .andExpect(status().isCreated());

        // Emails need a domain with a dot.
        for (String bad : new String[] {"zed1@example", "@example.com", "zed1@.com", "zed 1@example.com", "a@@b.com"}) {
            mvc.perform(post("/api/users")
                            .header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(valid.replace("zed1@example.com", bad)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void usernameAvailabilityAndUniqueness() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");

        mvc.perform(get("/api/users/username-available?username=ivan1").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));

        createUser(admin, "ivan1", "VIEWER");

        // Case-insensitive.
        for (String taken : new String[] {"ivan1", "IVAN1"}) {
            mvc.perform(get("/api/users/username-available?username=" + taken).header("Authorization", admin))
                    .andExpect(jsonPath("$.available").value(false));
        }
        mvc.perform(get("/api/users/username-available?username=a").header("Authorization", admin))
                .andExpect(status().isBadRequest());

        // Duplicate username (any case) and duplicate email are conflicts.
        mvc.perform(post("/api/users")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("IVAN1", "ADMIN")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/users")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("judy1", "ADMIN").replace("judy1@example.com", "ivan1@example.com")))
                .andExpect(status().isConflict());

        // The new user logs in with any casing of the username.
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"Ivan1\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void viewersReadButOnlyAdminsChangeEventsAndStalls() throws Exception {
        String superAdmin = login("superadmin", "ChangeMe@123");
        createUser(superAdmin, "viewer1", "VIEWER");
        createUser(superAdmin, "admin1", "ADMIN");
        String viewer = login("viewer1", "Passw0rd!");
        String admin = login("admin1", "Passw0rd!");

        mvc.perform(post("/api/events")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT))
                .andExpect(status().isCreated());
        String stall = "{\"stallName\":\"S1\",\"cells\":[{\"row\":1,\"col\":1,\"openBorders\":[]}]}";
        mvc.perform(post("/api/events/1/venues/1/stalls")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(stall))
                .andExpect(status().isCreated());

        // Viewers can read...
        mvc.perform(get("/api/venues").header("Authorization", viewer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)));
        mvc.perform(get("/api/events").header("Authorization", viewer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/events/1/venues/1/stalls").header("Authorization", viewer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // ...but not write.
        mvc.perform(post("/api/events")
                        .header("Authorization", viewer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/events/1")
                        .header("Authorization", viewer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/events/1").header("Authorization", viewer)).andExpect(status().isForbidden());
        mvc.perform(post("/api/events/1/venues/1/stalls")
                        .header("Authorization", viewer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(stall.replace("\"col\":1", "\"col\":5")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/events/1/venues/1/stalls/1").header("Authorization", viewer))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/events/1/venues/1/stalls/1/borders")
                        .header("Authorization", viewer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true,\"borders\":[{\"row\":1,\"col\":1,\"direction\":\"top\"}]}"))
                .andExpect(status().isForbidden());

        // Nothing changed.
        mvc.perform(get("/api/events/1/venues/1/stalls").header("Authorization", admin))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].cells[0].openBorders", hasSize(0)));
    }

    @Test
    void changePassword() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");
        createUser(admin, "nina1", "VIEWER"); // viewers can change their own password
        String old = login("nina1", "Passw0rd!");
        String url = "/api/auth/change-password";

        // Must be signed in.
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(passwords("Passw0rd!", "NewPassw0rd!")))
                .andExpect(status().isUnauthorized());

        // Wrong current password, same password, too short and missing fields are 400
        // (not 401, which would sign the user out); nothing changes.
        for (String body : new String[] {
            passwords("wrong-password", "NewPassw0rd!"),
            passwords("Passw0rd!", "Passw0rd!"),
            passwords("Passw0rd!", "short"),
            passwords("Passw0rd!", "x".repeat(73)),
            passwords("Passw0rd!", " "),
            "{\"currentPassword\":\"Passw0rd!\"}",
        }) {
            mvc.perform(post(url).header("Authorization", old).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/auth/me").header("Authorization", old)).andExpect(status().isOk());

        String body = mvc.perform(post(url)
                        .header("Authorization", old)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(passwords("Passw0rd!", "NewPassw0rd!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("nina1"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String fresh = "Bearer " + json.readTree(body).get("accessToken").asText();

        // The old password no longer works, the new one does, and old tokens are rejected.
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("nina1", "Passw0rd!")))
                .andExpect(status().isUnauthorized());
        login("nina1", "NewPassw0rd!");
        mvc.perform(get("/api/auth/me").header("Authorization", old)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", fresh)).andExpect(status().isOk());

        // Other users are unaffected.
        mvc.perform(get("/api/auth/me").header("Authorization", admin)).andExpect(status().isOk());
    }

    private static String passwords(String current, String next) {
        return "{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + next + "\"}";
    }

    @Test
    void passwordsAreStoredHashed() throws Exception {
        String admin = login("superadmin", "ChangeMe@123");
        String body = mvc.perform(post("/api/users")
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("kim1", "VIEWER")))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        // Nothing in the response resembles the submitted password.
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("Passw0rd!"));
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"kim1\",\"password\":\"passw0rd!\"}"))
                .andExpect(status().isUnauthorized());
    }
}
