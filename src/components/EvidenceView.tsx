import React, { useState } from 'react';
import {
  Eye,
  Download,
  Clock,
  ShieldAlert,
  ZoomIn,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { AlertItem } from '../types';

interface EvidenceViewProps {
  alerts: AlertItem[];
  selectedEvidenceAlert: AlertItem | null;
  setSelectedEvidenceAlert: (alert: AlertItem | null) => void;
  onDeleteEvidence: (id: string) => void;
  onDeleteAllEvidence: () => void;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  alerts,
  selectedEvidenceAlert,
  setSelectedEvidenceAlert,
  onDeleteEvidence,
  onDeleteAllEvidence,
}) => {
  const [filterSeat, setFilterSeat] = useState<string>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Filter alerts that have captured screenshot evidence
  const evidenceAlerts = alerts.filter((a) => !!a.evidenceImage);

  const filtered = evidenceAlerts.filter((a) => {
    if (filterSeat !== 'all' && a.seatId !== filterSeat) return false;
    return true;
  });

  const handleDownload = (evidenceUrl: string, id: string, seat: string) => {
    const link = document.createElement('a');
    link.href = evidenceUrl;
    link.download = `Exam_Evidence_${seat}_${id}_${new Date().toISOString().slice(0, 10)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showNotification = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const handleConfirmSingleDelete = () => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    onDeleteEvidence(targetId);
    setPendingDeleteId(null);
    if (selectedEvidenceAlert?.id === targetId) {
      setSelectedEvidenceAlert(null);
    }
    showNotification(`✓ Evidence ${targetId} deleted successfully.`);
  };

  const handleConfirmDeleteAll = () => {
    onDeleteAllEvidence();
    setIsConfirmingDeleteAll(false);
    setSelectedEvidenceAlert(null);
    showNotification('✓ All evidence deleted successfully.');
  };

  return (
    <div className="space-y-5">
      {/* Toast feedback banner */}
      {feedbackToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/80 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xl shadow-emerald-950/50 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackToast}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-400 hover:text-white font-mono text-sm px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-rose-500" />
            Evidential Capture Vault
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {evidenceAlerts.length} Captured
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Timestamped visual frame captures recorded during suspicious events with detection bounding box overlays.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter by Seat:</span>
            <select
              value={filterSeat}
              onChange={(e) => setFilterSeat(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Seats ({evidenceAlerts.length})</option>
              {['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4'].map(
                (s) => (
                  <option key={s} value={s}>
                    Seat {s}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Delete All Evidence Button */}
          {evidenceAlerts.length > 0 && (
            <button
              onClick={() => setIsConfirmingDeleteAll(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Delete all stored evidence items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Evidence
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <Eye className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Evidential Snapshots Recorded</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When the computer vision engine flags a candidate with a phone or suspicious movement, automated screenshots will be logged here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            // Suspicion score calculation out of 100
            const suspicionScore = Math.min(100, Math.round(item.confidence * 0.95));

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group shadow-lg"
              >
                {/* Image with zoom overlay */}
                <div
                  onClick={() => setSelectedEvidenceAlert(item)}
                  className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                >
                  <img
                    src={item.evidenceImage}
                    alt={`Evidence for seat ${item.seatId}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Seat badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur border border-slate-700 font-mono text-xs font-bold text-white">
                    Seat {item.seatId}
                  </div>

                  {/* Confidence badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-950/80 backdrop-blur border border-rose-600/70 font-mono text-xs font-bold text-rose-300">
                    {item.confidence}% CONF
                  </div>

                  {/* Hover zoom prompt */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs">
                    <ZoomIn className="w-5 h-5 text-cyan-400" /> Click to Inspect High-Res
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="font-bold text-slate-300">{item.id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> {item.timeDisplay}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white mt-1">
                      {item.activityTitle}
                    </h3>

                    {/* Confidence & Suspicion Score */}
                    <div className="grid grid-cols-2 gap-2 mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Confidence:</span>
                        <span className="font-bold text-rose-300">{item.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Suspicion Score:</span>
                        <span className="font-bold text-amber-300">{suspicionScore}/100</span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">
                        &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        item.status === 'pending'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.status}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* View Button */}
                      <button
                        onClick={() => setSelectedEvidenceAlert(item)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="View evidence details"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        View
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={() => handleDownload(item.evidenceImage!, item.id, item.seatId)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
                        title="Download image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setPendingDeleteId(item.id)}
                        className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Delete this evidence record"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog: Delete Single Evidence */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-600/60 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Evidence?</h3>
                <span className="text-xs font-mono text-slate-400">ID: {pendingDeleteId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this evidence?
              <br />
              <span className="text-rose-400 font-medium">This action cannot be undone.</span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete All Evidence */}
      {isConfirmingDeleteAll && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-600/60 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete All Evidence?</h3>
                <span className="text-xs font-mono text-slate-400">
                  {evidenceAlerts.length} items will be removed
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all stored evidence.
              <br />
              <span className="text-rose-400 font-medium">This action cannot be undone.</span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmingDeleteAll(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Res Inspection Modal */}
      {selectedEvidenceAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-5 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm md:text-base text-white">
                  Evidence Capture Inspection | {selectedEvidenceAlert.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvidenceAlert(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={selectedEvidenceAlert.evidenceImage}
                alt="High resolution evidential capture"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
              <div>
                <span className="text-slate-500 block">SEAT ZONE</span>
                <span className="font-bold text-white text-sm">{selectedEvidenceAlert.seatId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ACTIVITY</span>
                <span className="font-bold text-rose-300">{selectedEvidenceAlert.activityTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block">TIMESTAMP</span>
                <span className="text-slate-200">{selectedEvidenceAlert.timeDisplay}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CONFIDENCE</span>
                <span className="font-bold text-cyan-400">{selectedEvidenceAlert.confidence}%</span>
              </div>
            </div>

            {selectedEvidenceAlert.notes && (
              <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">INVIGILATOR NOTES:</span>
                {selectedEvidenceAlert.notes}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setPendingDeleteId(selectedEvidenceAlert.id);
                }}
                className="px-3.5 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Evidence
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDownload(
                      selectedEvidenceAlert.evidenceImage!,
                      selectedEvidenceAlert.id,
                      selectedEvidenceAlert.seatId
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4" /> Download Certified Evidence
                </button>
                <button
                  onClick={() => setSelectedEvidenceAlert(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
