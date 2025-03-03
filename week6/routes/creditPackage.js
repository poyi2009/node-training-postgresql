const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const { isUndefined, isNotValidSting, isNotValidInteger } = require('../utils/validUtils')
const appError = require('../utils/appError');
const {isAuth} = require('../middlewares/isAuth');

//取得購買方案
router.get('/', async (req, res, next) => {
    try {
        const creditPackage = await dataSource.getRepository('CreditPackage').find({
            select: ['id', 'name', 'credit_amount', 'price']
        })
        res.status(200).json({
            status: 'success',
            data: creditPackage
        })
        logger.info('取得購買方案')
    } catch (error) {
        logger.error(error)
        next(error)
        }
    })
//新增購買方案
router.post('/', isAuth, async (req, res, next) => {
    try {
        const { name, credit_amount: creditAmount, price } = req.body
        if (isUndefined(name) || isNotValidSting(name) ||
        isUndefined(creditAmount) || isNotValidInteger(creditAmount) ||
        isUndefined(price) || isNotValidInteger(price)) {
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const creditPurchaseRepo = dataSource.getRepository('CreditPackage')
        const existCreditPurchase = await creditPurchaseRepo.findOneBy({ name });
        if (existCreditPurchase) {
            logger.warn('資料重複')
            next(appError(409, '資料重複'));
            return
        }
        const newCreditPurchase = creditPurchaseRepo.create({
            name,
            credit_amount: creditAmount,
            price
        })
        const result = await creditPurchaseRepo.save(newCreditPurchase)
        logger.info(`新增購買方案:${result.id}`)
        res.status(200).json({
            status: 'success',
            data: result
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
    })
//使用者購買方案
router.post('/:creditPackageId', isAuth, async (req, res, next) =>{
    try{
        const {creditPackageId} = req.params;
        if(isUndefined(creditPackageId) || isNotValidSting(creditPackageId)){
            next(appError(400, 'ID錯誤'));
            return
        }
        const packageRepo = dataSource.getRepository('CreditPackage');
        const existPackage = await packageRepo.findOneBy({ id:creditPackageId });
        if(!existPackage){
            next(appError(400, 'ID錯誤'));
            return
        }
        //新增購買紀錄
        const {id} = req.user;
        const purchaseRepo = dataSource.getRepository('CreditPurchase');
        const newPurchase =  purchaseRepo.create({
            user_id: id,
            credit_package_id: existPackage.id,
            purchased_credits: existPackage.credit_amount,
            price_paid: existPackage.price
        });
        const purchase = await purchaseRepo.save(newPurchase);
        logger.info(`成功購買方案:${purchase}`)
        res.status(200).json({
            status:'success',
            data:null
        })
    }catch(error){
        logger.error('使用者購買方案錯誤',error)
        next(error)
    }
})
//刪除購買方案
router.delete('/:creditPackageId', isAuth, async (req, res, next) => {
    try {
        const { creditPackageId } = req.params;
        if (isUndefined(creditPackageId) || isNotValidSting(creditPackageId)) {
            logger.warn('欄位未填寫正確')
            next(appError(400, '欄位未填寫正確'));
            return
        }
        const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
        if (result.affected === 0) {
            logger.warn('ID錯誤')
            next(appError(400, 'ID錯誤'));
            return
        }
        logger.info(`成功刪除購買方案ID:${creditPackageId}`)
        res.status(200).json({
            status: 'success'
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
    })

module.exports = router;