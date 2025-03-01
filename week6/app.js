const express = require('express')
const cors = require('cors')
const path = require('path')
const pinoHttp = require('pino-http')

const logger = require('./utils/logger')('App')
const creditPackageRouter = require('./routes/creditPackage')
const skillRouter = require('./routes/skill')
const usersRouter = require('./routes/users')
const adminRouter = require('./routes/admin')
const coachesRouter = require('./routes/coaches')
const coursesRouter = require('./routes/courses')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(pinoHttp({
  logger,
  serializers: {
    req (req) {
      req.body = req.raw.body
      return req
    }
  }
}))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/healthcheck', (req, res) => {
  res.status(200)
  res.send('OK')
})
app.use('/api/credit-package', creditPackageRouter)
app.use('/api/coaches/skill', skillRouter)
app.use('/api/users', usersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/coaches', coachesRouter)
app.use('/api/courses', coursesRouter)

app.use((req, res, next) =>{
  res.status(404).json({
    status:'failed',
    message:'無此路由'
  })
  return
})
// eslint-disable-next-line no-unused-vars
//錯誤處理middleware
app.use((err, req, res, next) => {
  req.log.error(err)
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  })
})

module.exports = app
