const express = require("express");
const router = express.Router();
const {
  createOrder,
  createOrderByCard,
  loadSessionId
} = require("../controllers/orderCtrl")
const {authMiddleware,isAdmin, isCashier} = require("../middlewares/authMiddleware");

router.post("/create",authMiddleware,createOrder);
router.post('/createbycard',authMiddleware, createOrderByCard )
router.get('/paymentStatus/:sessionId', loadSessionId)

module.exports = router;
