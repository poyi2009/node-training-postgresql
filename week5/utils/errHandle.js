function errHandle(res, httpCode, errStatus, errMessage){
    return (
        res.status(httpCode).json({
            status: errStatus,
            message: errMessage
        })
    )
}

module.exports = {
    errHandle
}