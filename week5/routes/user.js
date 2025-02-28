const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('User');
const { isUndefined, isNotValidSting, validPassword, validEmail } = require('../utils/validUtils')
const { errHandle } = require('../utils/errHandle')

//註冊使用者
router.post('/', async(req, res, next) =>{
    try{
        const { name, email, password } = req.body;
        if(isUndefined(name) || isNotValidSting(name) ||
        isUndefined(email) || isNotValidSting(email) ||
        isUndefined(password) || isNotValidSting(password)){
            logger.warn('欄位未填寫正確')
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        //驗證密碼規則
        if(!validPassword(password)){
            logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
            errHandle(res, 400, 'failed', '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
            return
        }
        //驗證信箱格式
        if(!validEmail(email)){
            logger.warn('email不符合規則')
            errHandle(res, 400, 'failed', 'email不符合規則')
            return
        }
        //email是否重複
        const userRepo = dataSource.getRepository('User');
        const existUser =  await userRepo.findOneBy({ email });
        if(existUser){
            logger.warn('建立使用者錯誤: Email 已被使用')
            errHandle(res, 409, 'failed', 'Email已被使用')
            return
        }
        //建立新使用者
        const saltRounds = process.env.SALT_ROUNDS || 10;
        const hashPassword = await bcrypt.hash(password, Number(saltRounds));
        const newUser = userRepo.create({
            name,
            email,
            role: 'USER',
            password: hashPassword
        });
        const savedUser = await userRepo.save(newUser)
        logger.info('新建立的使用者ID:', savedUser.id)
        res.status(201).json({
            status: 'success',
            data:{
                user:{
                    id: savedUser.id,
                    name: savedUser.name
                }
            }
        })
    }catch(error){
        logger.error('建立使用者錯誤:', error);
        next(error);
    }
})
module.exports = router;