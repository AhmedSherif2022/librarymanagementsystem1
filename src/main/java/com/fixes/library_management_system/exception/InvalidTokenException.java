package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.util.enums.ErrorEnum;
public class InvalidTokenException extends AppException
{
    public InvalidTokenException()
    {

        super(ErrorEnum.INVALID_TOKEN);
    }
}
