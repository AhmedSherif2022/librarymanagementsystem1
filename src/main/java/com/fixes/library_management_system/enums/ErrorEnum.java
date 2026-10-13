package com.fixes.library_management_system.enums;
public enum ErrorEnum
{
    INVALID_PASSWORD("ERR-001", "Invalid User Password"),
    INVALID_TOKEN("ERR-002", "Invalid User Token"),
    INVALID_AUTHENTICATION("ERR-003", "Invalid User Authentication"),
    ENTITY_EXISTING("ERR-004", "Entity already exists"),
    ENTITY_NOT_FOUND("ERR-005", "Entity not found"),
    USER_NOT_AUTHORIZED("ERR-006", "User not authorized"),
    CONFLICT("ERR-009", "Request conflicts with the current state");


    public final String code;
    public final String message;
    ErrorEnum(String code, String message)
    {
        this.code = code;
        this.message = message;
    }

}
