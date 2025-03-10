const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Admin');
const { isUndefined, isNotValidSting, isNotValidInteger, validDate } = require('../utils/validUtils')
const appError = require('../utils/appError');
const { Raw,IsNull } = require('typeorm');
const {isUUID} = require('validator');

//變更教練資料
async function putCoach(req, res, next){
    try{
        const {id} = req.user;
        const {experience_years, description, profile_image_url, skill_ids} = req.body;
        if(isUndefined(experience_years) || isNotValidInteger(experience_years) ||
        isUndefined(description) || isNotValidSting(description) ||
        isUndefined(profile_image_url) || isNotValidSting(profile_image_url) ||
        skill_ids.length === 0 || !Array.isArray(skill_ids)){
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        if(profile_image_url){
            if(!profile_image_url.startsWith('https') || !(profile_image_url.endsWith('.jpg') || profile_image_url.endsWith('.png'))){
                logger.warn('大頭貼網址錯誤')
                next(appError(400, '大頭貼網址錯誤'));
                return
            }
        }
        //確認教練存在
        const coachRepo = dataSource.getRepository('Coach');
        const existCoach = await coachRepo.findOneBy({ user_id:id });
        if(!existCoach){
            logger.warn('找不到教練')
            next(appError(400, '找不到教練'));
            return
        }
        //該教練專長綁定
        const CoachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');
        await CoachLinkSkillRepo.delete({ coach_id: existCoach.id })
        const newCoachSkill = skill_ids.map(skill =>{
            return {
                coach_id: existCoach.id,
                skill_id: skill
            }
        })
        await CoachLinkSkillRepo.insert(newCoachSkill)
        //更新教練欄位資料
        const updateCoach = await coachRepo.update({
            user_id:id
        },{
            experience_years,
            description,
            profile_image_url,
            updated_at: new Date().toISOString()
        })
        if(updateCoach.affected === 0){
            logger.warn('更新教練資料失敗')
            next(appError(400, '更新教練資料失敗'));
            return
        }
        res.status(200).json({
            status:'success',
            data:{
                image_url: profile_image_url
            }
        })
    }catch(error){
        logger.error('變更教練資料錯誤', error)
        next(error)
    }
}
//取得教練自己的詳細資料
async function getCoachDetail(req, res, next){
    try{
        const {id} = req.user;
        const coachData = await dataSource
            .getRepository('Coach')
            .createQueryBuilder('coach')
            .select([
                'coach.id AS id',
                'coach.experience_years AS experience_years',
                'coach.description AS description',
                'coach.profile_image_url AS profile_image_url'
            ])
            .where('coach.user_id = :userId', {userId:id})
            .getRawOne();
        const coachSkillData = await dataSource
            .getRepository('CoachLinkSkill')
            .createQueryBuilder('cls')
            .select([
                'cls.skill_id AS skill_id'
            ])
            .where('cls.coach_id=:coachId', {coachId:coachData.id})
            .getRawMany();
        const skills = coachSkillData.map(item =>{
            return item.skill_id
        })
        coachData.skill_ids = skills;
        logger.info('取得教練自己的詳細資料')
        res.status(200).json({
            status:'success',
            data: coachData
        })
    }catch(error){
        logger.error('取得教練自己的詳細資料失敗', error)
        next(error)
    }
}
//取得教練自己的月營收資料
async function getCoachRevenue(req, res, next){
    try{
        const {id} = req.user;
        const {month} = req.query;
        const year = new Date().getFullYear()
        if(!month || isNotValidSting(month)){
            next(appError(400, '欄位未填寫正確'))
            return
        }
        //建立月份判斷格式
        const checkMonthIndex = {
            'january': 0,
            'february': 1,
            'march': 2,
            'april': 3,
            'may': 4,
            'june': 5,
            'july': 6,
            'august': 7,
            'september': 8,
            'october': 9,
            'november': 10,
            'december': 11
        }
        if(!checkMonthIndex.hasOwnProperty(month.toLowerCase())){
            next(appError(400, '無此月份存在'))
            return
        }
        const monthIndex = checkMonthIndex[month.toLowerCase()] //月份index
        const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0)).toISOString();
        const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0)-1).toISOString(); //2月第一天-1毫秒
        //教練該月開課id
        const courseRepo = dataSource.getRepository('Course');
        const coachCourses = await courseRepo.find({
            select:['id'],
            where:{
                user_id: id,
                start_at: Raw((alias) => `${alias} >= :startDate`, {startDate: startDate}),
                end_at: Raw((alias) => `${alias} <= :endDate`, {endDate: endDate })
            }
        })
        if(coachCourses.length === 0){ //當月沒有開課
            res.status(200).json({
                status:'success',
                data:{
                    total:{
                        participants: 0,
                        revenue: 0,
                        course_count: 0
                    }
                }
            })
            return
        }
        const courseIds = coachCourses.map(item =>{
            return item.id
        })
        //當月開課課程之有效預約id:當月課程&未被取消預約
        const bookingRepo = dataSource.getRepository('CourseBooking');
        const bookings = await bookingRepo.find({
            select:['id'],
            where:{
                course_id: Raw((alias) => `${alias} IN (:...ids)`, {ids: courseIds}),
                cancelled_at: IsNull()
            }
        })
        if(bookings.length === 0){ //不存在有效預約
            res.status(200).json({
                status:'success',
                data:{
                    total:{
                        participants: 0,
                        revenue: 0,
                        course_count: courseIds.length
                    }
                }
            })
            return
        }
        //計算月總營收=該月報名人數*(全方案價錢總和/全方案堂數總和)
        const packageData = await dataSource
            .getRepository('CreditPackage')
            .createQueryBuilder('cp')
            .select([
                'SUM(credit_amount) AS credit_amount',
                'SUM(price) AS price'
            ])
            .getRawOne();
        const pricePerCredit = packageData.price / packageData.credit_amount;
        res.status(200).json({
            status:'success',
            data:{
                total:{
                    participants: bookings.length, //月有效預約數
                    revenue: pricePerCredit * bookings.length, //堂價*參加人數
                    course_count: courseIds.length //月開課數
                }
            }
        })
    }catch(error){
        logger.error('取得教練自己的月營收錯誤', error)
        next(error)
    }
}
//取得教練自己的課程列表
async function getCoachCourses(req, res, next){
    try{
        const {id} = req.user;
        const bookingRepo = dataSource.getRepository('CourseBooking');
        const bookings = await bookingRepo //每個課程的報名人數
            .createQueryBuilder('cb')
            .select([
                'cb.course_id AS course_id',
                'COUNT(cb.id) AS count'
            ])
            .where('cb.cancelled_at IS NULL')
            .groupBy(['cb.course_id'])
            .getRawMany();
        const courses = await dataSource //該教練開課內容
            .getRepository('Course')
            .createQueryBuilder('course')
            .select([
                'course.id AS id',
                'course.name AS name',
                'course.start_at AS start_at',
                'course.end_at AS end_at',
                'course.max_participants AS max_participants',
            ])
            .where('course.user_id = :userId', { userId: id })
            .orderBy({'course.start_at':'DESC'})
            .getRawMany();

        const now = new Date()
        courses.forEach(course =>{
            const startTime = new Date(course.start_at)
            const endTime = new Date(course.end_at)
            let status = '';
            if(now < startTime){
                status = '尚未開始';
            }else if(endTime < now){
                status = '已結束';
            }else{
                status = '報名中';
            }
            const booking = bookings.find(item =>{ //教練此門課程的預約列表
                return item.course_id ===course.id
            })
            if(booking){
                course.participants = booking.count;
                course.status = status;
            }else{ //無人預約
                course.participants = 0;
                course.status = status;
            }
        })
        res.status(200).json({
            status: 'success',
            data: courses
        })
    }catch(error){
        logger.error('取得教練自己的課程錯誤', error)
        next(error)
    }
}
//新增教練課程
async function postCourse(req, res, next){
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
}
//更新課程
async function putCourse(req, res, next){
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
        const course = await courseRepo.findOneBy({ id:courseId });
        logger.info(`成功更新課程ID:${courseId}`)
        res.status(200).json({
            status: 'success',
            data: {
                course: course
            }
        })
    }catch(error){
        logger.error(error);
        next(error);
    }
}
//取得教練自己的課程詳細資料
async function getDetailCourse(req, res, next){
    try{
        const {id} = req.user;
        const {courseId} = req.params;
        if(!isUUID(courseId)){
            logger.warn('課程ID並非UUID格式')
            next(appError(400, '課程ID並非UUID格式'));
            return
        }
        const detailCourse = await dataSource.getRepository('Course')
            .createQueryBuilder('course')
            .innerJoin('course.Skill', 'skill')
            .select([
                'course.id AS id',
                'skill.name AS skill_name',
                'course.name AS name',
                'course.description AS description',
                'course.start_at AS start_at',
                'course.end_at AS end_at',
                'course.max_participants AS max_participants'
            ])
            .where('course.user_id =:userId AND course.id =:courseId', {userId: id, courseId: courseId})
            .getRawMany();
        res.status(200).json({
            status: 'success',
            data: detailCourse
        })
    }catch(error){
        logger.error('取得教練詳細課程資料錯誤', error)
        next(error)
    }
}
//將使用者改為教練
async function postCoach(req, res, next){
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
        logger.info(`新增教練ID:${savedCoach.id}`)
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
}


module.exports = {
    putCoach,
    getCoachDetail,
    getCoachRevenue,
    getCoachCourses,
    postCourse,
    putCourse,
    getDetailCourse,
    postCoach
}