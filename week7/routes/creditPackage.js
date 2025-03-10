const express = require('express')
const router = express.Router()
const creditPackage = require('../controllers/creditPackage')
const {isAuth} = require('../middlewares/isAuth');

//取得購買方案
router.get('/', creditPackage.getPackage)
//新增購買方案
router.post('/', creditPackage.postPackage)
//使用者購買方案
router.post('/:creditPackageId', isAuth, creditPackage.postOrder)
//刪除購買方案
router.delete('/:creditPackageId', isAuth, creditPackage.deletePackage)

module.exports = router;