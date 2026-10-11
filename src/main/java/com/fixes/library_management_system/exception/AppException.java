package com.fixes.library_management_system.exception;
import com.fixes.library_management_system.util.enums.ErrorEnum;

public abstract class AppException extends RuntimeException {


        private final String errorCode;
        private final String errorMessage;

        protected AppException(ErrorEnum error)
        {
            super(error.message);              // fills getMessage() for logs
            this.errorCode = error.code;
            this.errorMessage = error.message;
        }

        protected AppException(ErrorEnum error, String detail)
        {
            super(detail);
            this.errorCode = error.code;
            this.errorMessage = detail;
        }

        public String getErrorCode()
        {
            return errorCode;
        }
        public String getErrorMessage()
        {
            return errorMessage;
        }
}

