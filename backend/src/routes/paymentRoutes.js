import express from 'express'
import checkToken from '../middlewares/checkToken.js'
import { requireRole } from '../middlewares/requireRole.js'
import { validateZod } from '../middlewares/validateZod.js'
import { initiateBilling, pollBillingStatus } from '../controllers/paymentController.js'
import {
  createChargeRequest,
  getPendingChargeWithPeer,
} from '../controllers/chargeRequestController.js'
import { handleAbacatePayWebhook } from '../controllers/webhookController.js'
import {
  getEscrow,
  releaseFunds,
  openDispute,
  getAuditTrail,
} from '../controllers/escrowController.js'
import { initiateBillingBodySchema, billingIdParamSchema } from '../schemas/paymentSchemas.js'
import { createChargeBodySchema, peerIdParamSchema } from '../schemas/chargeSchemas.js'

const PaymentRoutes = express.Router()

PaymentRoutes.post(
  '/payments/charge-requests',
  checkToken,
  requireRole('CUIDADOR'),
  validateZod(createChargeBodySchema),
  createChargeRequest,
)
PaymentRoutes.get(
  '/payments/charge-requests/pending/:peerId',
  checkToken,
  validateZod(peerIdParamSchema, 'params'),
  getPendingChargeWithPeer,
)

PaymentRoutes.post(
  '/payments/billing',
  checkToken,
  requireRole('FAMILIAR'),
  validateZod(initiateBillingBodySchema),
  initiateBilling,
)
PaymentRoutes.get(
  '/payments/billing/:billingId/status',
  checkToken,
  validateZod(billingIdParamSchema, 'params'),
  pollBillingStatus,
)

PaymentRoutes.get('/escrow/:escrowId', checkToken, getEscrow)
PaymentRoutes.get('/escrow/:escrowId/audit', checkToken, getAuditTrail)
PaymentRoutes.post('/escrow/:escrowId/release', checkToken, releaseFunds)
PaymentRoutes.post('/escrow/:escrowId/dispute', checkToken, openDispute)

PaymentRoutes.post(
  '/webhooks/abacatepay',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body?.toString('utf8') ?? ''
    try {
      req.body = JSON.parse(req.rawBody)
    } catch {
      req.body = {}
    }
    next()
  },
  handleAbacatePayWebhook,
)

export default PaymentRoutes
