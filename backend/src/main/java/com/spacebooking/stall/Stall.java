package com.spacebooking.stall;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A booked stall of a venue, scoped to an event. It covers one or more grid cells. */
@Entity
@Table(name = "stall", indexes = @Index(columnList = "eventId, venueId"))
public class Stall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long venueId;

    @Column(nullable = false)
    private String stallName;

    private String bookerName;

    private String contact;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "stall", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StallCell> cells = new ArrayList<>();

    public Long getId() { return id; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public Long getVenueId() { return venueId; }
    public void setVenueId(Long venueId) { this.venueId = venueId; }
    public String getStallName() { return stallName; }
    public void setStallName(String stallName) { this.stallName = stallName; }
    public String getBookerName() { return bookerName; }
    public void setBookerName(String bookerName) { this.bookerName = bookerName; }
    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<StallCell> getCells() { return cells; }

    public void addCell(StallCell cell) {
        cell.setStall(this);
        cells.add(cell);
    }
}
