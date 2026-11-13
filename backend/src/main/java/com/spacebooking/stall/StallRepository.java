package com.spacebooking.stall;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StallRepository extends JpaRepository<Stall, Long> {

    List<Stall> findByEventIdAndVenueIdOrderById(Long eventId, Long venueId);

    Optional<Stall> findByIdAndEventIdAndVenueId(Long id, Long eventId, Long venueId);

    // Derived deletes load the entities, so cells and their borders are removed too.
    void deleteByEventId(Long eventId);

    void deleteByEventIdAndVenueIdNotIn(Long eventId, Collection<Long> venueIds);
}
