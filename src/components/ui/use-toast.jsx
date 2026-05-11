// Stage M.1.3 ScanOps toast suppression: ScanOps uses inline state, not floating toasts.
function toast() {
  return { id: "scanops-toast-disabled", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return { toasts: [], toast, dismiss: () => {} };
}

export { useToast, toast };
