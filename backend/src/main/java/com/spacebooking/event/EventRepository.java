package com.spacebooking.event;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * Events other than {@code excludeId} that use any of the given venues and whose time range
     * overlaps [start, end). Back-to-back events (one ends exactly when the other starts) don't overlap.
     */
    @Query("""
            select distinct e from Event e join e.venueIds v
            where v in :venueIds
              and e.id <> :excludeId
              and e.startDateTime < :end
              and e.endDateTime > :start
            order by e.startDateTime
            """)
    List<Event> findOverlapping(
            @Param("venueIds") Collection<Long> venueIds,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("excludeId") long excludeId);
}
