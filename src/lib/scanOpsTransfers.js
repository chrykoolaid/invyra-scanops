import { buildTransferPayload, TRANSFER_TYPES, validateTransfer } from "./scanOpsTransferRules";

export function createTransferDraft(extra = {}) {
  return {
    transferType: TRANSFER_TYPES.BACKROOM_TO_SHELF,
    sourceLocation: "",
    destinationLocation: "",
    quantity: 1,
    unitType: "each",
    item: null,
    reason: "",
    ...extra,
  };
}

export function getTransferValidation(draft) {
  return validateTransfer(draft || {});
}

export function buildQueuedTransfer(draft, decision) {
  return buildTransferPayload({ ...draft, decision });
}
