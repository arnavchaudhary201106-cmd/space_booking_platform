package com.spacebooking.stall;

import jakarta.validation.constraints.Min;
import java.util.Set;

/** A grid cell. {@code openBorders} holds any of: top, bottom, left, right. */
public record CellDto(@Min(0) int row, @Min(0) int col, Set<String> openBorders) {

    public CellDto {
        openBorders = openBorders == null ? Set.of() : openBorders;
    }
}
