import React, { useState } from 'react';
import {
  Grid3X3,
  Users,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Edit2,
  Save,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { SeatZone, AlertItem } from '../types';

interface ExamHallViewProps {
  seats: SeatZone[];
  onUpdateSeat: (updatedSeat: SeatZone) => void;
  onResetSeats: () => void;
  alerts: AlertItem[];
  onNavigateToAlertsForSeat: (seatId: string) => void;
}

export const ExamHallView: React.FC<ExamHallViewProps> = ({
  seats,
  onUpdateSeat,
  onResetSeats,
  alerts,
  onNavigateToAlertsForSeat,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<SeatZone | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [studentCodeInput, setStudentCodeInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<SeatZone['status']>('normal');

  const rows = ['A', 'B', 'C', 'D'];
  const cols = [1, 2, 3, 4];

  const handleSelectSeat = (seat: SeatZone) => {
    setSelectedSeat(seat);
    setStudentCodeInput(seat.assignedStudentCode || `STU-${seat.id}`);
    setStatusInput(seat.status);
    setIsEditing(false);
  };

  const handleSaveSeat = () => {
    if (!selectedSeat) return;
    const updated: SeatZone = {
      ...selectedSeat,
      assignedStudentCode: studentCodeInput,
      status: statusInput,
      lastUpdated: Date.now(),
    };
    onUpdateSeat(updated);
    setSelectedSeat(updated);
    setIsEditing(false);
  };

  const getSeatAlerts = (seatId: string) => {
    return alerts.filter((a) => a.seatId === seatId);
  };

  const getSeatCardClasses = (status: SeatZone['status'], isSelected: boolean) => {
    const base =
      'p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ';
    const selectedRing = isSelected ? 'ring-2 ring-cyan-400 ' : '';

    switch (status) {
      case 'alert':
        return (
          base +
          selectedRing +
          'bg-rose-950/40 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50 animate-pulse'
        );
      case 'suspicious':
        return (
          base +
          selectedRing +
          'bg-amber-950/30 border-amber-500 text-amber-200 shadow-md shadow-amber-950/30'
        );
      case 'vacant':
        return base + selectedRing + 'bg-slate-950 border-slate-800 text-slate-500 opacity-60';
      default:
        return (
          base +
          selectedRing +
          'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-rose-500" />
            Examination Hall Seating Layout & Zone Calibration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Map desk zones (A1 to D4) to physical examination hall coordinates. AI matches detections to these zones automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetSeats}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Standard Layout (4x4)
          </button>
        </div>
      </div>

      {/* Main Seating Floor & Details Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Seating Layout Floor Plan */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="text-center pb-2 border-b border-slate-800 text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
            ▲ INSTRUCTOR PODIUM & PROCTOR DESK (FRONT OF HALL) ▲
          </div>

          {/* 4 Rows (A, B, C, D) */}
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row} className="flex items-center gap-3">
                <span className="w-6 font-mono font-extrabold text-slate-400 text-center text-sm">
                  {row}
                </span>

                <div className="grid grid-cols-4 gap-3 flex-1">
                  {cols.map((col) => {
                    const seatId = `${row}${col}`;
                    const seat = seats.find((s) => s.id === seatId) || {
                      id: seatId,
                      label: `Seat ${seatId}`,
                      row,
                      col,
                      x: 0,
                      y: 0,
                      width: 0.2,
                      height: 0.2,
                      status: 'normal',
                      assignedStudentCode: `STU-${seatId}`,
                    };
                    const isSelected = selectedSeat?.id === seatId;
                    const seatAlerts = getSeatAlerts(seatId);

                    return (
                      <div
                        key={seatId}
                        onClick={() => handleSelectSeat(seat)}
                        className={getSeatCardClasses(seat.status, isSelected)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-white">
                            {seat.id}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              seat.status === 'alert'
                                ? 'bg-rose-500 animate-ping'
                                : seat.status === 'suspicious'
                                ? 'bg-amber-400'
                                : seat.status === 'vacant'
                                ? 'bg-slate-600'
                                : 'bg-emerald-400'
                            }`}
                          ></span>
                        </div>

                        <div className="my-2">
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {seat.assignedStudentCode || `STU-${seat.id}`}
                          </div>
                          <div className="text-[9px] uppercase font-bold tracking-wider mt-0.5 opacity-80">
                            {seat.status}
                          </div>
                        </div>

                        {seatAlerts.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <span className="text-rose-400 font-bold">
                              {seatAlerts.length} Flag{seatAlerts.length > 1 ? 's' : ''}
                            </span>
                            <span className="text-slate-500">
                              {seatAlerts[0].timeDisplay}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2 border-t border-slate-800 text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
            ▼ HALL ENTRANCE & CANDIDATE ACCESS ▼
          </div>
        </div>

        {/* Selected Desk Zone Details Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              Zone Inspector
            </h3>
            {selectedSeat && (
              <span className="font-mono font-bold text-base px-2 py-0.5 rounded bg-slate-950 text-rose-400 border border-slate-800">
                {selectedSeat.id}
              </span>
            )}
          </div>

          {selectedSeat ? (
            <div className="space-y-4">
              {/* Form / Edit mode */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Candidate Code (Anonymous Reference)
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 disabled:opacity-70 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Privacy Policy: No personal candidate names stored.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Zone Operational Status
                  </label>
                  <select
                    disabled={!isEditing}
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as SeatZone['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 disabled:opacity-70 focus:outline-none focus:border-rose-500 capitalize"
                  >
                    <option value="normal">Normal (Clear)</option>
                    <option value="suspicious">Suspicious (Watchlist)</option>
                    <option value="alert">Alert (Immediate Review)</option>
                    <option value="vacant">Vacant (Absent)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {isEditing ? (
                  <button
                    onClick={handleSaveSeat}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Zone Updates
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Zone
                  </button>
                )}
              </div>

              {/* Incidents at this seat */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Incidents Logged ({getSeatAlerts(selectedSeat.id).length})
                  </span>
                  {getSeatAlerts(selectedSeat.id).length > 0 && (
                    <button
                      onClick={() => onNavigateToAlertsForSeat(selectedSeat.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                    >
                      View All
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {getSeatAlerts(selectedSeat.id).length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs bg-slate-950/60 rounded">
                      No suspicious activities recorded at desk {selectedSeat.id}.
                    </div>
                  ) : (
                    getSeatAlerts(selectedSeat.id).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{alert.activityTitle}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {alert.timeDisplay} • Conf: {alert.confidence}%
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                            alert.status === 'pending'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Grid3X3 className="w-8 h-8 mx-auto text-slate-600" />
              <p>Click any desk in the examination hall matrix to calibrate or inspect candidate history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
