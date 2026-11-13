package com.spacebooking;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
// The event/stall API needs an admin; role rules are covered in AuthIntegrationTest.
@WithMockUser(roles = "ADMIN")
// Fresh database (and event ids starting at 1) for every test.
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:test")
class ApiIntegrationTest {

    @Autowired MockMvc mvc;

    private static final String EVENT = """
            {"name":"Expo","startDateTime":"2026-12-01T09:00:00","endDateTime":"2026-12-03T18:00:00","description":"d","venueIds":[1,2]}""";

    @Test
    void eventCrudAndStallLifecycle() throws Exception {
        mvc.perform(get("/api/venues")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(4)));

        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(EVENT))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.venues", hasSize(2)));

        String stall = "{\"stallName\":\"S1\",\"cells\":[{\"row\":1,\"col\":2,\"openBorders\":[\"top\"]},"
                + "{\"row\":1,\"col\":3,\"openBorders\":[]}]}";
        // Event ids start at 1 in the fresh in-memory DB.
        mvc.perform(post("/api/events/1/venues/1/stalls").contentType(MediaType.APPLICATION_JSON).content(stall))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cells", hasSize(2)))
                .andExpect(jsonPath("$.cells[0].openBorders[0]").value("top"));
        mvc.perform(get("/api/events/1/venues/1/stalls")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/events/1/venues/2/stalls")).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/events/1/venues/3/stalls")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/events/99/venues/1/stalls")).andExpect(status().isNotFound());

        // Removing venue 1 from the event drops its stalls.
        mvc.perform(put("/api/events/1").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("[1,2]", "[2]")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/events/1/venues/1/stalls")).andExpect(status().isBadRequest());

        mvc.perform(delete("/api/events/1")).andExpect(status().isNoContent());
        mvc.perform(get("/api/events/1")).andExpect(status().isNotFound());
    }

    @Test
    void corsPreflightAllowsPatchFromFrontend() throws Exception {
        mvc.perform(options("/api/events/1/venues/1/stalls/1/borders")
                        .header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test
    void rejectsStartInThePast() throws Exception {
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("2026-12-01T09:00:00", "2020-01-01T09:00:00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsInvalidEvents() throws Exception {
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("2026-12-03T18:00:00", "2026-11-01T09:00:00")))
                .andExpect(status().isBadRequest());
        // Same day, end time before start time.
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("2026-12-03T18:00:00", "2026-12-01T08:00:00")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("[1,2]", "[9]")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(EVENT.replace("Expo", "")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsOverlappingVenueBookings() throws Exception {
        String first = EVENT.replace("[1,2]", "[3,4]"); // 1-3 Dec, venues 3 and 4
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(first))
                .andExpect(status().isCreated());

        // Overlapping period + shared venue 4 -> conflict.
        String overlapping = first.replace("[3,4]", "[4]")
                .replace("2026-12-01T09:00:00", "2026-12-02T09:00:00")
                .replace("2026-12-03T18:00:00", "2026-12-05T18:00:00");
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(overlapping))
                .andExpect(status().isConflict());

        // Same period, different venue -> fine.
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                        .content(first.replace("[3,4]", "[1]")))
                .andExpect(status().isCreated());

        // Back-to-back (starts exactly when the other ends) -> fine.
        String backToBack = first.replace("2026-12-01T09:00:00", "2026-12-03T18:00:00")
                .replace("2026-12-03T18:00:00\",\"desc", "2026-12-04T18:00:00\",\"desc");
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(backToBack))
                .andExpect(status().isCreated());
    }

    @Test
    void deletingEventRemovesStallsAndFreesVenues() throws Exception {
        String eventJson = EVENT.replace("[1,2]", "[1]");
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(eventJson))
                .andExpect(status().isCreated());
        String stall = "{\"stallName\":\"S1\",\"cells\":[{\"row\":1,\"col\":1,\"openBorders\":[]}]}";
        mvc.perform(post("/api/events/1/venues/1/stalls").contentType(MediaType.APPLICATION_JSON).content(stall))
                .andExpect(status().isCreated());

        // Same venue and period is blocked while the event exists.
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(eventJson))
                .andExpect(status().isConflict());

        mvc.perform(delete("/api/events/1")).andExpect(status().isNoContent());
        mvc.perform(get("/api/events/1/venues/1/stalls")).andExpect(status().isNotFound());

        // Venue is free again; the new event (id 2) has no stalls from the deleted one.
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(eventJson))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/events/2/venues/1/stalls")).andExpect(jsonPath("$", hasSize(0)));
        // The same cell can be booked again for the new event.
        mvc.perform(post("/api/events/2/venues/1/stalls").contentType(MediaType.APPLICATION_JSON).content(stall))
                .andExpect(status().isCreated());
    }

    @Test
    void deletingAStallFreesItsCells() throws Exception {
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(EVENT.replace("[1,2]", "[1]")))
                .andExpect(status().isCreated());
        String base = "/api/events/1/venues/1/stalls";
        String stall = "{\"stallName\":\"S1\",\"cells\":[{\"row\":1,\"col\":1,\"openBorders\":[\"top\"]}]}";
        String other = stall.replace("S1", "S2").replace("\"col\":1", "\"col\":7");
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(stall)).andExpect(status().isCreated());
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(other)).andExpect(status().isCreated());

        // Wrong event/venue/stall ids are 404/400 and delete nothing.
        mvc.perform(delete(base + "/99")).andExpect(status().isNotFound());
        mvc.perform(delete("/api/events/1/venues/2/stalls/1")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/events/99/venues/1/stalls/1")).andExpect(status().isNotFound());
        mvc.perform(get(base)).andExpect(jsonPath("$", hasSize(2)));

        // Only the chosen stall goes.
        mvc.perform(delete(base + "/1")).andExpect(status().isNoContent());
        mvc.perform(get(base)).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].stallName").value("S2"));
        mvc.perform(delete(base + "/1")).andExpect(status().isNotFound());

        // The freed cell can be booked again.
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(stall)).andExpect(status().isCreated());
    }

    @Test
    void stallBookingLifecycle() throws Exception {
        String eventJson = EVENT.replace("[1,2]", "[1]");
        mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(eventJson))
                .andExpect(status().isCreated());
        String base = "/api/events/1/venues/1/stalls";

        String stall = "{\"stallName\":\"Food court\",\"cells\":[{\"row\":1,\"col\":1,\"openBorders\":[]},"
                + "{\"row\":1,\"col\":2,\"openBorders\":[]}]}";

        // Stall name is required; name, contact and description are optional.
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(stall.replace("Food court", " ")))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content("{\"stallName\":\"x\",\"cells\":[]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(stall))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stallName").value("Food court"))
                .andExpect(jsonPath("$.name").doesNotExist());

        // Overlapping cells can't be booked twice.
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stallName\":\"Other\",\"name\":\"Asha\",\"cells\":[{\"row\":1,\"col\":2}]}"))
                .andExpect(status().isConflict());

        // PATCH: open then close a border.
        String open = "{\"open\":true,\"borders\":[{\"row\":1,\"col\":1,\"direction\":\"top\"},"
                + "{\"row\":1,\"col\":2,\"direction\":\"top\"}]}";
        mvc.perform(patch(base + "/1/borders").contentType(MediaType.APPLICATION_JSON).content(open))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cells[0].openBorders[0]").value("top"))
                .andExpect(jsonPath("$.cells[1].openBorders[0]").value("top"));
        mvc.perform(patch(base + "/1/borders").contentType(MediaType.APPLICATION_JSON)
                        .content(open.replace("true", "false")))
                .andExpect(jsonPath("$.cells[0].openBorders", hasSize(0)));
        mvc.perform(patch(base + "/1/borders").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true,\"borders\":[{\"row\":9,\"col\":9,\"direction\":\"top\"}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch(base + "/99/borders").contentType(MediaType.APPLICATION_JSON).content(open))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/events/1")).andExpect(status().isNoContent());
    }
}
