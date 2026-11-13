package com.spacebooking.stall;

import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StallCellRepository extends JpaRepository<StallCell, Long> {

    /** True if any of the given "row,col" keys is already part of a stall of this event + venue. */
    @Query("""
            select count(c) > 0 from StallCell c
            where c.eventId = :eventId and c.venueId = :venueId
              and concat(c.cellRow, ',', c.cellCol) in :keys
            """)
    boolean anyBooked(
            @Param("eventId") Long eventId, @Param("venueId") Long venueId, @Param("keys") Collection<String> keys);
}
