const express = require('express');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Skill');
const { isUndefined, isNotValidSting } = require('../utils/validUtils')
const appError = require('../utils/appError');
const {isUUID} = require('validator');

//取得技能列表
router.get('/', async(req, res, next) =>{
    try{
        const skill = await dataSource.getRepository('Skill').find({
            select:['id', 'name']
        });
        logger.info('取得技能列表')
        res.status(200).json({
            status: 'success',
            data: skill
        })
    }catch(error){
        logger.error(error);
        next(error);
    }
})
//新增技能
router.post('/', async(req, res, next) =>{
    try{
        const {name} = req.body;
        if(isUndefined(name) || isNotValidSting(name)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const skillRepo = dataSource.getRepository('Skill');
        const existName = await skillRepo.findOneBy({ name });
        if(existName){
            logger.warn('資料重複')
            next(appError(409, '資料重複'));
            return
        }
        const newSkill = skillRepo.create({
            name
        });
        const savedSkill = await skillRepo.save(newSkill);
        logger.info(`新增技能ID:${savedSkill.id}`)
        res.status(200).json({
            status: 'success',
            data: savedSkill
        })
    }catch(error){
        logger.error('建立技能錯誤:', error);
        next(error);
    }
})
//刪除技能
router.delete('/:skillId', async(req, res, next) =>{
    try{
        const {skillId} = req.params;
        if(isUndefined(skillId) || isNotValidSting(skillId) || !isUUID(skillId)){
            logger.warn('ID錯誤')
            next(appError(400, 'ID錯誤'));
            return
        }
        const result = await dataSource.getRepository('Skill').delete(skillId);
        if(result.affected === 0){
            logger.warn('刪除技能失敗')
            next(appError(400, '刪除技能失敗'));
            return
        }
        logger.info(`成功刪除技能ID:${skillId}`)
        res.status(200).json({
            status: 'success'
        })
    }catch(error){
        logger.error('刪除技能錯誤', error);
        next(error);
    }
})

module.exports = router