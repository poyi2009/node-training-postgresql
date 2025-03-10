function appError(httpStatus, errMessage){
    const error = new Error(errMessage);
    error.statusCode = httpStatus; //狀態碼
    error.status = 'failed'; //狀態
    error.isOperational = true; //可預期
    return error
}

module.exports = appError;