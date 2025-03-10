const {dataSource} = require('../db/data-source');
const { IsNull } = require('typeorm');
const logger = require('../utils/logger')('Course');
const {isUndefined, isNotValidSting} = require('../utils/validUtils');
const appError = require('../utils/appError');
const {isUUID} = require('validator');

//取得課程列表
async function getCourse(req, res, next){
    try{
        const courseRepo = dataSource.getRepository('Course');
        const courseList = await courseRepo
            .createQueryBuilder('course')
            .innerJoin('course.User', 'user')
            .innerJoin('course.Skill', 'skill')
            .select([
                'course.id AS id',
                'user.name AS coach_name',
                'skill.name AS skill_name',
                'course.name AS name',
                'course.description AS description',
                'course.start_at AS start_at',
                'course.end_at AS end_at',
                'course.max_participants AS max_participants'
            ])
            .getRawMany()
        logger.info('取得課程列表')
        res.status(200).json({
            status:'success',
            data: courseList
        })
    }catch(error){
        logger.error('取得課程列表錯誤',error)
        next(error)
    }
}
//報名課程
async function postBooking(req, res, next){
    try{
        const {courseId} = req.params;
        const {id} = req.user;
        if(isUndefined(courseId) || isNotValidSting(courseId) || !isUUID(courseId)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'))
            return
        }
        const courseRepo = dataSource.getRepository('Course');
        const existCourse = await courseRepo.findOneBy({ id:courseId });
        if(!existCourse){
            logger.warn('ID錯誤')
            next(appError(400, 'ID錯誤'))
            return
        }
        //確認剩餘名額 = 課程最大上課人數 - 該課程預約數量
        const bookingRepo = dataSource.getRepository('CourseBooking')
        const count = await bookingRepo.count({
            where:{
                course_id:courseId,
                cancelled_at:IsNull()
            }
        })
        if(existCourse.max_participants - count === 0){
            logger.warn('已達最大參加人數，無法參加')
            next(appError(400, '已達最大參加人數，無法參加'))
            return
        }
        //確認使用者剩餘堂數 = 購買總堂數 - 已預約課程數
        const purchaseRepo = dataSource.getRepository('CreditPurchase')
        const creditSum = await purchaseRepo.sum(
            'purchased_credits',
            {
                user_id: id
            }
        )
        const bookingCount = await bookingRepo.count({
            where:{
                user_id: id,
                cancelled_at:IsNull()
            }
        })
        if(creditSum - bookingCount === 0){
            logger.warn('已無可使用堂數')
            next(appError(400, '已無可使用堂數'))
            return
        }
        //確認使用者有無報名此課程
        const bookingRecord = await bookingRepo.find({
            where:{
                user_id:id,
                course_id:courseId,
                cancelled_at:IsNull()
            }
        })
        if(bookingRecord.length !== 0){
            logger.warn('已經報名過此課程')
            next(appError(400, '已經報名過此課程'))
            return
        }
        const newBooking = bookingRepo.create({
            user_id: id,
            course_id: courseId,
            status:'pending'
        })
        const savedBooking = await bookingRepo.save(newBooking);
        logger.info(`成功報名課程ID:${savedBooking.id}`)
        res.status(200).json({
            status: 'success',
            data: null
        })
    }catch(error){
        logger.error('報名課程錯誤',error)
        next(error)
    }
}
//取消課程
async function deleteBooking(req, res, next){
    try{
        const {courseId} = req.params;
        const {id} = req.user;
        if(isUndefined(courseId) || isNotValidSting(courseId) || !isUUID(courseId)){
            next(appError(400, '欄位未填寫正確'))
            return
        }
        const courseRepo = dataSource.getRepository('Course');
        const existCourse = await courseRepo.findOneBy({ id:courseId });
        if(!existCourse){
            logger.warn('課程不存在')
            next(appError(400, '課程不存在'))
            return
        }
        const bookingRepo = dataSource.getRepository('CourseBooking');
        const existBooking = await bookingRepo.findOne({
            where:{
                user_id:id,
                course_id:courseId,
                cancelled_at:IsNull()
            }
        });
        if(!existBooking){
            logger.warn('未報名此課程')
            next(appError(400, '未報名此課程'))
            return
        }
        existBooking.cancelled_at = new Date().toISOString();
        const updateBooking = await bookingRepo.save(existBooking);
        if(updateBooking.affected === 0){
            logger.warn('取消課程失敗')
            next(appError(400, '取消課程失敗'))
            return
        }
        logger.info(`取消課程預約ID:${updateBooking.id}`)
        res.status(200).json({
            status: 'success',
            data: null
        })
    }catch(error){
        logger.error('取消課程錯誤',error)
        next(error)
    }
}
module.exports = {
    getCourse,
    postBooking,
    deleteBooking
}