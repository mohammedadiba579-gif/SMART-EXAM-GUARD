import React, { useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Search,
  Smartphone,
  RotateCcw,
  Users,
  FileText,
  ShieldAlert,
  Clock,
  Check,
  FileX,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { AlertItem, ActivityType, AlertStatus } from '../types';

interface AlertsViewProps {
  alerts: AlertItem[];
  onReviewAlert: (id: string, notes?: string) => void;
  onDismissAlert: (id: string) => void;
  onViewEvidence: (alert: AlertItem) => void;
  onDeleteAlert: (id: string) => void;
  onDeleteAllAlerts: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onReviewAlert,
  onDismissAlert,
  onViewEvidence,
  onDeleteAlert,
  onDeleteAllAlerts,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewingAlert, setReviewingAlert] = useState<AlertItem | null>(null);
  const [invigilatorNotes, setInvigilatorNotes] = useState<string>('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (activityFilter !== 'all' && alert.activityType !== activityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSeat = alert.seatId.toLowerCase().includes(q);
      const matchTitle = alert.activityTitle.toLowerCase().includes(q);
      const matchId = alert.id.toLowerCase().includes(q);
      if (!matchSeat && !matchTitle && !matchId) return false;
    }
    return true;
  });

  const handleOpenReview = (alert: AlertItem) => {
    setReviewingAlert(alert);
    setInvigilatorNotes(alert.notes || '');
  };

  const handleSaveReview = () => {
    if (!reviewingAlert) return;
    onReviewAlert(reviewingAlert.id, invigilatorNotes);
    setReviewingAlert(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    onDeleteAlert(targetId);
    setPendingDeleteId(null);
    setFeedbackToast(`✓ Alert ${targetId} deleted successfully.`);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const handleExportCsv = () => {
    const headers = ['Alert ID', 'Time', 'Seat', 'Activity', 'Confidence (%)', 'Status', 'Notes'];
    const rows = alerts.map((a) => [
      a.id,
      a.timeDisplay,
      a.seatId,
      `"${a.activityTitle}"`,
      a.confidence,
      a.status.toUpperCase(),
      `"${a.notes || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Exam_Hall_Alert_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'phone':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Smartphone className="w-3 h-3 text-rose-400" /> Unauthorized Device
          </span>
        );
      case 'movement':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <RotateCcw className="w-3 h-3 text-amber-400" /> Lateral Head Movement
          </span>
        );
      case 'interaction':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Users className="w-3 h-3 text-indigo-400" /> Candidate Proximity
          </span>
        );
      case 'book':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <FileText className="w-3 h-3 text-purple-400" /> Unauthorized Paper/Book
          </span>
        );
      case 'cheat_sheet':
      case 'unauthorized_paper':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            <FileX className="w-3 h-3 text-rose-400" /> Possible Unauthorized Material
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
            <ShieldAlert className="w-3 h-3" /> Suspicious Activity
          </span>
        );
    }
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

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-500" />
            Alert History & Incidents Log
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {alerts.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of all potential unauthorized activities flagged during the examination.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(['all', 'pending', 'reviewed', 'dismissed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Activity filter dropdown */}
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Activities</option>
            <option value="phone">Unauthorized Device</option>
            <option value="cheat_sheet">Possible Unauthorized Material (Cheat Sheet)</option>
            <option value="movement">Head Turning / Movement</option>
            <option value="interaction">Interaction / Proximity</option>
            <option value="book">Other Paper Object</option>
          </select>

          {/* Delete All Alerts Button */}
          <button
            onClick={() => setIsConfirmingDeleteAll(true)}
            disabled={alerts.length === 0}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              alerts.length === 0
                ? 'bg-rose-950/20 text-rose-300/40 border border-rose-900/30 cursor-not-allowed opacity-50'
                : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-rose-950/50 cursor-pointer active:scale-95'
            }`}
            title="Delete all examination alerts"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Alerts</span>
            {alerts.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-700/80 text-rose-100 font-mono">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by seat (e.g. B3) or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-56 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {filteredAlerts.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs space-y-2">
          <BellRing className="w-8 h-8 text-slate-600 mx-auto" />
          <div>No suspicious alerts matching the specified criteria.</div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Alert Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const suspicionScore = Math.min(100, Math.round(alert.confidence * 0.95));

            return (
              <div
                key={alert.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg p-4 space-y-3"
              >
                {/* Header: Seat, Time, Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-white border border-slate-700">
                      Seat {alert.seatId}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-xs text-slate-400">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {alert.timeDisplay}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      alert.status === 'pending'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : alert.status === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {alert.status === 'pending' ? 'Pending Verification' : alert.status}
                  </span>
                </div>

                {/* Activity & Notes */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="font-bold text-slate-300">{alert.id}</span>
                    {getActivityBadge(alert.activityType)}
                  </div>

                  <h3 className="font-bold text-sm text-white mt-1">
                    {alert.activityTitle}
                  </h3>

                  {alert.notes && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">
                      &quot;{alert.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Confidence & Suspicion Score */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Confidence:</span>
                    <span className="font-bold text-rose-300">{alert.confidence}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Suspicion Score:</span>
                    <span className="font-bold text-amber-300">{suspicionScore}/100</span>
                  </div>
                </div>

                {/* Action Buttons: [ View ] [ Review ] [ 🗑 Delete ] */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (alert.evidenceImage) {
                          onViewEvidence(alert);
                        } else {
                          handleOpenReview(alert);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="View alert details"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      View
                    </button>

                    <button
                      onClick={() => handleOpenReview(alert)}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-colors"
                      title="Review incident and add invigilator notes"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review
                    </button>
                  </div>

                  <button
                    onClick={() => setPendingDeleteId(alert.id)}
                    className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Delete this alert"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alert Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Alert ID</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Seat</th>
                  <th className="py-3 px-4">Activity Flag</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Suspicion Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredAlerts.map((alert) => {
                  const suspicionScore = Math.min(100, Math.round(alert.confidence * 0.95));

                  return (
                    <tr
                      key={alert.id}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        alert.status === 'pending' ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        {alert.id}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {alert.timeDisplay}
                      </td>

                      {/* Seat */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-white border border-slate-800">
                          Seat {alert.seatId}
                        </span>
                      </td>

                      {/* Activity */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {getActivityBadge(alert.activityType)}
                          <div className="font-bold text-slate-200 mt-0.5">
                            {alert.activityTitle}
                          </div>
                          {alert.notes && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              &quot;{alert.notes}&quot;
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            alert.confidence >= 85
                              ? 'text-rose-400'
                              : alert.confidence >= 70
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {alert.confidence}%
                        </span>
                      </td>

                      {/* Suspicion Score */}
                      <td className="py-3 px-4 font-mono text-amber-300 font-bold">
                        {suspicionScore}/100
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                            alert.status === 'pending'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : alert.status === 'reviewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {alert.status === 'pending' ? 'Pending Verification' : alert.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              if (alert.evidenceImage) {
                                onViewEvidence(alert);
                              } else {
                                handleOpenReview(alert);
                              }
                            }}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => handleOpenReview(alert)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Review
                          </button>

                          {alert.status === 'pending' && (
                            <button
                              onClick={() => onDismissAlert(alert.id)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                              title="Dismiss as false positive"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setPendingDeleteId(alert.id)}
                            className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 transition-colors"
                            title="Delete this alert"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Alert */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-600/60 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Alert?</h3>
                <span className="text-xs font-mono text-slate-400">Alert ID: {pendingDeleteId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this alert?
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
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete All Alerts */}
      {isConfirmingDeleteAll && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-600/60 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete All Alerts?</h3>
                <span className="text-xs font-mono text-slate-400">{alerts.length} total alerts</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete all examination alerts? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmingDeleteAll(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteAllAlerts();
                  setIsConfirmingDeleteAll(false);
                  setFeedbackToast('All alerts have been deleted successfully.');
                  setTimeout(() => {
                    setFeedbackToast(null);
                  }, 4000);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm text-white">
                  Invigilator Incident Review - {reviewingAlert.id}
                </h3>
              </div>
              <button
                onClick={() => setReviewingAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500">Seat Zone:</span>
                  <span className="font-bold text-white ml-2">{reviewingAlert.seatId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-300 ml-2">{reviewingAlert.timeDisplay}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Activity:</span>
                  <span className="text-rose-300 font-bold ml-2">
                    {reviewingAlert.activityTitle} ({reviewingAlert.confidence}%)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Possible Suspicious Activity — Please Verify. Visual detection provides probabilistic evidence; invigilator confirmation required before taking action.</span>
              </div>

              {reviewingAlert.evidenceImage && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    Captured Screenshot Evidence:
                  </label>
                  <img
                    src={reviewingAlert.evidenceImage}
                    alt="Evidential capture"
                    className="w-full rounded-lg border border-slate-800 aspect-video object-cover"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Invigilator Verification Notes:
                </label>
                <textarea
                  value={invigilatorNotes}
                  onChange={(e) => setInvigilatorNotes(e.target.value)}
                  placeholder="Record proctor observations (e.g. Warning issued to student, Confirmed unauthorized phone under exam paper, or False positive glance)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 h-24 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setPendingDeleteId(reviewingAlert.id);
                  setReviewingAlert(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white text-xs font-medium border border-rose-800/60 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Alert
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDismissAlert(reviewingAlert.id);
                    setReviewingAlert(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                >
                  Dismiss Incident
                </button>
                <button
                  onClick={handleSaveReview}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm Review & Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
