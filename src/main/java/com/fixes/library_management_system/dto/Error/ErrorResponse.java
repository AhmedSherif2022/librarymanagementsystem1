package com.fixes.library_management_system.dto.Error;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse
{

    private final String code;
    private final String message;
    private final Map<String, String> fieldErrors;   // only used for validation errors
    // Same constructor as before: every existing call keeps working
    public ErrorResponse(String code, String message)
    {
        this(code, message, null);
    }
    // New: for validation errors, one message per field
    public ErrorResponse(String code, String message, Map<String, String> fieldErrors)
    {
        this.code = code;
        this.message = message;
        this.fieldErrors = fieldErrors;
    }

    public String getCode()
    {
        return code;
    }
    public String getMessage()
    {
        return message;
    }
    public Map<String, String> getFieldErrors()
    {
        return fieldErrors;
    }
}