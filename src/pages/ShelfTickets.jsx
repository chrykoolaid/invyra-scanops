import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import {
  DoneCard,
  EmptyState,
  InfoLine,
  MetricPill,
  PageShell,
  SectionCard,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildShelfTicketPreview,
  createManualShelfTicketRequest,
  formatShelfTicketMoney,
  getShelfTicketPrintContracts,
  getShelfTicketQueueRequests,
  importShelfTicketRequestsFromPriceCheck,
  recommendedTicketFormatForRequest,
  saveShelfTicketPrintContract,
  SHELF_TICKET_FORMATS,
  SHELF_TICKET_STATUSES,
  updateShelfTicketRequestStatus,
} from "../lib/scanOpsShelfTicketContracts";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "needs", label: "Needs Review" },
  { id: "ready", label: "Ready" },
];

function statusClass(status) {
  if (status === SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF) return "bg-primary/10 text-primary";
  if (status === SHELF_TICKET_STATUSES.PRINTED_COMPLETED) return "bg-emerald-50 text-emerald-700";
  if (status === SHELF_TICKET_STATUSES.CANCELLED) return "bg-secondary text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
}

function compactDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function FilterButton({ filter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl px-2 text-xs font-black active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {filter.label}
    </button>
  );
}

function FormatButton({ format, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-2xl px-3 py-2 text-left active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      <span className="block text-sm font-black leading-tight">{format.label}</span>
      <span className={`mt-1 block text-[10px] font-bold uppercase tracking-wide ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{format.size}</span>
    </button>
  );
}

function QueueItem({ request, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left active:scale-[0.99] ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black leading-tight text-foreground">{request.itemName}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
            {request.sourceLabel} · {request.shelfLocation || "Location pending"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(request.status)}`}>{request.status}</span>
      </div>
    </button>
  );
}

function PreviewCard({ preview, request, contract }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Print-ready preview</p>
          <p className="mt-1 text-sm font-black text-foreground">{preview.templateKey}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          {contract ? "Saved" : "Draft"}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="break-words text-lg font-black leading-tight text-foreground">{preview.labelTitle}</p>
          <span className="shrink-0 rounded-xl bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground">{preview.labelBadgeText}</span>
        </div>
        <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{preview.labelPrimaryPrice}</p>
        {preview.labelSecondaryPrice && <p className="mt-1 text-xs font-black uppercase tracking-wide text-muted-foreground">{preview.labelSecondaryPrice}</p>}
        <p className="mt-3 border-t border-border pt-2 text-xs font-bold text-muted-foreground">{preview.labelFooterText}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Copies" value={contract?.copies || request.copies || 1} />
        <MetricPill label="Print status" value="No printer job" />
      </div>
    </SectionCard>
  );
}

export default function ShelfTickets() {
  const [scanValue, setScanValue] = useState("");
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [formatId, setFormatId] = useState("STANDARD_SHELF_LABEL");
  const [savedContract, setSavedContract] = useState(null);
  const [importedCount, setImportedCount] = useState(0);

  const refreshQueue = (nextSelectedId = selectedId) => {
    const imported = importShelfTicketRequestsFromPriceCheck();
    const nextRequests = imported.requests || getShelfTicketQueueRequests();
    const nextContracts = getShelfTicketPrintContracts();
    setRequests(nextRequests);
    setContracts(nextContracts);
    setImportedCount(imported.imported?.length || 0);
    const stillExists = nextRequests.some((request) => request.requestId === nextSelectedId);
    const fallback = nextRequests.find((request) => request.status !== SHELF_TICKET_STATUSES.CANCELLED)?.requestId || nextRequests[0]?.requestId || null;
    const nextId = stillExists ? nextSelectedId : fallback;
    setSelectedId(nextId);
    const selected = nextRequests.find((request) => request.requestId === nextId);
    if (selected) setFormatId(recommendedTicketFormatForRequest(selected));
  };

  useEffect(() => {
    refreshQueue(null);
    // Stage AC imports once on open and then remains local/explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRequest = useMemo(() => requests.find((request) => request.requestId === selectedId) || null, [requests, selectedId]);
  const selectedContract = useMemo(() => {
    if (!selectedRequest) return null;
    return contracts.find((contract) => contract.requestId === selectedRequest.requestId || contract.contractId === selectedRequest.ticketContractId) || null;
  }, [contracts, selectedRequest]);

  useEffect(() => {
    if (selectedRequest) setFormatId(selectedContract?.ticketType || recommendedTicketFormatForRequest(selectedRequest));
  }, [selectedRequest?.requestId, selectedContract?.ticketType]);

  const activeRequests = useMemo(() => {
    return requests.filter((request) => {
      if (filter === "needs") return request.status === SHELF_TICKET_STATUSES.NEEDS_REVIEW || request.status === SHELF_TICKET_STATUSES.DRAFT;
      if (filter === "ready") return request.status === SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF;
      return request.status !== SHELF_TICKET_STATUSES.CANCELLED;
    });
  }, [requests, filter]);

  const queueCounts = useMemo(() => ({
    active: requests.filter((request) => request.status !== SHELF_TICKET_STATUSES.CANCELLED && request.status !== SHELF_TICKET_STATUSES.PRINTED_COMPLETED).length,
    ready: requests.filter((request) => request.status === SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF).length,
    contracts: contracts.length,
  }), [requests, contracts]);

  const preview = useMemo(() => selectedRequest ? buildShelfTicketPreview(selectedRequest, formatId) : null, [selectedRequest, formatId]);

  const handleScan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    const request = createManualShelfTicketRequest(found);
    setScanValue("");
    setSavedContract(null);
    refreshQueue(request.requestId);
  };

  const chooseRequest = (request) => {
    setSelectedId(request.requestId);
    setFormatId(selectedContract?.ticketType || recommendedTicketFormatForRequest(request));
    setSavedContract(null);
  };

  const saveContract = () => {
    if (!selectedRequest) return;
    const result = saveShelfTicketPrintContract({ request: selectedRequest, formatId, copies: selectedRequest.copies || 1, quantity: selectedRequest.quantity || 1 });
    if (!result) return;
    setSavedContract(result.contract);
    refreshQueue(result.request.requestId);
  };

  const updateStatus = (status) => {
    if (!selectedRequest) return;
    const result = updateShelfTicketRequestStatus(selectedRequest.requestId, status);
    if (!result) return;
    setSavedContract(result.contract || null);
    refreshQueue(result.request.requestId);
  };

  const readyDisabled = !selectedRequest?.ticketContractId && !selectedContract && !savedContract;
  const completedDisabled = selectedRequest?.status !== SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF;

  return (
    <PageShell>
      <WorkflowHeader
        title="Shelf Tickets"
        subtitle="Shelf ticket requests"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        {savedContract && (
          <DoneCard
            title="Shelf ticket contract saved"
            helper="Saved locally for desktop/print handoff. No real printer job was created."
            rows={[
              { label: "Contract", value: savedContract.contractId },
              { label: "Template", value: savedContract.templateKey },
              { label: "Status", value: savedContract.status },
            ]}
          />
        )}

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Shelf Ticket Queue</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan/search to add a manual ticket request.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="text-lg font-black text-foreground">{queueCounts.active}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FILTERS.map((item) => <FilterButton key={item.id} filter={item} active={filter === item.id} onClick={() => setFilter(item.id)} />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricPill label="Ready" value={queueCounts.ready} />
            <MetricPill label="Contracts" value={queueCounts.contracts} />
            <MetricPill label="Imported" value={importedCount} />
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Queue</p>
              <p className="mt-1 text-lg font-black text-foreground">{activeRequests.length} ticket{activeRequests.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          {activeRequests.length ? (
            <div className="mt-3 space-y-2">
              {activeRequests.map((request) => <QueueItem key={request.requestId} request={request} active={request.requestId === selectedId} onClick={() => chooseRequest(request)} />)}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">No ticket requests in this view.</p>
          )}
        </SectionCard>

        {selectedRequest ? (
          <>
            <SectionCard className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Selected Ticket</p>
                  <h2 className="mt-1 break-words text-lg font-black leading-tight text-foreground">{selectedRequest.itemName}</h2>
                  <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {[selectedRequest.sku && `SKU ${selectedRequest.sku}`, selectedRequest.barcode && `Barcode ${selectedRequest.barcode}`].filter(Boolean).join(" · ") || "Identity pending"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(selectedRequest.status)}`}>{selectedRequest.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricPill label="Source" value={selectedRequest.sourceLabel} />
                <MetricPill label="Location" value={selectedRequest.shelfLocation || "—"} />
                <MetricPill label="Regular" value={formatShelfTicketMoney(selectedRequest.regularPrice, selectedRequest.currency)} />
                <MetricPill label="Expected" value={formatShelfTicketMoney(selectedRequest.expectedShelfPrice ?? selectedRequest.promoPrice ?? selectedRequest.regularPrice, selectedRequest.currency)} />
              </div>

              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Requested" value={compactDate(selectedRequest.createdAt)} />
                <InfoLine label="Requested by" value={`${selectedRequest.requestedBy || "—"} · ${selectedRequest.requestedByRole || "—"}`} />
                <InfoLine label="Printer action" value="No real print job" />
              </div>
            </SectionCard>

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Ticket Format</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SHELF_TICKET_FORMATS.map((format) => <FormatButton key={format.id} format={format} active={formatId === format.id} onClick={() => setFormatId(format.id)} />)}
                </div>
              </div>
            </SectionCard>

            {preview && <PreviewCard preview={preview} request={selectedRequest} contract={selectedContract || savedContract} />}

            <SectionCard className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={saveContract} className="min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98]">
                  Save Contract
                </button>
                <button type="button" disabled={readyDisabled} onClick={() => updateStatus(SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF)} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40">
                  Ready for Handoff
                </button>
                <button type="button" disabled={completedDisabled} onClick={() => updateStatus(SHELF_TICKET_STATUSES.PRINTED_COMPLETED)} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40">
                  Mark Completed
                </button>
                <button type="button" onClick={() => updateStatus(SHELF_TICKET_STATUSES.CANCELLED)} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
                  Cancel Ticket
                </button>
              </div>
              <p className="text-xs font-semibold leading-snug text-muted-foreground">Completed is manual only. No printer result is claimed.</p>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="No ticket selected." helper="Use Price Check → Ticket Needed, or scan/search here to create a manual shelf-ticket request." />
        )}


      </WorkflowMain>
    </PageShell>
  );
}
