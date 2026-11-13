package com.spacebooking.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Set;

public record EventRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull LocalDateTime startDateTime,
        @NotNull LocalDateTime endDateTime,
        @Size(max = 2000) String description,
        @NotEmpty Set<@NotNull Long> venueIds) {}
