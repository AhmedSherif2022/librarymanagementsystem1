package com.fixes.library_management_system.config;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

public class CustomAuthenticationToken extends AbstractAuthenticationToken
{

    private final String token;
    private final String username;

    public CustomAuthenticationToken(String token, String username, Collection<? extends GrantedAuthority> authorities)
    {
        super(authorities);          // a null list becomes an empty list, never null
        this.token = token;
        this.username = username;
        setAuthenticated(true);      // the filter only creates this after the token was verified
    }

    @Override
    public Object getCredentials()
    {
        return null;                 // nothing secret is kept after login
    }

    @Override
    public Object getPrincipal()
    {
        return token;                // kept because other code may read the token from here
    }

    @Override
    public String getName()
    {
        return username;             // the real user name from the token
    }

    // Never print the raw token in logs
    @Override
    public String toString()
    {
        return "CustomAuthenticationToken[user=" + username + ", authorities=" + getAuthorities() + "]";
    }
}
