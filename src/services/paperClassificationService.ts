import { ExamMaterialConfig, PaperClassificationType } from '../types';

const STORAGE_KEY_EXAM_MATERIALS = 'exam_monitoring_materials_v2';

export const defaultExamMaterials: ExamMaterialConfig = {
  questionPaper: {
    name: 'Official Question Paper (Standard A4 Format)',
    format: 'A4',
    color: 'White 80gsm / Institutional Seal',
    aspectRatioMin: 1.25,
    aspectRatioMax: 1.55,
    maxCountPerDesk: 1,
    hasDistinctiveHeader: true,
  },
  answerSheet: {
    name: 'Official 32-Page Ruled Answer Booklet',
    format: 'A4_Booklet',
    color: 'White with Pink/Blue Examination Header Band',
    aspectRatioMin: 1.25,
    aspectRatioMax: 1.55,
    maxCountPerDesk: 1,
    hasHeaderBand: true,
  },
  allowAdmitCard: true,
  allowFormulaSheet: false,
  paperDetectionSensitivity: 7,
  smallSlipThreshold: 0.35, // Size relative to A4 (under this is deemed micro-slip / cheat chit)
};

export interface PaperClassificationResult {
  classification: PaperClassificationType;
  label: string;
  isOfficial: boolean;
  shouldAlert: boolean;
  confidence: number;
  reason: string;
}

class PaperClassificationService {
  private config: ExamMaterialConfig = defaultExamMaterials;

  constructor() {
    this.loadConfig();
  }

  public getConfig(): ExamMaterialConfig {
    return this.config;
  }

  public saveConfig(newConfig: ExamMaterialConfig) {
    this.config = newConfig;
    try {
      localStorage.setItem(STORAGE_KEY_EXAM_MATERIALS, JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  }

  public loadConfig(): ExamMaterialConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXAM_MATERIALS);
      if (stored) {
        this.config = { ...defaultExamMaterials, ...JSON.parse(stored) };
        return this.config;
      }
    } catch {
      // fallback
    }
    this.config = defaultExamMaterials;
    return this.config;
  }

  /**
   * Dedicated Paper Classification Engine
   * Distinguishes:
   * 1. Official Question Paper -> Normal (NO ALERT)
   * 2. Official Answer Sheet -> Normal (NO ALERT)
   * 3. Unauthorized Paper / Handwritten Notes / Cheat Sheet -> Alert
   * 4. Other Paper-like Objects -> Verification required
   */
  public classifyPaper(
    paperBbox: [number, number, number, number], // [x, y, w, h]
    deskPixelArea: number,
    existingPapersOnDesk: Array<{ type: PaperClassificationType }>
  ): PaperClassificationResult {
    const [, , w, h] = paperBbox;
    const paperArea = w * h;
    const longer = Math.max(w, h);
    const shorter = Math.min(w, h);
    const aspectRatio = shorter > 0 ? longer / shorter : 1.41;

    // Normal A4 aspect ratio is ~1.414 (1:1.41)
    const isStandardA4Ratio =
      aspectRatio >= this.config.questionPaper.aspectRatioMin &&
      aspectRatio <= this.config.questionPaper.aspectRatioMax;

    // Relative size compared to candidate desk
    const relativeArea = deskPixelArea > 0 ? paperArea / deskPixelArea : 0.2;

    const hasQuestionPaper = existingPapersOnDesk.some(
      (p) => p.type === 'official_question_paper'
    );
    const hasAnswerSheet = existingPapersOnDesk.some(
      (p) => p.type === 'official_answer_sheet'
    );

    // 1. Check if matches Official Question Paper
    if (!hasQuestionPaper && isStandardA4Ratio && relativeArea >= 0.12 && relativeArea <= 0.45) {
      return {
        classification: 'official_question_paper',
        label: 'Official Question Paper',
        isOfficial: true,
        shouldAlert: false,
        confidence: 94,
        reason: 'Matches official question paper A4 dimensions and format specifications.',
      };
    }

    // 2. Check if matches Official Answer Sheet
    if (!hasAnswerSheet && isStandardA4Ratio && relativeArea >= 0.12 && relativeArea <= 0.48) {
      return {
        classification: 'official_answer_sheet',
        label: 'Official Answer Sheet',
        isOfficial: true,
        shouldAlert: false,
        confidence: 96,
        reason: 'Matches official answer booklet size, binding, and header layout.',
      };
    }

    // 3. Check if matches Whitelisted Admit Card / Hall Ticket
    if (this.config.allowAdmitCard && relativeArea >= 0.03 && relativeArea < 0.12) {
      const isCardRatio = aspectRatio >= 1.2 && aspectRatio <= 1.7;
      if (isCardRatio) {
        return {
          classification: 'allowed_auxiliary',
          label: 'Candidate Admit Card / Hall Ticket',
          isOfficial: true,
          shouldAlert: false,
          confidence: 88,
          reason: 'Whitelisted candidate identification ticket allowed on desk.',
        };
      }
    }

    // 4. Check if matches Allowed Formula Sheet
    if (this.config.allowFormulaSheet && isStandardA4Ratio && relativeArea >= 0.1) {
      return {
        classification: 'allowed_auxiliary',
        label: 'Official Formula Sheet',
        isOfficial: true,
        shouldAlert: false,
        confidence: 90,
        reason: 'Whitelisted reference material sanctioned for this examination.',
      };
    }

    // 5. UNAUTHORIZED CHEAT-SHEET / HANDWRITTEN NOTES DETECTION
    // Micro-chits, pocket slips, torn notes, or surplus unauthorized papers
    const isMicroSlip = relativeArea < this.config.smallSlipThreshold * 0.25;
    const isAbnormalAspect = aspectRatio > 1.85 || aspectRatio < 1.15;
    const isSurplusPaper = hasQuestionPaper && hasAnswerSheet;

    if (isMicroSlip || (isSurplusPaper && isStandardA4Ratio) || (relativeArea < 0.15 && isAbnormalAspect)) {
      const confidence = isMicroSlip
        ? Math.min(95, Math.round(82 + (1 - relativeArea) * 15))
        : isSurplusPaper
        ? 89
        : 84;

      return {
        classification: 'unauthorized_cheat_sheet',
        label: 'Possible Cheat Sheet / Unauthorized Paper',
        isOfficial: false,
        shouldAlert: true,
        confidence,
        reason: isMicroSlip
          ? 'Concealed micro-slip / folded handwritten paper chit detected on desk.'
          : isSurplusPaper
          ? 'Surplus unauthorized paper sheet beyond official question & answer documents.'
          : 'Non-standard paper dimension consistent with cheat notes.',
      };
    }

    // 6. Other Paper-like Objects (Tissue, eraser sleeve, ruler backing)
    // "Other paper-like objects -> Do not immediately classify as cheating -> Require sufficient confidence and/or human verification"
    return {
      classification: 'unverified_paper_object',
      label: 'Unverified Paper-Like Object',
      isOfficial: false,
      shouldAlert: false, // Low urgency: don't sound alarm, but log for human verification
      confidence: 68,
      reason: 'Paper-like object detected. Pending invigilator verification.',
    };
  }
}

export const paperClassifier = new PaperClassificationService();
