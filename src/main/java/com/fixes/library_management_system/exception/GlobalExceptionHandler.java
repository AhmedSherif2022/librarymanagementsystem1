package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.dto.Error.ErrorResponse;
import com.fixes.library_management_system.Enums.ErrorEnum;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;


@RestControllerAdvice
public class GlobalExceptionHandler
{
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);


    private static final String VALIDATION_CODE = "ERR-007";
    private static final String BAD_REQUEST_CODE = "ERR-008";
    private static final String SERVER_ERROR_CODE = "ERR-500";



    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex)
    {
        return build(HttpStatus.NOT_FOUND, ex);
    }

    @ExceptionHandler(EntityAlreadyExistingException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyExisting(EntityAlreadyExistingException ex)
    {
        return build(HttpStatus.CONFLICT, ex);
    }

    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPassword(InvalidPasswordException ex)
    {
        return build(HttpStatus.UNAUTHORIZED, ex);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex)
    {
        return build(HttpStatus.UNAUTHORIZED, ex);
    }

    @ExceptionHandler(UserNotAuthorizedException.class)
    public ResponseEntity<ErrorResponse> handleNotAuthorized(UserNotAuthorizedException ex)
    {
        return build(HttpStatus.FORBIDDEN, ex);
    }



    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex)
    {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)             // 403
                .body(new ErrorResponse(ErrorEnum.USER_NOT_AUTHORIZED.code,
                        ErrorEnum.USER_NOT_AUTHORIZED.message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex)
    {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)           // 400
                .body(new ErrorResponse(VALIDATION_CODE, "Validation failed", fieldErrors));
    }


    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex)
    {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)           // 400
                .body(new ErrorResponse(BAD_REQUEST_CODE, "Malformed or unreadable request body"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex)
    {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)           // 400
                .body(new ErrorResponse(BAD_REQUEST_CODE, "Invalid value for '" + ex.getName() + "'"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex)
    {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)              // 409
                .body(new ErrorResponse(ErrorEnum.ENTITY_EXISTING.code,
                        "The request conflicts with existing data"));
    }


    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex)
    {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR) // 500
                .body(new ErrorResponse(SERVER_ERROR_CODE, "Unexpected server error"));
    }



    private ResponseEntity<ErrorResponse> build(HttpStatus status, AppException ex)
    {
        return ResponseEntity.status(status)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getErrorMessage()));
    }
}