const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const { isUndefined, isNotValidSting, isNotValidInteger } = require('../utils/validUtils')
const { errHandle } = require('../utils/errHandle')

router.get('/', async (req, res, next) => {
    try {
        const creditPackage = await dataSource.getRepository('CreditPackage').find({
            select: ['id', 'name', 'credit_amount', 'price']
    })
        res.status(200).json({
            status: 'success',
            data: creditPackage
        })
    } catch (error) {
        logger.error(error)
        next(error)
        }
    })

router.post('/', async (req, res, next) => {
    try {
        const { name, credit_amount: creditAmount, price } = req.body
        if (isUndefined(name) || isNotValidSting(name) ||
        isUndefined(creditAmount) || isNotValidInteger(creditAmount) ||
        isUndefined(price) || isNotValidInteger(price)) {
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        const creditPurchaseRepo = dataSource.getRepository('CreditPackage')
        const existCreditPurchase = await creditPurchaseRepo.find({
            where: {
                name
            }
        })
        if (existCreditPurchase.length > 0) {
            errHandle(res, 409, 'failed', '資料重複')
            return
        }
        const newCreditPurchase = creditPurchaseRepo.create({
            name,
            credit_amount: creditAmount,
            price
        })
        const result = await creditPurchaseRepo.save(newCreditPurchase)
        res.status(200).json({
            status: 'success',
            data: result
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
    })

router.delete('/:creditPackageId', async (req, res, next) => {
    try {
        const { creditPackageId } = req.params
        if (isUndefined(creditPackageId) || isNotValidSting(creditPackageId)) {
            errHandle(res, 400, 'failed', '欄位未填寫正確')
            return
        }
        const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
        if (result.affected === 0) {
            errHandle(res, 400, 'failed', 'ID錯誤')
            return
        }
        res.status(200).json({
            status: 'success'
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
    })

module.exports = router