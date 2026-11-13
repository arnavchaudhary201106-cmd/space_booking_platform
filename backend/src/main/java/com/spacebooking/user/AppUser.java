package com.spacebooking.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "app_users",
        uniqueConstraints = {
            @UniqueConstraint(columnNames = "username"),
            @UniqueConstraint(columnNames = "email")
        })
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    /** Stored lower-case so lookups are case-insensitive. */
    @Column(nullable = false)
    private String username;

    /** Stored lower-case. */
    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    /** Bumped when the password changes, which invalidates every token issued before. Null counts as 0. */
    private Integer tokenVersion;

    protected AppUser() {}

    public AppUser(
            String firstName, String lastName, String username, String email, String passwordHash, Role role) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
    public int getTokenVersion() { return tokenVersion == null ? 0 : tokenVersion; }

    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.tokenVersion = getTokenVersion() + 1;
    }
}
