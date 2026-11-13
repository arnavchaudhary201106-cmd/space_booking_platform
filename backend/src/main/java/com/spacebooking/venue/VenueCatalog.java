package com.spacebooking.venue;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Venues are hardcoded for now; ids match the layout files served by the frontend. */
@Component
public class VenueCatalog {

    private static final List<Venue> VENUES = List.of(
            new Venue(1, "Grand Exhibition Hall",
                    "A large 84 m × 116 m hall with 14 exits, restrooms and drinking water on every side. "
                            + "Suited to big trade fairs and multi-zone exhibitions."),
            new Venue(2, "Central Pavilion",
                    "A mid-size 66 m × 90 m pavilion with cargo and service entries and 10 exits. "
                            + "A good fit for expos, showcases and product launches."),
            new Venue(3, "Convention Arena",
                    "Our largest hall at 86 m × 146 m, with a main entry, 14 exits and cargo access. "
                            + "Built for major conventions and high-footfall events."),
            new Venue(4, "Promenade Gallery",
                    "A long 156 m × 43 m gallery with emergency exits along its length. "
                            + "Ideal for linear displays, art shows and pop-up markets."));

    public List<Venue> findAll() {
        return VENUES;
    }

    public Optional<Venue> findById(long id) {
        return VENUES.stream().filter(v -> v.id() == id).findFirst();
    }

    public boolean exists(long id) {
        return findById(id).isPresent();
    }
}
