const express = require('express')
const { getOrderChartData } = require('../controllers/chartCtrl')
const router = express.Router()

router.get('/orderChart',getOrderChartData)


module.exports = router