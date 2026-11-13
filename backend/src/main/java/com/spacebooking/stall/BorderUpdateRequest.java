package com.spacebooking.stall;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** Marks the given borders of a stall as open (true) or closed (false). */
public record BorderUpdateRequest(boolean open, @NotEmpty List<@Valid BorderRef> borders) {}
