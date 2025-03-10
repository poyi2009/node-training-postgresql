const express = require('express')
const router = express.Router();
const {isAuth} = require('../middlewares/isAuth');
const upload = require('../controllers/upload');

//圖片上傳
router.post('/', isAuth, upload.postImage)

module.exports = router