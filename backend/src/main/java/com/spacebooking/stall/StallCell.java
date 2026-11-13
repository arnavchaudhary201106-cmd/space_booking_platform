package com.spacebooking.stall;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.LinkedHashSet;
import java.util.Set;

/** One grid cell of a stall. eventId/venueId are repeated here so a cell can only be booked once. */
@Entity
@Table(
        name = "stall_cell",
        uniqueConstraints = @UniqueConstraint(columnNames = {"eventId", "venueId", "cellRow", "cellCol"}))
public class StallCell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stall_id")
    private Stall stall;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long venueId;

    @Column(nullable = false)
    private int cellRow;

    @Column(nullable = false)
    private int cellCol;

    /** Directions (top/bottom/left/right) of this cell's outer border that are marked open. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "stall_cell_open_border", joinColumns = @JoinColumn(name = "cell_id"))
    @Column(name = "direction", nullable = false)
    private Set<String> openBorders = new LinkedHashSet<>();

    public Long getId() { return id; }
    public Stall getStall() { return stall; }
    public void setStall(Stall stall) { this.stall = stall; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public Long getVenueId() { return venueId; }
    public void setVenueId(Long venueId) { this.venueId = venueId; }
    public int getCellRow() { return cellRow; }
    public void setCellRow(int cellRow) { this.cellRow = cellRow; }
    public int getCellCol() { return cellCol; }
    public void setCellCol(int cellCol) { this.cellCol = cellCol; }
    public Set<String> getOpenBorders() { return openBorders; }
    public void setOpenBorders(Set<String> openBorders) { this.openBorders = openBorders; }
}
