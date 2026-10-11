package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.util.enums.ErrorEnum;
public class UserNotAuthorizedException extends AppException
{
    public UserNotAuthorizedException()
    {
        super(ErrorEnum.USER_NOT_AUTHORIZED);
    }
}
