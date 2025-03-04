import express from 'express'
import { orderController } from '../controller/orderController.js'

const router= express.Router()



router.route("/").post(orderController)

export default router