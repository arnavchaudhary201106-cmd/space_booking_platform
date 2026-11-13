package com.spacebooking.stall;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Books a stall: its details plus the grid cells it covers. Name, contact and description are optional. */
public record StallRequest(
        @NotBlank @Size(max = 255) String stallName,
        @Size(max = 255) String name,
        @Size(max = 255) String contact,
        @Size(max = 1000) String description,
        @NotEmpty List<@Valid CellDto> cells) {}
