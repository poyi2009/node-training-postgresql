const express = require('express');
const router = express.Router();

const {isAuth} = require('../middlewares/isAuth');
const users = require('../controllers/users');

//註冊使用者
router.post('/signup', users.postSignup)
//使用者登入
router.post('/login', users.postLogin)
//取得個人資料
router.get('/profile', isAuth, users.getProfile)
//更新個人資料
router.put('/profile', isAuth, users.putProfile)
//使用者更新密碼
router.post('/password', isAuth, users.postPassword)
//取得使用者已購買的方案列表
router.get('/credit-package', isAuth, users.getPurchase)
//取得已預約的課程列表
router.get('/course', isAuth, users.getCourse)
module.exports = router;