package com.spacebooking.event;

import com.spacebooking.venue.Venue;
import java.time.LocalDateTime;
import java.util.List;

public record EventResponse(
        Long id,
        String name,
        LocalDateTime startDateTime,
        LocalDateTime endDateTime,
        String description,
        List<Venue> venues) {}
