package com.spacebooking.event;

import com.spacebooking.common.BadRequestException;
import com.spacebooking.common.ConflictException;
import com.spacebooking.common.NotFoundException;
import com.spacebooking.stall.StallRepository;
import com.spacebooking.venue.Venue;
import com.spacebooking.venue.VenueCatalog;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EventService {

    private final EventRepository events;
    private final StallRepository stalls;
    private final VenueCatalog venues;

    public EventService(EventRepository events, StallRepository stalls, VenueCatalog venues) {
        this.events = events;
        this.stalls = stalls;
        this.venues = venues;
    }

    @Transactional(readOnly = true)
    public List<EventResponse> findAll() {
        return events.findAll(Sort.by(Sort.Direction.ASC, "startDateTime", "id")).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse findById(long id) {
        return toResponse(getEntity(id));
    }

    public EventResponse create(EventRequest request) {
        Event event = new Event();
        requireStartNotInPast(request.startDateTime());
        apply(event, request);
        checkVenueAvailability(event, -1);
        return toResponse(events.save(event));
    }

    public EventResponse update(long id, EventRequest request) {
        Event event = getEntity(id);
        // Existing events may already have started; only a changed start must be in the future.
        if (!request.startDateTime().equals(event.getStartDateTime())) {
            requireStartNotInPast(request.startDateTime());
        }
        apply(event, request);
        checkVenueAvailability(event, id);
        // Stalls (bookings) of venues that were removed from the event are no longer valid.
        stalls.deleteByEventIdAndVenueIdNotIn(id, event.getVenueIds());
        return toResponse(events.save(event));
    }

    public void delete(long id) {
        Event event = getEntity(id);
        stalls.deleteByEventId(id);
        events.delete(event);
    }

    /** Throws 404 if the event doesn't exist, 400 if the venue isn't part of it. */
    @Transactional(readOnly = true)
    public void requireEventVenue(long eventId, long venueId) {
        if (!getEntity(eventId).getVenueIds().contains(venueId)) {
            throw new BadRequestException("Venue " + venueId + " is not part of event " + eventId);
        }
    }

    private Event getEntity(long id) {
        return events.findById(id).orElseThrow(() -> new NotFoundException("Event " + id + " not found"));
    }

    private void requireStartNotInPast(LocalDateTime start) {
        if (start.isBefore(LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES))) {
            throw new BadRequestException("Start date/time must not be in the past");
        }
    }

    private void apply(Event event, EventRequest request) {
        if (request.endDateTime().isBefore(request.startDateTime())) {
            throw new BadRequestException("End date/time must not be before start date/time");
        }
        for (Long venueId : request.venueIds()) {
            if (!venues.exists(venueId)) {
                throw new BadRequestException("Unknown venue " + venueId);
            }
        }
        event.setName(request.name().trim());
        event.setStartDateTime(request.startDateTime());
        event.setEndDateTime(request.endDateTime());
        event.setDescription(request.description());
        event.setVenueIds(new TreeSet<>(request.venueIds()));
    }

    /** Rejects the event if any of its venues is already used by another event in an overlapping period. */
    private void checkVenueAvailability(Event event, long excludeId) {
        List<Event> overlapping = events.findOverlapping(
                event.getVenueIds(), event.getStartDateTime(), event.getEndDateTime(), excludeId);
        if (overlapping.isEmpty()) {
            return;
        }

        DateTimeFormatter format = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");
        StringBuilder message = new StringBuilder("Venue conflict: ");
        for (Event other : overlapping) {
            String names = other.getVenueIds().stream()
                    .filter(event.getVenueIds()::contains)
                    .map(id -> venues.findById(id).map(Venue::name).orElse("Venue " + id))
                    .collect(java.util.stream.Collectors.joining(", "));
            message.append(names).append(" already booked by \"").append(other.getName()).append("\" (")
                    .append(other.getStartDateTime().format(format)).append(" - ")
                    .append(other.getEndDateTime().format(format)).append("). ");
        }
        throw new ConflictException(message.toString().trim());
    }

    private EventResponse toResponse(Event event) {
        Set<Long> ids = event.getVenueIds();
        List<Venue> eventVenues = venues.findAll().stream().filter(v -> ids.contains(v.id())).toList();
        return new EventResponse(event.getId(), event.getName(), event.getStartDateTime(), event.getEndDateTime(),
                event.getDescription(), eventVenues);
    }
}
