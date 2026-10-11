package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.util.enums.ErrorEnum;

public class EntityAlreadyExistingException extends AppException
{
    public EntityAlreadyExistingException()
    {
        super(ErrorEnum.ENTITY_EXISTING);
    }
    public EntityAlreadyExistingException(String detail)
    {
        super(ErrorEnum.ENTITY_EXISTING, detail);
    }
}
