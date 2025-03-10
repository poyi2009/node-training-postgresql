const jwt = require('jsonwebtoken')
const config = require('../config/index')
//生成JWT
const generateJWT = (payload)=> {
    return jwt.sign(
        payload, 
        config.get('secret.jwtSecret'),
        {expiresIn: config.get('secret.jwtExpiresDay')}
    );
}
//解碼JWT
const verifyJWT = (token)=>{
    return new Promise((resolve, reject)=>{
        jwt.verify(token, config.get('secret.jwtSecret'), (err, payload)=>{
            if(err){
                reject(err)
            }else{
                resolve(payload)
            }
        });
    })
}
module.exports = { 
    generateJWT,
    verifyJWT
};
