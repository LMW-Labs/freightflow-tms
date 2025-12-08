// Macropoint Real-Time Tracking integration exports

export {
  MacropointClient,
  createMacropointClient,
  type TrackingStatus,
  type MacropointLocation,
  type MacropointETA,
  type TrackingOrder,
  type CreateTrackingRequest,
  type TrackingUpdate,
} from './client'

export {
  startLoadTracking,
  stopLoadTracking,
  getLoadLocation,
  getLoadLocationHistory,
  syncAllActiveTracking,
  handleWebhookUpdate,
  requestDriverCheckIn,
} from './tracking'
