/**
 * VectrLoadAI - Third-Party Integrations
 *
 * This module provides integrations with external services:
 * - QuickBooks Online: Accounting/invoice sync
 * - Highway: Carrier vetting and verification
 * - DAT: Market rate lookups and load posting
 * - Macropoint: Real-time GPS tracking
 * - Denim: Carrier payments and QuickPay
 */

// Core utilities
export * from './core/types'
export * from './core/encryption'
export * from './core/logger'
export {
  BaseIntegrationClient,
  OAuthIntegrationClient,
  ApiKeyIntegrationClient,
} from './core/base-client'

// QuickBooks Online - Accounting
export {
  QuickBooksClient,
  createQuickBooksClient,
  syncCustomersToQuickBooks,
  pushInvoiceToQuickBooks,
  pushCarrierBillToQuickBooks,
} from './quickbooks'

// Highway - Carrier Vetting
export {
  HighwayClient,
  createHighwayClient,
  verifyCarrier,
  verifyCarriersBatch,
  getCarriersNeedingVerification,
} from './highway'

// DAT Load Board - Rate Lookups
export {
  DATClient,
  createDATClient,
  getRateForLane,
  getRateHistory,
  calculateSuggestedRates,
} from './dat'

// Macropoint - Real-Time Tracking
export {
  MacropointClient,
  createMacropointClient,
  startLoadTracking,
  stopLoadTracking,
  getLoadLocation,
  getLoadLocationHistory,
  syncAllActiveTracking,
  handleWebhookUpdate,
  requestDriverCheckIn,
} from './macropoint'

// Denim - Carrier Payments
export {
  DenimClient,
  createDenimClient,
  createCarrierPayment,
  approveCarrierPayment,
  cancelCarrierPayment,
  getPaymentStatus,
  syncCarriersToDenim,
  syncPaymentStatuses,
  getPaymentSummary,
  createBatchPayments,
} from './denim'

// Type exports for convenience
export type {
  IntegrationProvider,
  IntegrationStatus,
  ApiResponse,
  OrganizationIntegration,
  SyncDirection,
  TriggerType,
} from './core/types'

export type { TrackingStatus, MacropointLocation, MacropointETA, TrackingOrder } from './macropoint'
export type { PaymentStatus, PaymentMethod, CarrierPayment } from './denim'
