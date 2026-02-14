const CLOSE_REASONS = {
  TRAILING_SL: "TRAILING_SL",
  TRAILING_TP: "TRAILING_TP",
  SL_SCALP: "SL_SCALP",
  TP_SCALP: "TP_SCALP",
  PROFIT_LOCK_1: "PROFIT_LOCK_1",
  PROFIT_LOCK_2: "PROFIT_LOCK_2",
  TIMEOUT: "TIMEOUT",
  END: "END",
};

const CLOSE_REASON_LABELS = {
  [CLOSE_REASONS.TRAILING_SL]: "Stop Loss",
  [CLOSE_REASONS.TRAILING_TP]: "Take Profit",
  [CLOSE_REASONS.SL_SCALP]: "Trailing Stop (Scalp)",
  [CLOSE_REASONS.TP_SCALP]: "Take Profit (Scalp)",
  [CLOSE_REASONS.PROFIT_LOCK_1]: "Profit Lock +1.8%",
  [CLOSE_REASONS.PROFIT_LOCK_2]: "Profit Lock +2.8%",
  [CLOSE_REASONS.TIMEOUT]: "Timeout",
  [CLOSE_REASONS.END]: "End",
};

const CLOSE_REASON_GROUPS = {
  TP: "TP",
  SL: "SL",
  TIMEOUT: "TIMEOUT",
  OTHER: "OTHER",
};

function normalizeCloseReason(reason) {
  if (!reason) return CLOSE_REASON_GROUPS.OTHER;

  const normalized = String(reason).toUpperCase();

  if (normalized.includes(CLOSE_REASONS.TIMEOUT)) {
    return CLOSE_REASON_GROUPS.TIMEOUT;
  }

  if (
    normalized.includes("TP") ||
    normalized.includes("PROFIT_LOCK") ||
    normalized.includes(CLOSE_REASONS.TRAILING_TP)
  ) {
    return CLOSE_REASON_GROUPS.TP;
  }

  if (
    normalized.includes("SL") ||
    normalized.includes("STOP") ||
    normalized.includes(CLOSE_REASONS.TRAILING_SL)
  ) {
    return CLOSE_REASON_GROUPS.SL;
  }

  return CLOSE_REASON_GROUPS.OTHER;
}

module.exports = {
  CLOSE_REASONS,
  CLOSE_REASON_LABELS,
  CLOSE_REASON_GROUPS,
  normalizeCloseReason,
};
