package com.fixes.library_management_system.service;
import com.fixes.library_management_system.exception.InvalidTokenException;
import com.fixes.library_management_system.exception.UserNotAuthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
public class TokenService
{

    // JWTRequestFilter only accepts tokens with this issuer
    private static final String ISSUER = "web";

    private final SecretKey signingKey;
    private final long tokenValidityTimeInSeconds;

    // The secret now comes from configuration (an environment variable), not from the source code.
    // If jwt.secret is missing, the app refuses to start instead of running with a weak key.
    public TokenService(@Value("${jwt.secret}") String base64Secret,
                        @Value("${jwt.validity}") long tokenValidityTimeInSeconds)
    {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.tokenValidityTimeInSeconds = tokenValidityTimeInSeconds;
    }
    public String generateToken(Map<String, Object> claims, String subject)
    {
        Date now = new Date();
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuer(ISSUER)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + tokenValidityTimeInSeconds * 1000))
                .signWith(signingKey)
                .compact();
    }
    // Checks the signature and the expiry date. Throws a JwtException if either is wrong.
    public Claims getAllClaimsFromToken(String token)
    {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    public List<String> extractRoles(String token)
    {
        Object roles = getAllClaimsFromToken(token).get("roles");
        if (roles instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
    // Username of whoever is making the current request
    public String getUsernameFromToken()
    {
        return getAllClaimsFromToken(currentToken()).getSubject();
    }
    public void checkUserAuthorization(String userRequestingData)
    {
        String userLoggedIn = getUsernameFromToken();
        if (!userRequestingData.equals(userLoggedIn)) {
            throw new UserNotAuthorizedException();
        }
    }
    // The filter stores the raw token as the principal, so it is read back from there
    private String currentToken()
    {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new InvalidTokenException();
        }
        return authentication.getPrincipal().toString();
    }
}