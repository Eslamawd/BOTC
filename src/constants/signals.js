const SIGNALS = {
  LONG: "LONG",
  SHORT: "SHORT",
  HOLD: "HOLD",
};

const ORDER_ACTIONS = {
  BUY: "BUY",
  SELL: "SELL",
};

function isLongSignal(value) {
  return value === SIGNALS.LONG || value === ORDER_ACTIONS.BUY;
}

function isShortSignal(value) {
  return value === SIGNALS.SHORT || value === ORDER_ACTIONS.SELL;
}

function toPositionSide(orderAction) {
  if (orderAction === ORDER_ACTIONS.BUY) return SIGNALS.LONG;
  if (orderAction === ORDER_ACTIONS.SELL) return SIGNALS.SHORT;
  return SIGNALS.HOLD;
}

function toOrderAction(positionSide) {
  if (positionSide === SIGNALS.LONG) return ORDER_ACTIONS.BUY;
  if (positionSide === SIGNALS.SHORT) return ORDER_ACTIONS.SELL;
  return null;
}

function isAligned(trendSide, entrySide) {
  return (
    (trendSide === SIGNALS.LONG && entrySide === SIGNALS.LONG) ||
    (trendSide === SIGNALS.SHORT && entrySide === SIGNALS.SHORT)
  );
}

module.exports = {
  SIGNALS,
  ORDER_ACTIONS,
  isLongSignal,
  isShortSignal,
  toPositionSide,
  toOrderAction,
  isAligned,
};
