package com.spacebooking.stall;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;

public record StallResponse(
        Long id,
        String stallName,
        String name,
        String contact,
        String description,
        LocalDateTime createdAt,
        List<CellDto> cells) {

    static StallResponse from(Stall s) {
        List<CellDto> cells = s.getCells().stream()
                .sorted(Comparator.comparingInt(StallCell::getCellRow).thenComparingInt(StallCell::getCellCol))
                .map(c -> new CellDto(c.getCellRow(), c.getCellCol(), new LinkedHashSet<>(c.getOpenBorders())))
                .toList();
        return new StallResponse(s.getId(), s.getStallName(), s.getBookerName(), s.getContact(),
                s.getDescription(), s.getCreatedAt(), cells);
    }
}
