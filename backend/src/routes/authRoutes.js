import express from "express"
import { LoginUser, getUserById } from "../controllers/authController.js"
import { checkToken } from "../middlewares/checkToken.js"
import { validateZod } from '../middlewares/validateZod.js'
import { loginBodySchema } from '../schemas/authSchemas.js'

const router = express.Router()

router.post('/auth/login', validateZod(loginBodySchema), LoginUser)
router.get('/users/:id', checkToken, getUserById);

export default router