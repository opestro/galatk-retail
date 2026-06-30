import { Router } from 'express'
import * as ExampleController from './controller.js'

const router = Router()

router.get('/', ExampleController.list)
router.get('/:id', ExampleController.getById)
router.post('/', ExampleController.create)

export default router
