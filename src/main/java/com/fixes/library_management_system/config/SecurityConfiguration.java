package com.fixes.library_management_system.config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fixes.library_management_system.service.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration
{

    // 1. The guard that reads the JWT token
    @Bean
    public JWTRequestFilter jwtFilter(TokenService tokenService, ObjectMapper objectMapper)
    {
        return new JWTRequestFilter(tokenService);
    }
    // 2. Stops Spring Boot from registering the same filter a second time
    @Bean
    public FilterRegistrationBean<JWTRequestFilter> jwtFilterRegistration(JWTRequestFilter filter)
    {
        FilterRegistrationBean<JWTRequestFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
    // 3. What to answer when nobody is logged in (401)
    @Bean
    public AuthEntryPoint authEntryPoint(ObjectMapper objectMapper)
    {
        return new AuthEntryPoint(objectMapper);
    }
    // 4. Password hashing
    @Bean
    public PasswordEncoder passwordEncoder()
    {
        return new BCryptPasswordEncoder();
    }
    // 5. Which websites may call the API from a browser
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:http://localhost:3000}") String[] allowedOrigins)
    {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // 6. The main rules
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JWTRequestFilter jwtFilter,
                                           AuthEntryPoint authEntryPoint) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(authEntryPoint))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/users/register", "/users/login").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/", "/index.html", "/css/**", "/js/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}