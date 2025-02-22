module.exports = errorHandle = (res, httpCode, errStatus, errMessage)=>{
    const headers = {
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PATCH, POST, GET,OPTIONS,DELETE",
        "Content-Type": "application/json"
    }
        res.writeHead(httpCode, headers);
        res.write(JSON.stringify({
            "status":errStatus,
            "data":errMessage
        }));
        res.end();
}