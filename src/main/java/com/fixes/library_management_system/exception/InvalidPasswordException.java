package com.fixes.library_management_system.exception;

import com.fixes.library_management_system.Enums.ErrorEnum;

public class InvalidPasswordException extends AppException
{
    public InvalidPasswordException()
    {
        super(ErrorEnum.INVALID_PASSWORD);
    }
}
