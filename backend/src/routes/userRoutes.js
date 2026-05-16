import express from "express"
import { createUsers, getUsers, getFeedUsers, updateUsers, deleteUsers } from "../controllers/userController.js"
import checkToken from '../middlewares/checkToken.js'
import { validateZod } from '../middlewares/validateZod.js'
import { createUserBodySchema } from '../schemas/userSchemas.js'
const router = express.Router()

router.post('/users', validateZod(createUserBodySchema), createUsers)
router.get('/users', getUsers)
router.put('/users/:id', updateUsers)
router.delete('/users/:id', deleteUsers)
// Adicione esta rota junto com as outras
router.get('/users/:id/feed', checkToken, getFeedUsers)

export default router