const express = require('express');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Admin');
const { isUndefined, isNotValidSting, isNotValidInteger } = require('../utils/validUtils')
const { errHandle } = require('../utils/errHandle')

//需依路徑排序 有params的排到後面
//新增教練課程
router.post("/coaches/courses", async(req, res, next) =>{
    try{
        const {
            user_id: userId, skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
            max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        if (isUndefined(userId) || isNotValidSting(userId) ||
            isUndefined(skillId) || isNotValidSting(skillId) ||
            isUndefined(name) || isNotValidSting(name) ||
            isUndefined(description) || isNotValidSting(description) ||
            isUndefined(startAt) || isNotValidSting(startAt) ||
            isUndefined(endAt) || isNotValidSting(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidSting(meetingUrl) || !meetingUrl.startsWith('https')) {
            logger.warn('欄位未填寫正確')
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        //取得User資料表的所有方法
        const userRepo = dataSource.getRepository('User');
        //findOne需至少搭配一個selection(如where) 查找id為userId資料
        const existUser = await userRepo.findOne({
            where:{
                id: userId
            }
        })
        //確認使用者存在及身分
        if(!existUser){
            logger.warn('使用者不存在')
            errHandle(res, 400, 'failed', '使用者不存在')
        }else if(existUser.role !== 'COACH'){
            logger.warn('使使用者尚未成為教練')
            errHandle(res, 400, 'failed', '使用者尚未成為教練')
            return
        }
        //建立課程
        const CourseRepo = dataSource.getRepository('Course');
        const newCourse = CourseRepo.create({
            user_id: userId,
            skill_id: skillId,
            name,
            description,
            start_at: startAt,
            end_at: endAt,
            max_participants: maxParticipants,
            meeting_url: meetingUrl
        })
        const savedCourse = await CourseRepo.save(newCourse);
        const course = await CourseRepo.findOne({
            where:{
                id: savedCourse.id
            }
        })
        logger.info('新增教練課程')
        res.status(201).json({
            status:'success',
            data: {
                course: course
            }
        })
    }catch(error){
        logger.error('新增課程錯誤', error);
        next(error);
    }
})
//更新課程
router.put('/coaches/courses/:courseId', async(req, res, next) =>{
    try{
        const {courseId} = req.params;
        const {
            skill_id:skillId, name, description, start_at:startAt, end_at:endAt,
            max_participants:maxParticipants, meeting_url:meetingUrl
        } = req.body;
        if( isNotValidSting(courseId) ||
            isUndefined(skillId) || isNotValidSting(skillId) ||
            isUndefined(name) || isNotValidSting(name) ||
            isUndefined(description) || isNotValidSting(description) ||
            isUndefined(startAt) || isNotValidSting(startAt) ||
            isUndefined(endAt) || isNotValidSting(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidSting(meetingUrl) || !meetingUrl.startsWith('https')
        ){
            logger.warn('欄位未填寫正確')
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        const courseRepo = dataSource.getRepository('Course');
        const existCourse =  await courseRepo.findOne({
            where:{
                id: courseId
            }
        })
        if(!existCourse){
            errHandle(res, 400, 'failed', '課程不存在')
            return
        }
        const updateCourse = await courseRepo.update({
            //條件
            id: courseId
        },{
            //更新內容
            skill_id:skillId,
            name,
            description,
            start_at: startAt,
            end_at: endAt,
            max_participants: maxParticipants,
            meeting_url: meetingUrl
        })
        if(updateCourse.affected === 0){
            errHandle(res, 400, 'failed', '更新課程失敗')
            return
        }
        const result = await courseRepo.findOne({
            where:{
                id:courseId
            }
        })
        res.status(200).json({
            status: 'success',
            data: {
                course: result
            }
        })
    }catch(error){
        logger.error(error);
        next(error);
    }
})
//將使用者改為教練
router.post("/coaches/:userId", async(req, res, next) =>{
    try{
        const { userId } = req.params;
        const { experience_years: experienceYears, description, profile_image_url: profileImageUrl = null } = req.body;
        if(isUndefined(experienceYears) || isNotValidInteger(experienceYears) || isUndefined(description) || isNotValidSting(description)){
            logger.warn('欄位未填寫正確')
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        //檢查大頭貼網址:填入大頭貼且不為字串且非網址且網址結尾不為.png或.jpg
        if((profileImageUrl && isNotValidSting(profileImageUrl)) &&
        !profileImageUrl.startsWith('https') && (!profileImageUrl.endWith('.jpg') || !profileImageUrl.endWith('.jpg'))){
            logger.warn('大頭貼網址錯誤')
            errHandle(res, 400, 'failed', '大頭貼網址錯誤')
            return
        }
        const userRepo = dataSource.getRepository('User');
        const existUser = await userRepo.findOne({
            select: ['id', 'name', 'role'],
            where:{ id: userId }
        })
        if(!existUser){
            logger.warn('使用者不存在')
            errHandle(res, 400, 'failed', '使用者不存在')
        }else if(existUser.role === 'COACH'){
            logger.warn('使用者已為教練')
            errHandle(res, 409, 'failed', '使用者已為教練')
            return
        }
        //更新使用者role為教練
        const coachRepo = dataSource.getRepository('Coach');
        const updatedUser = await userRepo.update({ //將此userId使用者的role改為COACH
            id: userId,
            role: 'USER'
        },{
            role: 'COACH'
        })
        if(updatedUser.affected === 0){
            logger.warn('更新使用者失敗')
            errHandle(res, 400, 'failed', '更新使用者失敗')
            return
        }
        //建立coach資料
        const newCoach = coachRepo.create({
            user_id: userId,
            experience_years: experienceYears,
            description,
            profile_image_url: profileImageUrl
        });
        const savedCoach = await coachRepo.save(newCoach);
        const savedUser = await userRepo.findOne({
            where:{
                id: userId
            }
        });
        logger.info('更新使用者ID:', userId)
        res.status(201).json({
            status: 'success',
            data: {
                user: {
                    name: savedUser.name,
                    role: savedUser.role
                },
                coach: savedCoach
            }
        })
    }catch(error){
        logger.error('更新使用者為教練錯誤', error);
        next(error);
    }
})



module.exports = router;