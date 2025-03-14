const express = require('express');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Coaches');
const { isUndefined, isNotValidSting, isNotValidInteger } = require('../utils/validUtils')
const appError = require('../utils/appError');
const {isUUID} = require('validator');

//取得教練列表
router.get('/', async(req, res, next) =>{
    try{
        let {per, page} = req.query; //一頁幾筆,頁碼
        per = Number(per);
        page = Number(page);
        if(isUndefined(per) || isNotValidInteger(per) || isUndefined(page) || isNotValidInteger(page)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        if(per < 0 || page < 0){
            logger.warn('無此頁面')
            next(appError(400, '無此頁面'));
            return
        }
        //取得教練列表
        const coaches = await dataSource.getRepository('Coach').find({
            select: {
                id:true,
                User: {
                    name:true
                }
            },
            take: per , //取幾筆資料
            skip: per * (page - 1) , //需跳過前幾筆資料
            relations:[ 'User' ]
        })
        const coachList = coaches.map(item =>
            ({
                id: item.id,
                name: item.User.name
            })
        )
        logger.info('取得教練列表');
        res.status(200).json({
            status: 'success',
            data: coachList
        })
    }catch(error){
        logger.error('取得教練列表錯誤', error);
        next(error);
    }
})
//取得教練詳細資料
router.get('/:coachId', async(req, res, next) =>{
    try{
        const { coachId } = req.params;
        if(isUndefined(coachId) || isNotValidSting(coachId) || !isUUID(coachId)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const coachRepo = dataSource.getRepository('Coach');
        const existCoach = await coachRepo.findOneBy({ id: coachId });
        if(!existCoach){
            logger.warn('找不到該教練')
            next(appError(400, '找不到該教練'));
            return
        }
        //找出教練的使用者資料
        const userData = await dataSource.getRepository('User').findOne({
            select:['name', 'role'],
            where: {
                id: existCoach.user_id
            }
        });
        logger.info('取得教練詳細資料')
        res.status(200).json({
            status: 'success',
            data:{
                user: userData,
                coach: existCoach
            }
        })
    }catch(error){
        logger.error('取得教練詳細資料錯誤', error);
        next(error);
    }
})

module.exports = router;