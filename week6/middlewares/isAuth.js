const appError = require('../utils/appError');
const {verifyJWT} = require('../utils/utilsJWT');
const logger = require('../utils/logger')('isAuth');
const {dataSource} = require('../db/data-source');

const isAuth = async(req, res, next)=>{
    try{
        const authHeaders = req.headers.authorization;
        if(!authHeaders || !authHeaders.startsWith('Bearer')){
            next(appError(401, '請先登入'))
            return
        }
        const token = authHeaders.split(' ')[1];
        if(!token){
            next(appError(401, '請先登入'))
            return
        }
        const payload = await verifyJWT(token);
        const existUser = await dataSource.getRepository('User').findOneBy({ id: payload.id });
        if(!existUser){
            next(appError(401, '無效的 token'))
            return
        }
        req.user = existUser;
        next();
    }catch(error){
        logger.error(error.message)
        next(error)
    }
}
module.exports = {
    isAuth,
}