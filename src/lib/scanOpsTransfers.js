import { buildTransferPayload, TRANSFER_TYPES, validateTransfer } from "./scanOpsTransferRules";

export function createTransferDraft(extra = {}) {
  return {
    transferType: TRANSFER_TYPES.BACKROOM_TO_SHELF,
    sourceLocation: "BACKROOM-A",
    destinationLocation: "AISLE-4-DRINKS",
    quantity: 1,
    unitType: "each",
    item: null,
    ...extra,
  };
}

export function getTransferValidation(draft) {
  return validateTransfer(draft || {});
}

export function buildQueuedTransfer(draft, decision) {
  return buildTransferPayload({ ...draft, decision });
}
