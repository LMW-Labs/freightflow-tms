// Highway carrier vetting integration exports

export {
  HighwayClient,
  createHighwayClient,
  type HighwayCarrierInfo,
  type HighwayAuthorityStatus,
  type HighwayInsurance,
  type HighwaySafetyRating,
  type HighwayCarrierResponse,
} from './client'

export {
  verifyCarrier,
  verifyCarriersBatch,
  getCarriersNeedingVerification,
} from './verify'
