package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.util.enums.ErrorEnum;
public class EntityNotFoundException extends AppException
{
    public EntityNotFoundException()
    {
        super(ErrorEnum.ENTITY_NOT_FOUND);
    }

    public EntityNotFoundException(String entity, Long id)
    {
        super(ErrorEnum.ENTITY_NOT_FOUND, entity + " with id " + id + " was not found");
    }
}