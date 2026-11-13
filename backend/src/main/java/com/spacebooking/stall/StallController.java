package com.spacebooking.stall;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Stalls are always addressed by event id + venue id. A stall exists once it has been booked. */
@RestController
@RequestMapping("/api/events/{eventId}/venues/{venueId}/stalls")
public class StallController {

    private final StallService service;

    public StallController(StallService service) {
        this.service = service;
    }

    @GetMapping
    public List<StallResponse> list(@PathVariable long eventId, @PathVariable long venueId) {
        return service.find(eventId, venueId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StallResponse book(
            @PathVariable long eventId, @PathVariable long venueId, @Valid @RequestBody StallRequest request) {
        return service.book(eventId, venueId, request);
    }

    @DeleteMapping("/{stallId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long eventId, @PathVariable long venueId, @PathVariable long stallId) {
        service.delete(eventId, venueId, stallId);
    }

    @PatchMapping("/{stallId}/borders")
    public StallResponse updateBorders(
            @PathVariable long eventId,
            @PathVariable long venueId,
            @PathVariable long stallId,
            @Valid @RequestBody BorderUpdateRequest request) {
        return service.updateBorders(eventId, venueId, stallId, request);
    }
}
