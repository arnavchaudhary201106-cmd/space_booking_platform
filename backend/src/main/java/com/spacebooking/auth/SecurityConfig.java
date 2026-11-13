package com.spacebooking.auth;

import com.spacebooking.user.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwt, UserRepository users)
            throws Exception {
        http.csrf(csrf -> csrf.disable()) // stateless: the token is sent in a header, never a cookie
                .cors(Customizer.withDefaults()) // uses the mappings from WebConfig
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h.frameOptions(f -> f.sameOrigin())) // H2 console is rendered in frames
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error", "/h2-console/**").permitAll()
                        // The refresh token itself is the credential for these two.
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh-token", "/api/auth/logout")
                        .permitAll()
                        // Every signed-in user, viewers included, can change their own password.
                        .requestMatchers(HttpMethod.POST, "/api/auth/change-password").authenticated()
                        // Only admins and super admins manage users (who can create which role: UserService).
                        .requestMatchers("/api/users/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        // Everyone signed in can read; only admins change events and stalls.
                        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                        .requestMatchers("/api/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .anyRequest().denyAll())
                .addFilterBefore(new JwtAuthFilter(jwt, users), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
