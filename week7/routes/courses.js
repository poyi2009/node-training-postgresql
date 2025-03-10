const express = require('express');
const router = express.Router();
const {isAuth} = require('../middlewares/isAuth');
const courses = require('../controllers/courses');

//取得課程列表
router.get('/', courses.getCourse)
//報名課程
router.post('/:courseId', isAuth, courses.postBooking)
//取消課程
router.delete('/:courseId', isAuth, courses.deleteBooking)

module.exports = router;