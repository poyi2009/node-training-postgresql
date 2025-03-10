const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const { isUndefined, isNotValidSting, isNotValidInteger } = require('../utils/validUtils')
const appError = require('../utils/appError');
const {isUUID} = require('validator');

//取得購買方案
async function getPackage(req, res, next){
    try {
        // const creditPackage = await dataSource.getRepository('CreditPackage').find({
        //     select: ['id', 'name', 'credit_amount', 'price']
        // })
        const creditPackages = await dataSource
            .getRepository('CreditPackage')
            .createQueryBuilder('creditpackage')
            .select([
                'creditpackage.id AS id',
                'creditpackage.name AS name',
                'creditpackage.credit_amount AS credit_amount',
                'creditpackage.price AS price'
            ])
            .getRawMany();
        res.status(200).json({
            status: 'success',
            data: creditPackages
        })
        logger.info('取得購買方案')
    } catch (error) {
        logger.error(error)
        next(error)
        }
}
//新增購買方案
async function postPackage(req, res, next){
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
        const newPackage = await creditPurchaseRepo.save(newCreditPurchase)
        logger.info(`新增購買方案:${newPackage.id}`)
        res.status(201).json({
            status: 'success',
            data: {
                id: newPackage.id,
                name: newPackage.name,
                credit_amount: newPackage.credit_amount,
                price: newPackage.price
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
}
//使用者購買方案
async function postOrder(req, res, next){
    try{
        const {creditPackageId} = req.params;
        if(isUndefined(creditPackageId) || isNotValidSting(creditPackageId) || !isUUID(creditPackageId)){
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
}
//刪除購買方案
async function deletePackage(req, res, next){
    try {
        const { creditPackageId } = req.params;
        if (isUndefined(creditPackageId) || isNotValidSting(creditPackageId) || !isUUID(creditPackageId)) {
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
}
module.exports = {
    getPackage,
    postPackage,
    postOrder,
    deletePackage
}