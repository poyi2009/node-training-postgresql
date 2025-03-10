const bcrypt = require('bcrypt');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('User');
const { isUndefined, isNotValidSting, validPassword, validEmail } = require('../utils/validUtils')
const {validator} = require('validator');
const appError = require('../utils/appError');
const { generateJWT } = require('../utils/utilsJWT'); //載入JWT生成

//註冊使用者
async function postSignup(req, res, next){
    try{
        const { name, email, password } = req.body;
        if(isUndefined(name) || isNotValidSting(name) ||
        isUndefined(email) || isNotValidSting(email) ||
        isUndefined(password) || isNotValidSting(password)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        //驗證密碼規則
        if(!validPassword(password)){
            logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
            next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'));
            return
        }
        //驗證信箱格式
        if(!validEmail(email)){
            logger.warn('email不符合規則')
            next(appError(400, 'email不符合規則'));
            return
        }
        //email是否重複
        const userRepo = dataSource.getRepository('User');
        const existUser =  await userRepo.findOneBy({ email });
        if(existUser){
            logger.warn('建立使用者錯誤: Email 已被使用')
            next(appError(409, 'Email已被使用'));
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
        logger.info(`新建立使用者資料:${JSON.stringify(savedUser)}`)
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
}
//使用者登入
async function postLogin(req, res, next){
    try{
        const {email, password} = req.body;
        if(isUndefined(email) || isNotValidSting(email) || isUndefined(password) || isNotValidSting(password)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        if(!validPassword(password)){
            logger.warn('密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
            next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'));
            return
        }
        if(!validEmail(email)){
            logger.warn('email不符合規則')
            next(appError(400, 'email不符合規則'));
            return
        }
        const userRepo = dataSource.getRepository('User');
        const existUser = await userRepo.findOne({
            select:['id', 'name', 'password', 'role'],
            where:{
                email
            }
        });
        if(!existUser){
            logger.warn('使用者不存在')
            next(appError(400, '使用者不存在'));
            return
        }
        const isMatch = await bcrypt.compare(password, existUser.password)
        if(!isMatch){
            next(appError(400, '密碼輸入錯誤'));
            return
        }
        logger.info(`使用者資料: ${JSON.stringify(existUser)}`)
        //生成JWT
        const token = await generateJWT({
                id:existUser.id, //payload
                role:existUser.role
            });
        res.status(201).json({
            status:'success',
            data:{
                token,
                user: existUser.name
            }
        })
    }catch(error){
        logger.error('建立使用者錯誤:', error);
        next(error);
    }
}
//取得個人資料
async function getProfile(req, res, next){
    try{
        const { id } = req.user;
        const userRepo = dataSource.getRepository('User');
        const user = await userRepo.findOneBy({ id });
        logger.info('取得使用者資料')
        res.status(200).json({
            status: 'success',
            data:{
                user:{
                    email:user.email,
                    name:user.name
                }
            }
        })
    }catch(error){
        logger.error('取得個人資料失敗:', error);
        next(error);
    }
}
//更新個人資料
async function putProfile(req, res, next){
    try{
        const {name} = req.body;
        const {id} = req.user;
        if(isUndefined(name) || isNotValidSting(name) || validator.isEmpty(name) || !validator.isLength(name, {min:2, max:10})){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'))
            return
        }
        const userRepo = dataSource.getRepository('User');
        const user = await userRepo.findOneBy({ id });
        if(user.name === name){
            logger.warn('資料未變更')
            next(appError(400, '資料未變更'))
            return
        }
        const updateUser = await userRepo.update({
            id
        },{
            name
        });
        if(updateUser.affected === 0){
            logger.warn('更新使用者失敗')
            next(appError(400, '更新使用者失敗'))
            return
        }
        logger.info('更新使用者資料成功')
        res.status(200).json({
            status:'success'
        })
    }catch(error){
        logger.error('更新使用者資料錯誤',error);
        next(error)
    }
}
//使用者更新密碼
async function postPassword(req, res, next){
    try{
        const {id} = req.user;
        const {password, new_password, confirm_new_password} = req.body;
        if(isUndefined(password) || isNotValidSting(password) || isUndefined(new_password) || isNotValidSting(new_password) ||
        isUndefined(confirm_new_password) || isNotValidSting(confirm_new_password)){
            next(appError(400, '欄位未填寫正確'))
            return
        }
        if(password === new_password){
            next(appError(400, '新密碼不能與舊密碼相同'))
            return
        }
        if(new_password !== confirm_new_password){
            next(appError(400, '新密碼與驗證新密碼不一致'))
            return
        }
        if(!validPassword(new_password)){
            next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
            return
        }
        const userRepo = dataSource.getRepository('User')
        const user = await userRepo
            .createQueryBuilder('user')
            .select('user.password')
            .where('user.id = :userId', {userId: id})
            .getOne();
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            logger.warn('密碼輸入錯誤')
            next(appError(400, '密碼輸入錯誤'))
            return
        }
        const saltRounds = process.env.SALT_ROUNDS || 10;
        const hashPassword = await bcrypt.hash(new_password, Number(saltRounds));
        const updateUser = await userRepo.update({
            id
        },{
            password: hashPassword
        });
        if(updateUser.affected === 0){
            logger.warn('更新密碼失敗')
            next(appError(400, '更新密碼失敗'))
            return
        }
        logger.info('更新密碼成功')
        res.status(200).json({
            status:'success',
            data: null
        })
    }catch(error){
        logger.error('使用者更新密碼錯誤',error)
        next(error)
    }
}
//取得使用者已購買的方案列表
async function getPurchase(req, res, next){
    try{
        const {id} = req.user;
        const purchaseRepo = dataSource.getRepository('CreditPurchase')
        const purchaseList = await purchaseRepo
            .createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.CreditPackage', 'CreditPackage')
            .select([
                'purchased_credits',
                'price_paid',
                'CreditPackage.name AS name',
                'purchased_at'
            ])
            .where('purchase.user_id =:userId',{userId: id})
            .getRawMany();
        res.status(200).json({
            status: 'success',
            data: purchaseList
        })
    }catch(error){
        logger.error('取得已購買方案列表錯誤',error)
        next(error)
    }
}
//取得已預約的課程列表
async function getCourse(req, res, next){
    try{
        const {id} = req.user;
        const userBooking = await dataSource
            .getRepository('CourseBooking')
            .createQueryBuilder('cb')
            .leftJoin('User', 'user', 'user.id = cb.user_id')
            .leftJoin('Course', 'course','course.id = cb.course_id')
            .select([
                'course.name AS name',
                'course.id AS course_id',
                'user.name AS coach_name',
                'cb.status AS status',
                'course.start_at AS start_at',
                'course.end_at AS end_at',
                'course.meeting_url AS meeting_url'
            ])
            .where('cb.user_id = :userId',{userId: id})
            .andWhere('cb.cancelled_at IS NULL')
            .getRawMany();
        res.status(200).json({
            status:'success',
            data: userBooking
        })
    }catch(error){
        logger.error('取得已預約課程列表錯誤',error)
        next(error)
    }
}

module.exports = {
    postSignup,
    postLogin,
    getProfile,
    putProfile,
    postPassword,
    getPurchase,
    getCourse
}