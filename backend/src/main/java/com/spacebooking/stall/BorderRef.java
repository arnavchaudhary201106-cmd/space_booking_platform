package com.spacebooking.stall;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Identifies one cell edge of a stall. */
public record BorderRef(@Min(0) int row, @Min(0) int col, @NotNull String direction) {}
