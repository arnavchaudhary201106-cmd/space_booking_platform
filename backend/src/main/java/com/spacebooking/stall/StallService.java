package com.spacebooking.stall;

import com.spacebooking.common.BadRequestException;
import com.spacebooking.common.ConflictException;
import com.spacebooking.common.NotFoundException;
import com.spacebooking.event.EventService;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class StallService {

    private static final Set<String> DIRECTIONS = Set.of("top", "bottom", "left", "right");

    private final StallRepository stalls;
    private final StallCellRepository cells;
    private final EventService events;

    public StallService(StallRepository stalls, StallCellRepository cells, EventService events) {
        this.stalls = stalls;
        this.cells = cells;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<StallResponse> find(long eventId, long venueId) {
        events.requireEventVenue(eventId, venueId);
        return stalls.findByEventIdAndVenueIdOrderById(eventId, venueId).stream()
                .map(StallResponse::from)
                .toList();
    }

    /** Books a stall (creates it together with its cells). */
    public StallResponse book(long eventId, long venueId, StallRequest request) {
        events.requireEventVenue(eventId, venueId);

        Set<String> keys = new HashSet<>();
        for (CellDto dto : request.cells()) {
            if (!keys.add(dto.row() + "," + dto.col())) {
                throw new BadRequestException("Duplicate cell " + dto.row() + "," + dto.col());
            }
            if (!DIRECTIONS.containsAll(dto.openBorders())) {
                throw new BadRequestException("Invalid border direction in cell " + dto.row() + "," + dto.col());
            }
        }
        if (cells.anyBooked(eventId, venueId, keys)) {
            throw new ConflictException("Some of these cells are already part of a booked stall.");
        }

        Stall stall = new Stall();
        stall.setEventId(eventId);
        stall.setVenueId(venueId);
        stall.setStallName(request.stallName().trim());
        stall.setBookerName(blankToNull(request.name()));
        stall.setContact(blankToNull(request.contact()));
        stall.setDescription(blankToNull(request.description()));
        for (CellDto dto : request.cells()) {
            StallCell cell = new StallCell();
            cell.setEventId(eventId);
            cell.setVenueId(venueId);
            cell.setCellRow(dto.row());
            cell.setCellCol(dto.col());
            cell.setOpenBorders(new LinkedHashSet<>(dto.openBorders()));
            stall.addCell(cell);
        }

        try {
            return StallResponse.from(stalls.saveAndFlush(stall));
        } catch (DataIntegrityViolationException e) {
            // Two people booking overlapping cells at once: the unique constraint decides.
            throw new ConflictException("Some of these cells are already part of a booked stall.");
        }
    }

    /** Opens or closes the given borders of a booked stall. */
    public StallResponse updateBorders(long eventId, long venueId, long stallId, BorderUpdateRequest request) {
        events.requireEventVenue(eventId, venueId);
        Stall stall = stalls.findByIdAndEventIdAndVenueId(stallId, eventId, venueId)
                .orElseThrow(() -> new NotFoundException("Stall " + stallId + " not found"));

        Map<String, StallCell> byKey = stall.getCells().stream()
                .collect(Collectors.toMap(c -> c.getCellRow() + "," + c.getCellCol(), Function.identity()));

        for (BorderRef ref : request.borders()) {
            StallCell cell = byKey.get(ref.row() + "," + ref.col());
            if (cell == null) {
                throw new BadRequestException("Cell " + ref.row() + "," + ref.col() + " is not part of this stall");
            }
            if (!DIRECTIONS.contains(ref.direction())) {
                throw new BadRequestException("Invalid border direction " + ref.direction());
            }
            if (request.open()) {
                cell.getOpenBorders().add(ref.direction());
            } else {
                cell.getOpenBorders().remove(ref.direction());
            }
        }
        return StallResponse.from(stalls.saveAndFlush(stall));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
