const express = require('express');
const router = express.Router();

const {isAuth} = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');
const admin = require('../controllers/admin');

//變更教練資料
router.put('/coaches',  isAuth, isCoach, admin.putCoach)
//取得教練自己的詳細資料
router.get('/coaches',  isAuth, isCoach, admin.getCoachDetail)
//取得教練自己的月營收資料
router.get('/coaches/revenue',  isAuth, isCoach, admin.getCoachRevenue)
//取得教練自己的課程列表
router.get('/coaches/courses', isAuth, isCoach, admin.getCoachCourses)
//新增教練課程
router.post("/coaches/courses", isAuth, isCoach, admin.postCourse)
//更新課程
router.put('/coaches/courses/:courseId', isAuth, isCoach, admin.putCourse)
//取得教練自己的課程詳細資料
router.get('/coaches/courses/:courseId', isAuth, isCoach, admin.getDetailCourse)
//將使用者改為教練
router.post("/coaches/:userId", admin.postCoach)


module.exports = router;