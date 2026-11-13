package com.spacebooking.venue;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/venues")
public class VenueController {

    private final VenueCatalog catalog;

    public VenueController(VenueCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<Venue> list() {
        return catalog.findAll();
    }
}
