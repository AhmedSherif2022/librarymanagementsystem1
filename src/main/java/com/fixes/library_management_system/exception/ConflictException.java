package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.enums.ErrorEnum;

public class ConflictException extends AppException
{
    public ConflictException()
    {
        super(ErrorEnum.CONFLICT);
    }
    public ConflictException(String detail)
    {
        super(ErrorEnum.CONFLICT, detail);
    }
}
