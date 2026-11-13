import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Upload,
  Save,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
  FileCheck,
  FileX,
  Sliders,
  Check,
  Info,
  HelpCircle,
} from 'lucide-react';
import { ExamMaterialConfig } from '../types';
import { paperClassifier } from '../services/paperClassificationService';

interface ExamMaterialsViewProps {
  materialConfig: ExamMaterialConfig;
  onSaveConfig: (newConfig: ExamMaterialConfig) => void;
  onSimulatePaperTest: (type: 'qp' | 'answer_sheet' | 'cheat_sheet' | 'admit_card') => void;
}

export const ExamMaterialsView: React.FC<ExamMaterialsViewProps> = ({
  materialConfig,
  onSaveConfig,
  onSimulatePaperTest,
}) => {
  const [config, setConfig] = useState<ExamMaterialConfig>(materialConfig);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'pipeline'>('config');

  const handleSave = () => {
    onSaveConfig(config);
    paperClassifier.saveConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                OFFICIAL EXAM MATERIALS & PAPER CLASSIFIER
              </h2>
              <p className="text-xs text-slate-400">
                Configure authorized papers to prevent false alarms while isolating unauthorized cheat sheets and micro-notes.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/80 transition-all cursor-pointer self-start md:self-auto"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              CONFIG SAVED!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              [ SAVE OFFICIAL MATERIALS ]
            </>
          )}
        </button>
      </div>

      {/* Decision Flow Pipeline Diagram */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Active Computer Vision Paper Classification Pipeline
          </div>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
            ● Zero False Alarms for Sanctioned Exam Papers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">1. CAMERA FEED</div>
            <div className="text-slate-300 font-semibold text-[11px] my-1">Live Desk Video</div>
            <div className="text-[10px] text-slate-500">Bounding box candidate surface</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-purple-400 font-bold">2. PAPER DETECTOR</div>
            <div className="text-slate-300 font-semibold text-[11px] my-1">Aspect Ratio & Area</div>
            <div className="text-[10px] text-slate-500">Dimensions: 1:1.41 A4 footprint</div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-emerald-400 font-bold">3. OFFICIAL CHECK</div>
            <div className="text-emerald-200 font-semibold text-[11px] my-1">QP or Answer Sheet?</div>
            <div className="text-[10px] text-emerald-400/80 font-bold">YES → Ignore (Normal)</div>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-rose-400 font-bold">4. CHEAT CLASSIFIER</div>
            <div className="text-rose-200 font-semibold text-[11px] my-1">Micro-chit or surplus?</div>
            <div className="text-[10px] text-rose-400 font-bold">YES → 🚨 Possible Cheat Sheet</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-amber-400 font-bold">5. OTHER OBJECTS</div>
            <div className="text-slate-300 font-semibold text-[11px] my-1">Tissues / Wrappers</div>
            <div className="text-[10px] text-slate-500">Require Human Review</div>
          </div>
        </div>
      </div>

      {/* Main Material Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Official Question Paper Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-sm text-white">1. Official Question Paper</h3>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Configured as Expected Exam Material
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NO ALERT (NORMAL)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Document Description / Title:
              </label>
              <input
                type="text"
                value={config.questionPaper.name}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    questionPaper: { ...config.questionPaper, name: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Paper Dimensions:</label>
                <select
                  value={config.questionPaper.format}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      questionPaper: {
                        ...config.questionPaper,
                        format: e.target.value as 'A4' | 'A3_Folded' | 'Booklet',
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="A4">Standard A4 Sheet (210×297mm)</option>
                  <option value="A3_Folded">A3 Folded Folio</option>
                  <option value="Booklet">Multi-page Question Booklet</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Expected Count / Desk:</label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={config.questionPaper.maxCountPerDesk}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      questionPaper: {
                        ...config.questionPaper,
                        maxCountPerDesk: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Header Band & Institutional Seal:</label>
              <input
                type="text"
                value={config.questionPaper.color}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    questionPaper: { ...config.questionPaper, color: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-medium">Distinctive Examination Header / Code</span>
              <input
                type="checkbox"
                checked={config.questionPaper.hasDistinctiveHeader}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    questionPaper: {
                      ...config.questionPaper,
                      hasDistinctiveHeader: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                System rule: When candidates read or write on this Question Paper, zero suspicious activity alerts will be issued.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Official Answer Sheet Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-white">2. Official Answer Sheet / Booklet</h3>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Configured as Expected Exam Material
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NO ALERT (NORMAL)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Document Description / Title:
              </label>
              <input
                type="text"
                value={config.answerSheet.name}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    answerSheet: { ...config.answerSheet, name: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Format Type:</label>
                <select
                  value={config.answerSheet.format}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      answerSheet: {
                        ...config.answerSheet,
                        format: e.target.value as 'A4_Booklet' | 'OMR_Sheet' | 'Ruled_Pad',
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="A4_Booklet">32-Page Ruled Answer Booklet</option>
                  <option value="OMR_Sheet">Optical Mark Recognition (OMR) Sheet</option>
                  <option value="Ruled_Pad">Standard A4 Lined Answer Sheet</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Max Count / Desk:</label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={config.answerSheet.maxCountPerDesk}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      answerSheet: {
                        ...config.answerSheet,
                        maxCountPerDesk: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cover Band & Barcode Layout:</label>
              <input
                type="text"
                value={config.answerSheet.color}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    answerSheet: { ...config.answerSheet, color: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-medium">Distinctive Examination Header Band</span>
              <input
                type="checkbox"
                checked={config.answerSheet.hasHeaderBand}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    answerSheet: {
                      ...config.answerSheet,
                      hasHeaderBand: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                System rule: Normal handwriting, page-flipping, and margin drawing on this Answer Sheet are whitelisted.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Whitelist & Cheat-Sheet Detection Sensitivity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-rose-500" />
          3. Auxiliary Material Whitelist & Cheat Sheet Detection Sensitivity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Whitelisted desk items */}
          <div className="space-y-3">
            <span className="font-semibold text-slate-300 block">Permitted Auxiliary Materials:</span>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div>
                <span className="font-medium text-slate-200 block">Candidate Admit Card / Hall Ticket</span>
                <span className="text-[11px] text-slate-500">Allow small laminated identification card on desk without flagging.</span>
              </div>
              <input
                type="checkbox"
                checked={config.allowAdmitCard}
                onChange={(e) => setConfig({ ...config, allowAdmitCard: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div>
                <span className="font-medium text-slate-200 block">Official Mathematical / Formula Sheet</span>
                <span className="text-[11px] text-slate-500">Sanctioned log table or equation sheet for quantitative exams.</span>
              </div>
              <input
                type="checkbox"
                checked={config.allowFormulaSheet}
                onChange={(e) => setConfig({ ...config, allowFormulaSheet: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>
          </div>

          {/* Micro-slip / Chit sensitivity */}
          <div className="space-y-3">
            <span className="font-semibold text-slate-300 block">Cheat Slip & Chit Sensitivity:</span>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Paper Detection Sensitivity</span>
                <span className="font-mono text-cyan-400 font-bold">{config.paperDetectionSensitivity} / 10</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={config.paperDetectionSensitivity}
                onChange={(e) =>
                  setConfig({ ...config, paperDetectionSensitivity: parseInt(e.target.value) })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Higher sensitivity catches smaller folded micro-notes concealed near pencil cases.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Micro-Chit Size Threshold</span>
                <span className="font-mono text-rose-400 font-bold">
                  {(config.smallSlipThreshold * 100).toFixed(0)}% of A4
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.55"
                step="0.05"
                value={config.smallSlipThreshold}
                onChange={(e) =>
                  setConfig({ ...config, smallSlipThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Any paper detected significantly smaller than standard A4 will be flagged as a potential cheat slip.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Paper Classification Simulator / Test Calibration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Classification Verification & Calibration Sandbox
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Test the live classification rules to verify alert handling
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Click to simulate presenting different documents to candidate desk <strong>B4</strong>. Notice that official documents cause zero alerts, while unauthorized notes trigger immediate invigilator notification.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => onSimulatePaperTest('qp')}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Test Official Question Paper
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">NORMAL</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Matches A4 format. Result: <strong>Ignore (No Alert)</strong>.
            </p>
          </button>

          <button
            onClick={() => onSimulatePaperTest('answer_sheet')}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Test Official Answer Sheet
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">NORMAL</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Matches booklet format. Result: <strong>Ignore (No Alert)</strong>.
            </p>
          </button>

          <button
            onClick={() => onSimulatePaperTest('cheat_sheet')}
            className="p-3 rounded-lg bg-rose-950/30 border border-rose-600/40 hover:border-rose-500 text-left transition-all group shadow-sm shadow-rose-950"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white group-hover:text-rose-200 flex items-center gap-1.5">
                <FileX className="w-3.5 h-3.5 text-rose-400" />
                Test Unauthorized Cheat Sheet
              </span>
              <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                🚨 ALERT
              </span>
            </div>
            <p className="text-[11px] text-rose-200/80">
              Non-official micro-slip. Result: <strong>🚨 Possible Unauthorized Material Alert</strong>.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
