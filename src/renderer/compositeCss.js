/** CSS оптической плотности Light 300 (вес не меняем). */
export function compositeLightTextCss(selectorPrefix) {
  return `${selectorPrefix} #chat .bubble:not(.message--media) .bubble-text,
${selectorPrefix} #chat .bubble .meta,
${selectorPrefix} #chat .date-sep span {
  font-family: 'SF Pro Text', 'SF UI Text', sans-serif !important;
  font-weight: 300 !important;
  font-synthesis: none !important;
  color: #ffffff !important;
  text-shadow: none !important;
  -webkit-font-smoothing: antialiased !important;
  text-rendering: geometricPrecision !important;
  -webkit-text-stroke: 0.028em rgba(255, 255, 255, 0.62) !important;
  paint-order: stroke fill !important;
}
${selectorPrefix} #chat .bubble .meta {
  color: rgba(255, 255, 255, 0.72) !important;
  -webkit-text-stroke: 0.02em rgba(255, 255, 255, 0.4) !important;
}`;
}
