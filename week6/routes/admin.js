const express = require('express');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Admin');
const { isUndefined, isNotValidSting, isNotValidInteger, validDate } = require('../utils/validUtils')
const appError = require('../utils/appError');
const {isAuth} = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');
const {isUUID} = require('validator');

//新增教練課程
router.post("/coaches/courses", isAuth, isCoach, async(req, res, next) =>{
    try{
        const {
            user_id: userId, skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
            max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        if (isUndefined(userId) || isNotValidSting(userId) || !isUUID(userId) ||
            isUndefined(skillId) || isNotValidSting(skillId) || !isUUID(skillId) ||
            isUndefined(name) || isNotValidSting(name) ||
            isUndefined(description) || isNotValidSting(description) ||
            isUndefined(startAt) || isNotValidSting(startAt) || !validDate(startAt) ||
            isUndefined(endAt) || isNotValidSting(endAt) || !validDate(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidSting(meetingUrl) || !meetingUrl.startsWith('https')) {
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const userRepo = dataSource.getRepository('User');
        const existUser = await userRepo.findOneBy({ id: userId });
        if(!existUser){
            logger.warn('使用者不存在')
            next(appError(400, '使用者不存在'));
            return
        }else if(existUser.role !== 'COACH'){
            logger.warn('使用者尚未成為教練')
            next(appError(400, '使用者尚未成為教練'));
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
        const course = await CourseRepo.findOneBy({ id: savedCourse.id });
        logger.info(`新增教練課程ID: ${course.id}`)
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
router.put('/coaches/courses/:courseId', isAuth, isCoach, async(req, res, next) =>{
    try{
        const {courseId} = req.params;
        const {
            skill_id:skillId, name, description, start_at:startAt, end_at:endAt,
            max_participants:maxParticipants, meeting_url:meetingUrl
        } = req.body;
        if( isNotValidSting(courseId) || !isUUID(courseId) ||
            isUndefined(skillId) || isNotValidSting(skillId) || !isUUID(skillId) ||
            isUndefined(name) || isNotValidSting(name) ||
            isUndefined(description) || isNotValidSting(description) ||
            isUndefined(startAt) || isNotValidSting(startAt) || !validDate(startAt) ||
            isUndefined(endAt) || isNotValidSting(endAt) || !validDate(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidSting(meetingUrl) || !meetingUrl.startsWith('https')
        ){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const courseRepo = dataSource.getRepository('Course');
        const existCourse =  await courseRepo.findOneBy({ id: courseId });
        if(!existCourse){
            logger.warn('課程不存在')
            next(appError(400, '課程不存在'));
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
            logger.warn('更新課程失敗')
            next(appError(400, '更新課程失敗'));
            return
        }
        const result = await courseRepo.findOneBy({ id:courseId });
        logger.info(`成功更新課程ID:${courseId}`)
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
        if(!isUUID(userId) || isUndefined(experienceYears) || isNotValidInteger(experienceYears) ||
        isUndefined(description) || isNotValidSting(description) || isNotValidSting(profileImageUrl)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        //確認頭像網址
        if(profileImageUrl){
            if(!profileImageUrl.startsWith('https') || !(profileImageUrl.endsWith('.jpg') || profileImageUrl.endsWith('.png'))){
                logger.warn('大頭貼網址錯誤')
                next(appError(400, '大頭貼網址錯誤'));
                return
            }
        }
        const userRepo = dataSource.getRepository('User');
        const existUser = await userRepo.findOne({
            select: ['id', 'name', 'role'],
            where:{ id: userId }
        })
        if(!existUser){
            logger.warn('使用者不存在')
            next(appError(400, '使用者不存在'));
            return
        }else if(existUser.role === 'COACH'){
            logger.warn('使用者已為教練')
            next(appError(409, '使用者已為教練'));
            return
        }
        //更新使用者role為教練
        const coachRepo = dataSource.getRepository('Coach');
        const updatedUser = await userRepo.update({
            id: userId,
            role: 'USER'
        },{
            role: 'COACH'
        })
        if(updatedUser.affected === 0){
            logger.warn('更新使用者失敗')
            next(appError(400, '更新使用者失敗'));
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
        const savedUser = await userRepo.findOneBy({ id: userId });
        logger.info(`新增教練資料:${savedCoach}`)
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