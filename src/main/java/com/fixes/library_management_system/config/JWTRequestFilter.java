package com.fixes.library_management_system.config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fixes.library_management_system.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JWTRequestFilter extends OncePerRequestFilter
{
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;

    public JWTRequestFilter(TokenService tokenService, ObjectMapper objectMapper)
    {
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
    }
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request)
    {
        String path = request.getServletPath();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.equals("/users/register")
                || path.equals("/users/login");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")) {
            String jwt = header.substring(7);
            try {
                Claims claims = tokenService.getAllClaimsFromToken(jwt);

                // Safe check: works even if the issuer is missing
                if (!"web".equals(claims.getIssuer())) {
                    sendUnauthorized(response, "Invalid token issuer");
                    return;
                }

                List<GrantedAuthority> authorities = tokenService.extractRoles(jwt).stream()
                        .<GrantedAuthority>map(SimpleGrantedAuthority::new)
                        .toList();
                SecurityContextHolder.getContext()
                        .setAuthentication(new CustomAuthenticationToken(jwt, claims.getSubject(), authorities));

            } catch (ExpiredJwtException ex) {
                logger.warn("Expired JWT rejected");
                sendUnauthorized(response, "Token expired");
                return;
            } catch (JwtException | IllegalArgumentException ex) {
                logger.warn("Invalid JWT rejected");
                sendUnauthorized(response, "Token invalid");
                return;
            }
        }

        // No token, or a valid token: continue. Endpoint rules decide who may enter.
        filterChain.doFilter(request, response);
    }

    // Writes a proper 401 JSON answer straight from the filter
    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException
    {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
