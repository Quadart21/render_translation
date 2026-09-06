import { compositeLightTextCss } from './compositeCss.js';
import { iosHeaderGeometry } from './iosComposite.js';

/**
 * Native Android composite layout + injected CSS.
 * @param {{ nativeW: number, nativeH: number, themeSel: string }} opts
 * @returns {string}
 */
export function buildAndroidNativeCompositeCss({ nativeW, nativeH, themeSel }) {
  const chatTopPx = 0;
  const sx = nativeW / 360;
  const sy = nativeH / 806;
  const chromeTop = Math.round(nativeH * 0.0395);
  const chromeH = Math.round(nativeW * (88 / 1374));
  const chromeGap = Math.round(nativeW * (10 / 1374));
  const chromeSide = Math.round(nativeW * (18 / 1374));
  /* пилюля звонок+меню — 1.8× от базового chrome (+20% к прежним 1.5×);
     title и стрелка той же высоты (в ассетах все 788px) */
  const actionsH = Math.round(chromeH * 1.8);
  const actionsW = Math.round(actionsH * (427 / 197));
  const titleH = actionsH;
  const backH = actionsH;
  /* аватар почти в высоту пилюли, зазор ~2px */
  const titleAvatarGap = 2;
  const titleAvatar = Math.max(1, titleH - titleAvatarGap * 2);
  const titleFont = Math.round(titleH * 0.336); /* +20% к нику */
  const titleStatusFont = Math.round(titleH * 0.2);
  /* аватар у левого края пилюли — тот же зазор, что сверху/снизу */
  const titlePadEnd = Math.round(titleH * 0.26);
  const titlePadStart = titleAvatarGap;
  const titleGap = Math.round(titleH * 0.1);
  const composerBottom = Math.round(nativeH * 0.026);
  /* нижняя пилюля выше (~+30% к базовой 88px @1374) */
  const composerH = Math.round(nativeW * (114 / 1374));
  const composerSide = Math.round(nativeW * (18 / 1374));
  /* низ ленты — вплотную к верхнему краю композера */
  const chatBottomPx = composerBottom + composerH + Math.round(4 * sy);
  const composerIcon = Math.round(composerH * 0.36);
  const composerIconSlot = Math.round(composerH * 0.58);
  /* синий mic-диск внутри пилюли, чуть меньше высоты */
  const composerMic = Math.round(composerH * 0.78);
  const composerGap = Math.round(nativeW * (8 / 1374));
  const composerMicInset = Math.round(composerH * 0.11);
  /* clip чуть левее mic + mic внутри пилюли */
  const composerClipExtra = Math.round(composerH * 0.22);
  const composerRightPack =
    composerMic +
    composerMicInset +
    composerIconSlot +
    composerGap +
    composerClipExtra +
    Math.round(composerH * 0.08);
  return `<style id="native-composite-size">
html, body {
  background: transparent !important;
  margin: 0 !important;
}
${themeSel}{
  width:${nativeW}px !important;
  height:${nativeH}px !important;
  max-height:${nativeH}px !important;
  border-radius:0 !important;
  background:transparent !important;
  box-shadow:none !important;
  --and-ref-sx:${sx.toFixed(6)};
  --and-ref-sy:${sy.toFixed(6)};
  --and-status-icon-h:${Math.max(13, Math.round(13 * sy))}px;
  --and-title-pill-h:${titleH}px;
  --and-actions-pill-h:${actionsH}px;
  --and-composer-field-h:${composerH}px;
  --and-composer-mic-size:${composerMic}px;
  --and-composer-field-gap:${composerGap}px;
  --and-composer-icon-size:${composerIcon}px;
  --and-composer-right-pack-w:0px;
  --and-side-gap:${composerSide}px;
}
${themeSel} .phone-main,
${themeSel} .chat-wrap,
${themeSel} .chat-wrap::before {
  background:transparent !important;
  background-image:none !important;
  box-shadow:none !important;
}
${themeSel} .composite-screen-bg{display:none !important;}
${themeSel} .android-home-indicator,
${themeSel} .pinned-container {
  display:none !important;
}
${themeSel} .status-bar-blocker {
  display:none !important;
  background:transparent !important;
}
${themeSel} .status-bar {
  display:flex !important;
  visibility:visible !important;
  opacity:1 !important;
  position:relative !important;
  height:${chromeTop}px !important;
  min-height:${chromeTop}px !important;
  padding:0 ${chromeSide}px !important;
  align-items:center !important;
  justify-content:space-between !important;
  box-sizing:border-box !important;
  background:transparent !important;
  color:#fff !important;
  font-size:${Math.max(22, Math.round(chromeTop * 0.42))}px !important;
  font-weight:600 !important;
  line-height:1 !important;
  z-index:5 !important;
}
${themeSel} .status-bar #androidTime {
  color:#fff !important;
  font-weight:600 !important;
}
${themeSel} .android-status-tray,
${themeSel} .status-extra-icons {
  --and-tray-gap:calc(4px * var(--and-ref-sx)) !important;
  gap:var(--and-tray-gap) !important;
}
${themeSel} .android-status-tray,
${themeSel} .status-extra-icons,
${themeSel} .status-battery {
  min-height:var(--and-status-icon-h) !important;
  height:var(--and-status-icon-h) !important;
  align-items:center !important;
}
${themeSel} .status-bar .status-tray-signal,
${themeSel} .status-bar .status-tray-wifi {
  height:var(--and-status-icon-h) !important;
  width:auto !important;
  max-height:var(--and-status-icon-h) !important;
  object-fit:contain !important;
}
${themeSel} .status-extra-icon {
  width:var(--and-status-icon-h) !important;
  height:var(--and-status-icon-h) !important;
}
${themeSel} .status-extra-icon svg {
  width:100% !important;
  height:100% !important;
}
${themeSel} .status-battery {
  --battery-fill-color:#4d4d4d !important;
}
${themeSel} .status-battery-shell {
  height:var(--and-status-icon-h) !important;
  width:calc(var(--and-status-icon-h) * 24 / 13) !important;
  box-sizing:border-box !important;
  padding:0 !important;
  border:none !important;
  background:transparent !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  overflow:hidden !important;
}
${themeSel} .status-battery-shell::after {
  content:"" !important;
  position:absolute !important;
  inset:0 !important;
  border:2.7px solid rgba(255,255,255,0.92) !important;
  border-radius:inherit !important;
  box-sizing:border-box !important;
  pointer-events:none !important;
  z-index:2 !important;
}
${themeSel} .status-battery-fill {
  display:block !important;
  position:absolute !important;
  left:3.5px !important;
  top:3.5px !important;
  bottom:3.5px !important;
  width:var(--battery-level) !important;
  max-width:calc(100% - 7px) !important;
  background:var(--battery-fill-color) !important;
  border-radius:1px !important;
  z-index:0 !important;
}
${themeSel} .status-battery.is-low {
  --battery-fill-color:#ff3b30 !important;
}
${themeSel} .status-battery.is-low .status-battery-shell::after {
  border-color:rgba(255,255,255,0.92) !important;
}
${themeSel} .status-battery-cap {
  height:calc(var(--and-status-icon-h) * 7 / 13) !important;
  width:calc(var(--and-status-icon-h) * 2 / 13) !important;
}
${themeSel} .status-battery-value {
  font-size:calc(var(--and-status-icon-h) - 2px) !important;
  line-height:1 !important;
  font-weight:500 !important;
  top:0 !important;
  height:auto !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
}
${themeSel} .phone-chrome {
  display:block !important;
  z-index:4 !important;
  pointer-events:none !important;
  background:transparent !important;
}
${themeSel} .chrome-header-stack {
  display:block !important;
  position:relative !important;
  background:transparent !important;
  height:auto !important;
  min-height:0 !important;
  padding: 0 ${chromeSide}px 0 !important;
}
/* Blur-зону под хедером рисует Sharp после сборки с подложкой */
${themeSel} .chrome-header-stack::before {
  display:none !important;
}
${themeSel} .telegram-header {
  display:grid !important;
  grid-template-columns: ${backH}px minmax(0, 1fr) ${actionsW}px !important;
  column-gap: ${chromeGap}px !important;
  align-items:center !important;
  height:auto !important;
  min-height:${Math.max(backH, titleH, actionsH)}px !important;
  padding:0 !important;
  border:none !important;
  background:transparent !important;
}
${themeSel} .back-button {
  display:block !important;
  width:${backH}px !important;
  height:${backH}px !important;
  border-radius:50% !important;
  background:transparent !important;
  box-shadow:none !important;
  padding:0 !important;
  overflow:hidden !important;
}
${themeSel} .back-button .android-back-full {
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
}
${themeSel} .header-title-pill {
  display:flex !important;
  align-items:center !important;
  box-sizing:border-box !important;
  height:var(--and-title-pill-h) !important;
  min-height:var(--and-title-pill-h) !important;
  max-height:var(--and-title-pill-h) !important;
  margin:0 !important;
  padding:0 ${titlePadEnd}px 0 ${titlePadStart}px !important;
  column-gap:${titleGap}px !important;
  border-radius:999px !important;
  background-color:#212B35 !important;
  background-image:url("__ANDROID_TITLE_PILL__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  background-position:center !important;
  box-shadow:none !important;
  overflow:hidden !important;
}
${themeSel} .header-title-pill .chat-avatar {
  width:${titleAvatar}px !important;
  height:${titleAvatar}px !important;
  font-size:${Math.round(titleAvatar * 0.42)}px !important;
  border-radius:50% !important;
  border:none !important;
  outline:none !important;
  box-shadow:none !important;
  box-sizing:border-box !important;
  order:1 !important;
  margin-left:0 !important;
  margin-right:0 !important;
  flex:0 0 ${titleAvatar}px !important;
  object-fit:cover !important;
}
${themeSel} .header-title-pill .chat-avatar.placeholder {
  background:#5B8DEF !important;
  color:#fff !important;
  border:none !important;
  outline:none !important;
  box-shadow:none !important;
}
${themeSel} .header-title-pill .chat-meta {
  order:2 !important;
  display:flex !important;
  flex-direction:column !important;
  justify-content:center !important;
  gap:${Math.max(1, Math.round(titleH * 0.02))}px !important;
  min-width:0 !important;
  flex:1 1 auto !important;
  overflow:hidden !important;
  -webkit-mask-image:linear-gradient(90deg, #000 0%, #000 calc(100% - ${Math.max(18, Math.round(titleH * 0.38))}px), transparent 100%) !important;
  mask-image:linear-gradient(90deg, #000 0%, #000 calc(100% - ${Math.max(18, Math.round(titleH * 0.38))}px), transparent 100%) !important;
}
${themeSel} .header-title-pill .chat-meta .name {
  color:#fff !important;
  font-size:${titleFont}px !important;
  line-height:1.15 !important;
  font-weight:600 !important;
  -webkit-text-stroke:0 !important;
  text-shadow:none !important;
  paint-order:normal !important;
  white-space:nowrap !important;
  overflow:hidden !important;
  text-overflow:clip !important;
  max-width:100% !important;
}
${themeSel} .header-title-pill .chat-meta .status,
${themeSel} .header-title-pill #androidChatStatus {
  display:block !important;
  font-size:${titleStatusFont}px !important;
  line-height:1.15 !important;
  font-weight:500 !important;
  white-space:nowrap !important;
  overflow:hidden !important;
  text-overflow:clip !important;
  max-width:100% !important;
}
${themeSel} .header-title-pill .chat-meta .status.status-online,
${themeSel} .header-title-pill .chat-meta .status.status-typing {
  color:#8ec0ff !important;
}
${themeSel} .header-title-pill .chat-meta .status.status-gray {
  color:rgba(255,255,255,0.62) !important;
}
${themeSel} .header-actions-pill {
  display:block !important;
  box-sizing:border-box !important;
  width:${actionsW}px !important;
  height:var(--and-actions-pill-h) !important;
  min-height:var(--and-actions-pill-h) !important;
  max-height:var(--and-actions-pill-h) !important;
  padding:0 !important;
  background:transparent !important;
  box-shadow:none !important;
  border-radius:0 !important;
  overflow:hidden !important;
}
${themeSel} .header-actions-pill .header-actions-pill-img {
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
}
${themeSel} .input-panel {
  display:block !important;
  z-index:5 !important;
  pointer-events:none !important;
  left:${composerSide}px !important;
  right:${composerSide}px !important;
  bottom:${composerBottom}px !important;
  height:${composerH}px !important;
  background:transparent !important;
}
${themeSel} .input-panel::before {
  height:${composerH}px !important;
  left:0 !important;
  right:0 !important;
  border-radius:${Math.round(composerH / 2)}px !important;
  background-image:url("__ANDROID_INPUT_PILL__") !important;
  background-size:100% 100% !important;
  border:none !important;
  box-shadow:none !important;
}
${themeSel} .input-panel .emoji-btn {
  width:${Math.round(composerH * 0.85)}px !important;
  left:${Math.round(composerH * 0.12)}px !important;
  height:${composerH}px !important;
}
${themeSel} .input-panel .gift-btn {
  display:none !important;
}
${themeSel} .input-panel .clip-btn {
  width:${composerIconSlot}px !important;
  height:${composerH}px !important;
  right:${composerMic + composerMicInset + composerGap + composerClipExtra}px !important;
  top:0 !important;
}
${themeSel} .input-panel .voice-button {
  width:${composerMic}px !important;
  height:${composerMic}px !important;
  right:${composerMicInset}px !important;
  top:50% !important;
  transform:translateY(-50%) !important;
  background:transparent !important;
  box-shadow:none !important;
  border-radius:50% !important;
  overflow:hidden !important;
  display:grid !important;
  place-items:center !important;
}
${themeSel} .input-panel .voice-button .composer-tool-icon {
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
}
${themeSel} .input-panel .message-input {
  height:${composerH}px !important;
  min-height:${composerH}px !important;
  font-size:${Math.round(composerH * 0.48)}px !important;
  line-height:${composerH}px !important;
  right:${composerRightPack}px !important;
}
${themeSel} .chat-wrap,
${themeSel} #chat.chat-wrap {
  inset: unset !important;
  top: 0 !important;
  right: 0 !important;
  bottom: ${chatBottomPx}px !important;
  left: 0 !important;
  height: auto !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  /* flex-start + margin-top:auto на первом child: короткие вниз, длинные скроллятся */
  justify-content: flex-start !important;
  /* как в Telegram: лента под прозрачным хедером, frost рисует Sharp */
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  clip-path: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  z-index:1 !important;
  min-height: 0 !important;
}
${themeSel} .chat-wrap > :first-child {
  margin-top: auto !important;
}
${themeSel} .chat-wrap > :last-child {
  margin-bottom: 0 !important;
}
${themeSel} #chat .row {
  margin-bottom: ${Math.round(6 * sy)}px !important;
}
${themeSel} #chat .row:last-child {
  margin-bottom: 0 !important;
}
${themeSel} .date-sep {
  margin: 0 0 ${Math.round(4 * sy)}px !important;
}
${themeSel} .date-sep span.date-divider,
${themeSel} .date-sep span {
  margin: 0 auto ${Math.round(2 * sy)}px !important;
  min-height: ${Math.round(20 * sy)}px !important;
  line-height: ${Math.round(20 * sy)}px !important;
}
${themeSel} #chat .bubble:not(.message--media) {
  font-size: ${Math.round(12.75 * sx)}px !important;
  padding-top: ${Math.round(7 * sy)}px !important;
  padding-bottom: ${Math.round(7 * sy)}px !important;
  min-height: 0 !important;
}
${themeSel} #chat .row.in .bubble:not(.message--media) {
  padding-left: ${Math.round(13 * sx)}px !important;
  padding-right: ${Math.round(12 * sx)}px !important;
}
${themeSel} #chat .row.out .bubble:not(.message--media) {
  padding-left: ${Math.round(13 * sx)}px !important;
  padding-right: ${Math.round(14 * sx)}px !important;
}
${themeSel} #chat .bubble .meta {
  font-size: ${Math.round(8.5 * sx)}px !important;
  line-height: 1 !important;
  align-items: center !important;
}
${themeSel} #chat .row.out .bubble .meta {
  gap: ${Math.max(2, Math.round(2 * sx))}px !important;
  align-items: center !important;
}
${themeSel} #chat .row.out .bubble .checks {
  height: 1em !important;
  height: 1cap !important;
  width: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  overflow: visible !important;
  margin-left: 0 !important;
  flex-shrink: 0 !important;
}
${themeSel} #chat .row.out .bubble .checks-img,
${themeSel} #chat .message__image-wrap--overlay .checks-img {
  height: 1em !important;
  height: 1cap !important;
  width: auto !important;
  object-fit: contain !important;
  object-position: center !important;
  clip-path: none !important;
  transform: none !important;
  opacity: 1 !important;
  filter: none !important;
}
/* meta a–e: a — рядом с текстом; b–e — угол */
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media) {
  display: inline-grid !important;
  grid-template-columns: max-content max-content !important;
  align-items: end !important;
  justify-content: start !important;
  column-gap: ${Math.round(4 * sx)}px !important;
  position: relative !important;
  width: fit-content !important;
  max-width: 100% !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media)::after {
  display: none !important;
  content: none !important;
}
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media) .bubble-text {
  grid-column: 1 !important;
  grid-row: 1 !important;
  display: block !important;
  min-width: 0 !important;
  width: auto !important;
  max-width: 100% !important;
  padding-bottom: 0 !important;
  padding-right: 0 !important;
}
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media) .meta {
  grid-column: 2 !important;
  grid-row: 1 !important;
  align-self: end !important;
  position: static !important;
  float: none !important;
  clear: none !important;
  right: auto !important;
  bottom: auto !important;
  top: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  align-items: center !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) {
  display: inline-grid !important;
  grid-template-columns: max-content max-content !important;
  align-items: end !important;
  column-gap: ${Math.round(4 * sx)}px !important;
  position: relative !important;
  padding-right: ${Math.round(4 * sx)}px !important;
  width: fit-content !important;
  max-width: 100% !important;
  overflow: hidden !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) .bubble-text {
  grid-column: 1 !important;
  grid-row: 1 !important;
  display: block !important;
  padding-right: 0 !important;
  padding-bottom: 0 !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) .meta {
  grid-column: 2 !important;
  grid-row: 1 !important;
  position: static !important;
  right: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  align-items: center !important;
  transform: none !important;
}
${themeSel} #chat .row.in .bubble.bubble--ios-a:not(.message--media) {
  padding-right: ${Math.round(10 * sx)}px !important;
}
${themeSel} #chat .bubble.bubble--ios-b:not(.message--media),
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media),
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media),
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) {
  display: inline-block !important;
  position: relative !important;
  overflow: hidden !important;
}
${themeSel} #chat .bubble.bubble--ios-b:not(.message--media) .meta,
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media) .meta,
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media) .meta,
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(10 * sx)}px !important;
  bottom: ${Math.round(5 * sy)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  z-index: 2 !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-b:not(.message--media) .meta {
  right: ${Math.round(22 * sx)}px !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-c:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.bubble--ios-d:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.bubble--ios-e:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.meta-corner-tuck:not(.message--media) .meta {
  right: ${Math.round(12 * sx)}px !important;
}
${themeSel} #chat .row.in .bubble.bubble--ios-b:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-c:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-d:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-e:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.meta-corner-tuck:not(.message--media) .meta {
  right: ${Math.round(8 * sx)}px !important;
}
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media) .bubble-text,
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media) .bubble-text,
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) .bubble-text {
  padding-bottom: 0 !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) {
  position: relative !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) .bubble-text {
  padding-bottom: ${Math.round(8 * sy)}px !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(10 * sx)}px !important;
  bottom: ${Math.round(4 * sy)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  z-index: 2 !important;
}
${themeSel} #chat .message__image-wrap--overlay .meta {
  right: ${Math.round(5 * sx)}px !important;
}
${themeSel} #chat .row.out .message__image-wrap--overlay .meta {
  right: ${Math.round(4 * sx)}px !important;
}
${themeSel} #chat .bubble:not(.message--media) .meta-slot,
${themeSel} #chat .bubble:not(.message--media) .meta-spacer {
  display: none !important;
}
${themeSel} #chat .date-sep span {
  font-size: ${Math.round(10.5 * sx)}px !important;
}
${themeSel} #chat .bubble.message--media {
  width: fit-content !important;
  max-width: ${Math.round(240 * sx)}px !important;
  padding: ${Math.max(3, Math.round(2.5 * sx))}px !important;
  min-height: 0 !important;
  border-radius: ${Math.round(12 * sx)}px !important;
  position: relative !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
${themeSel} #chat .row.out .bubble.message--media {
  background: #1b8ad8 !important;
}
${themeSel} #chat .row.in .bubble.message--media {
  background: #1f2c3a !important;
}
${themeSel} #chat .message__image-wrap {
  width: fit-content !important;
  max-width: 100% !important;
  border-radius: ${Math.round(9.5 * sx)}px !important;
  line-height: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
}
${themeSel} #chat .message__image {
  display: block !important;
  width: auto !important;
  max-width: 100% !important;
  height: auto !important;
  max-height: ${Math.round(280 * sy)}px !important;
  object-fit: contain !important;
  object-position: center !important;
}
${themeSel} #chat .message__caption {
  margin-top: ${Math.round(4 * sy)}px !important;
  padding: 0 ${Math.round(54 * sx)}px ${Math.round(2 * sy)}px ${Math.round(4 * sx)}px !important;
  font-size: ${Math.round(12.75 * sx)}px !important;
  line-height: 1.25 !important;
}
${themeSel} #chat .message__image-wrap--overlay .meta {
  right: ${Math.round(5 * sx)}px !important;
  bottom: ${Math.round(4 * sy)}px !important;
  font-size: ${Math.round(8.5 * sx)}px !important;
}
${themeSel} #chat .bubble.message--media > .meta {
  position: absolute !important;
  right: ${Math.round(8 * sx)}px !important;
  bottom: ${Math.round(6 * sy)}px !important;
  margin: 0 !important;
  font-size: ${Math.round(8.5 * sx)}px !important;
}
${compositeLightTextCss(themeSel)}
</style>`;
}

/**
 * Native iOS composite layout + injected CSS.
 * @param {{ nativeW: number, nativeH: number, themeSel: string, iosCompositeScale: number, PHONE_LOGICAL_WIDTH_CSS_PX: number }} opts
 * @returns {string}
 */
export function buildIosNativeCompositeCss({
  nativeW,
  nativeH,
  themeSel,
  iosCompositeScale,
  PHONE_LOGICAL_WIDTH_CSS_PX,
}) {
  /* Шапка: em от базового 16px×scale (iosHeaderGeometry). Композер пока от ширины ассетов. */
  const s = iosCompositeScale > 0 ? iosCompositeScale : nativeW / PHONE_LOGICAL_WIDTH_CSS_PX;
  const g = iosHeaderGeometry(nativeW, nativeH);
  const {
    statusH,
    pillH,
    pillVisualH,
    navH,
    navPadY,
    navPadX,
    chromeGap,
    statusPillGap,
    chromeSide,
    titleFont,
    titleStatusFont,
    statusFont,
    statusIcon,
    avatar,
    avatarOuter,
    avatarGap,
    avatarOutlineW,
    avatarShiftX,
  } = g;
  const composerH = Math.round(nativeW * (96 / 1391) * 1.3);
  const composerBottom = Math.round(nativeH * 0.02);
  const homeH = Math.round(nativeH * 0.01);
  /* Лента на весь экран — сообщения уходят под верхние и нижние пилюли (frost в sharp). */
  const chatTopPx = 0;
  const chatBottomPx = 0;
  const fsBubble = Math.round(12.75 * s);
  const fsMeta = Math.round(8.5 * s);
  const fsDate = Math.round(10.5 * s);
  const padY = Math.round(7 * s);
  const padX = Math.round(11 * s);
  const padY2 = padY;
  const rad = Math.round(18 * s);
  const mediaW = Math.round(240 * s);
  const mediaPad = Math.max(2, Math.round(2 * s));
  const mediaRad = Math.round(12 * s);
  const mediaImgRad = Math.round(10 * s);
  const mediaMetaFs = Math.round(8 * s);
  const mediaCaptionFs = Math.round(9 * s);
  const mediaMaxH = Math.round(280 * s);
  const outlineW = Math.max(1, Math.round(0.08 * g.u));
  /* pillVisualH / avatarOuter из iosHeaderGeometry: обводка аватара = высота средней пилюли */
  /* высота −2px снизу (верх на месте); шеврон от прежней высоты */
  const unreadHBase = Math.max(1, Math.round(pillH * 0.418) - 3);
  const unreadH = Math.max(1, unreadHBase - 2);
  const unreadMinW = Math.round(pillH * 0.34);
  const unreadPadX = Math.round(pillH * 0.09);
  const chevronSize = Math.round(unreadHBase * 1.1);
  const unreadGap = Math.max(1, Math.round(0.06 * g.u));
  return `<style id="native-composite-size">
html, body {
  background: transparent !important;
  margin: 0 !important;
}
${themeSel}{
  width:${nativeW}px !important;
  height:${nativeH}px !important;
  max-height:${nativeH}px !important;
  border-radius:0 !important;
  background:transparent !important;
  box-shadow:none !important;
  --comp-s:${s.toFixed(6)};
  --ios-nav-row-height:${pillH}px;
  --ios-nav-avatar-inner:${avatar}px;
}
${themeSel} .phone-main,
${themeSel} .chat-wrap,
${themeSel} .chat-wrap::before {
  background:transparent !important;
  background-image:none !important;
  box-shadow:none !important;
}
${themeSel} .composite-screen-bg{display:none !important;}
${themeSel} .pinned-container,
${themeSel} .ios-pinned-row {
  display:none !important;
}
${themeSel} .phone-chrome {
  display:block !important;
  visibility:visible !important;
  position:absolute !important;
  left:0 !important;
  right:0 !important;
  top:0 !important;
  z-index:5 !important;
  pointer-events:none !important;
  background:transparent !important;
  padding:0 ${chromeSide}px !important;
}
${themeSel} .chrome-header-stack {
  display:block !important;
  visibility:visible !important;
  background:transparent !important;
  border:none !important;
  padding:0 !important;
  font-size:${Math.round(g.u)}px !important;
}
${themeSel} .chrome-header-stack::before,
${themeSel} .chrome-header-stack::after {
  display:none !important;
}
${themeSel} .ios-status {
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  height:${statusH}px !important;
  min-height:${statusH}px !important;
  padding:0 ${navPadX}px !important;
  box-sizing:border-box !important;
  background:transparent !important;
  font-size:${statusFont}px !important;
  font-weight:600 !important;
  color:#fff !important;
}
${themeSel} .ios-time {
  display:block !important;
  color:#fff !important;
  font-size:${statusFont}px !important;
  font-weight:700 !important;
  line-height:1 !important;
  margin:0 0 0 ${Math.round(0.55 * g.u)}px !important;
  transform:translateY(${Math.round(0.18 * g.u)}px) !important;
}
${themeSel} .ios-island-wrap {
  display:none !important;
  visibility:hidden !important;
}
${themeSel} .ios-tray {
  display:flex !important;
  align-items:center !important;
  justify-content:flex-end !important;
  gap:${Math.round(0.25 * g.u)}px !important;
  margin:0 ${Math.round(-0.15 * g.u)}px 0 0 !important;
  transform:translate(${Math.round(0.48 * g.u)}px, ${Math.round(0.34 * g.u)}px) !important;
}
${themeSel} .ios-status-tray-img {
  height:${statusIcon}px !important;
  width:auto !important;
  max-width:none !important;
  opacity:1 !important;
  display:block !important;
}
${themeSel} .ios-nav.telegram-topbar {
  display:grid !important;
  grid-template-columns:auto minmax(0,1fr) ${avatarOuter}px !important;
  column-gap:${chromeGap}px !important;
  align-items:end !important;
  height:${navH}px !important;
  min-height:${navH}px !important;
  margin-top:${statusPillGap}px !important;
  padding:${navPadY}px ${navPadX}px !important;
  box-sizing:border-box !important;
  transform:none !important;
}
${themeSel} .ios-nav-left,
${themeSel} .ios-nav-mid {
  align-items:flex-end !important;
}
${themeSel} .ios-back.back-pill {
  display:inline-flex !important;
  visibility:visible !important;
  align-items:center !important;
  gap:${unreadGap}px !important;
  height:${pillVisualH}px !important;
  min-height:${pillVisualH}px !important;
  min-width:${Math.round(1.8 * g.u)}px !important;
  width:auto !important;
  max-width:none !important;
  padding:0 ${Math.round(0.55 * g.u)}px 0 ${Math.round(0.45 * g.u)}px !important;
  border-radius:999px !important;
  border:${outlineW}px solid #272320 !important;
  box-shadow:none !important;
  background-color:#1b1b1b !important;
  background-image:url("__IOS_BACK_PILL__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  overflow:hidden !important;
  box-sizing:border-box !important;
  transform:translateX(${Math.round(-0.4 * g.u)}px) !important;
}
${themeSel} .ios-back.back-pill .ios-chevron {
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  color:#fff !important;
  /* чуть выше белой подложки */
  width:${chevronSize}px !important;
  height:${chevronSize}px !important;
  font-size:${chevronSize}px !important;
  line-height:0 !important;
  transform:none !important;
  margin:0 !important;
}
${themeSel} .ios-back.back-pill .ios-chevron svg {
  display:block !important;
  width:100% !important;
  height:100% !important;
}
${themeSel} .ios-back.back-pill .ios-unread-pill {
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  min-width:${unreadMinW}px !important;
  width:auto !important;
  height:${unreadH}px !important;
  max-height:${unreadH}px !important;
  padding:0 ${unreadPadX}px !important;
  border-radius:999px !important;
  background-color:#fff !important;
  background-image:url("__IOS_UNREAD_PILL__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  color:#0a0a0a !important;
  font-size:${Math.max(8, Math.round(unreadH * 0.62))}px !important;
  font-weight:500 !important;
  /* ближе к стрелке; −1px по Y — верх на месте при высоте −2 */
  margin:0 !important;
  transform:translateY(-1px) !important;
}
${themeSel} .ios-nav-mid {
  display:flex !important;
  justify-content:center !important;
  align-items:center !important;
  min-width:0 !important;
}
${themeSel} .ios-title-pill.user-pill {
  display:flex !important;
  visibility:visible !important;
  align-items:center !important;
  justify-content:center !important;
  width:fit-content !important;
  max-width:100% !important;
  height:${pillVisualH}px !important;
  min-height:${pillVisualH}px !important;
  padding:0 var(--ios-title-pill-hpad, ${Math.round(0.55 * g.u)}px) !important;
  border-radius:999px !important;
  border:${outlineW}px solid #272320 !important;
  box-shadow:none !important;
  background-color:#1b1b1b !important;
  background-image:url("__IOS_TITLE_PILL__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  overflow:hidden !important;
  box-sizing:border-box !important;
}
${themeSel} .ios-nav-title {
  font-size:${titleFont}px !important;
  font-weight:500 !important;
  line-height:1.15 !important;
  color:#fff !important;
  transform:translateY(1px) !important;
}
${themeSel} .ios-nav-sub {
  font-size:${titleStatusFont}px !important;
  line-height:1.2 !important;
  margin-top:${Math.max(1, Math.round(0.05 * g.u))}px !important;
  transform:translateY(-2px) !important;
}
${themeSel} .ios-nav-right {
  width:${avatarOuter}px !important;
  height:${avatarOuter}px !important;
  padding:${avatarGap}px !important;
  border:${avatarOutlineW}px solid #9a9a9a !important;
  background:transparent !important;
  transform:translateX(${avatarShiftX}px) !important;
  box-sizing:border-box !important;
  border-radius:50% !important;
  overflow:hidden !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  align-self:end !important;
}
${themeSel} .ios-nav-right .ios-nav-avatar,
${themeSel} .ios-nav-right .ios-nav-avatar.placeholder {
  width:100% !important;
  height:100% !important;
  border-radius:50% !important;
  font-size:${Math.round(avatar * 0.42)}px !important;
}
${themeSel} .ios-composer-row.message-input-bar,
${themeSel} .ios-composer-row {
  display:block !important;
  visibility:visible !important;
  position:absolute !important;
  left:${chromeSide}px !important;
  right:${chromeSide}px !important;
  bottom:${composerBottom + homeH}px !important;
  height:${composerH}px !important;
  padding:0 !important;
  border:none !important;
  background:transparent !important;
  z-index:5 !important;
}
${themeSel} .ios-composer {
  display:grid !important;
  grid-template-columns:${composerH}px minmax(0,1fr) ${composerH}px !important;
  column-gap:${chromeGap}px !important;
  align-items:center !important;
  height:100% !important;
}
${themeSel} .ios-attach.circle-button {
  width:${composerH}px !important;
  height:${composerH}px !important;
  border-radius:50% !important;
  border:none !important;
  background-color:#1b1b1b !important;
  background-image:url("__IOS_ATTACH_CIRCLE__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  display:grid !important;
  place-items:center !important;
  overflow:hidden !important;
}
${themeSel} .ios-attach .composer-tool-icon {
  width:${Math.round(composerH * 0.42)}px !important;
  height:${Math.round(composerH * 0.42)}px !important;
}
${themeSel} .ios-input-fake.message-input {
  height:${composerH}px !important;
  min-height:${composerH}px !important;
  padding:0 ${Math.round(composerH * 0.32)}px 0 ${Math.round(composerH * 0.36)}px !important;
  border-radius:999px !important;
  border:none !important;
  background-color:#1b1b1b !important;
  background-image:url("__IOS_INPUT_PILL__") !important;
  background-size:100% 100% !important;
  background-repeat:no-repeat !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
}
${themeSel} .ios-input-placeholder {
  font-size:${Math.round(composerH * 0.36)}px !important;
  color:rgba(255,255,255,0.42) !important;
}
${themeSel} .ios-input-icons .composer-tool-icon {
  width:${Math.round(composerH * 0.42)}px !important;
  height:${Math.round(composerH * 0.42)}px !important;
}
${themeSel} .ios-mic.circle-button {
  width:${composerH}px !important;
  height:${composerH}px !important;
  border-radius:50% !important;
  border:none !important;
  background:transparent !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  padding:0 !important;
  display:grid !important;
  place-items:center !important;
  overflow:hidden !important;
}
${themeSel} .ios-mic .composer-tool-icon {
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
}
${themeSel} .ios-home-indicator.home-indicator {
  display:flex !important;
  position:absolute !important;
  left:0 !important;
  right:0 !important;
  bottom:0 !important;
  height:${homeH + composerBottom}px !important;
  background:transparent !important;
  padding:0 !important;
  align-items:flex-end !important;
  justify-content:center !important;
  z-index:6 !important;
}
${themeSel} .ios-home-indicator.home-indicator::after {
  width:${Math.round(nativeW * 0.3)}px !important;
  height:${Math.max(3, Math.round(4 * s))}px !important;
  margin-bottom:${Math.round(composerBottom * 0.35)}px !important;
  background:rgba(255,255,255,0.9) !important;
}
${themeSel} .chat-wrap,
${themeSel} #chat.chat-wrap {
  inset: unset !important;
  top: 0 !important;
  right: 0 !important;
  bottom: ${chatBottomPx}px !important;
  left: 0 !important;
  height: auto !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  padding: 0 ${Math.round(10 * s)}px ${Math.round(8 * s)}px !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  min-height: 0 !important;
  clip-path: none !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
  background: transparent !important;
  background-image: none !important;
}
${themeSel} .chat-wrap > :first-child {
  margin-top: auto !important;
}
${themeSel} #chat .row.in .bubble:not(.message--media) {
  background: rgba(18, 0, 54, 0.82) !important;
}
${themeSel} #chat .row.out .bubble:not(.message--media) {
  background: rgba(11, 0, 113, 0.82) !important;
}
${themeSel} #chat .row {
  margin-bottom: ${Math.round(6 * s)}px !important;
  gap: ${Math.round(8 * s)}px !important;
}
${themeSel} #chat .bubble-col {
  max-width: 78% !important;
  gap: ${Math.round(4 * s)}px !important;
}
${themeSel} #chat .date-sep {
  margin: ${Math.round(14 * s)}px 0 !important;
}
${themeSel} #chat .date-sep span {
  font-size: ${fsDate}px !important;
  padding: ${Math.round(5 * s)}px ${Math.round(14 * s)}px !important;
  border-radius: ${Math.round(14 * s)}px !important;
}
${themeSel} #chat .bubble:not(.message--media) {
  font-family: 'SF Pro Text', 'SF UI Text', sans-serif !important;
  font-weight: 300 !important;
  font-synthesis: none !important;
  font-size: ${fsBubble}px !important;
  line-height: 1.38 !important;
  padding: ${padY}px ${padX}px ${padY2}px !important;
  border-radius: ${rad}px !important;
  overflow: visible !important;
}
${themeSel} #chat .row.in .bubble:not(.message--media) {
  padding-right: ${Math.round(10 * s)}px !important;
}
${themeSel} #chat .row.out .bubble:not(.message--media) {
  padding-right: ${Math.round(12 * s)}px !important;
}
${themeSel} #chat .bubble:not(.message--media) .bubble-text {
  font-family: inherit !important;
  font-weight: 300 !important;
  font-size: inherit !important;
  line-height: inherit !important;
  overflow: visible !important;
}
${themeSel} #chat .bubble .meta {
  font-size: ${fsMeta}px !important;
}
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media) {
  border-radius:${rad}px !important;
  column-gap:${Math.round(7 * s)}px !important;
  overflow:hidden !important;
  position:relative !important;
  /* однострочный: меньше пустоты под meta, положение времени к тексту то же */
  padding-bottom:${Math.max(3, Math.round(4 * s))}px !important;
}
${themeSel} #chat .bubble.bubble--ios-b:not(.message--media) {
  border-radius: ${rad}px !important;
  column-gap: ${Math.round(7 * s)}px !important;
  overflow: hidden !important;
  position: relative !important;
}
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media) {
  border-radius: ${rad}px !important;
  column-gap: ${Math.round(7 * s)}px !important;
  overflow: hidden !important;
  position: relative !important;
}
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media) {
  border-radius: ${rad}px !important;
  column-gap: ${Math.round(7 * s)}px !important;
  overflow: hidden !important;
  position: relative !important;
}
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) {
  border-radius: ${rad}px !important;
  column-gap: ${Math.round(7 * s)}px !important;
  overflow: hidden !important;
  position: relative !important;
}
/* meta по сценариям a–e — каждый независим */
${themeSel} #chat .bubble.bubble--ios-a:not(.message--media) .meta {
  position: static !important;
  float: none !important;
  clear: none !important;
  right: auto !important;
  bottom: auto !important;
  top: auto !important;
  margin: 0 0 0 ${Math.max(2, Math.round(2 * s))}px !important;
  transform: none !important;
  display: inline-flex !important;
  align-items: center !important;
  align-self: end !important;
  gap: ${Math.max(2, Math.round(2 * s))}px !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) {
  padding-right: ${Math.round(8 * s)}px !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) .bubble-text {
  padding-right: 0 !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-a:not(.message--media) .meta {
  margin: 0 0 0 ${Math.max(2, Math.round(2 * s))}px !important;
  align-items: center !important;
  align-self: end !important;
  transform: none !important;
}
${themeSel} #chat .bubble.bubble--ios-b:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(3 * s)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
}
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(6 * s)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  z-index: 2 !important;
}
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(6 * s)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  z-index: 2 !important;
}
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(6 * s)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  z-index: 2 !important;
}
${themeSel} #chat .row.out .bubble.bubble--ios-b:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.bubble--ios-c:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.bubble--ios-d:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.bubble--ios-e:not(.message--media) .meta,
${themeSel} #chat .row.out .bubble.meta-corner-tuck:not(.message--media) .meta {
  right: ${Math.round(12 * s)}px !important;
}
${themeSel} #chat .row.in .bubble.bubble--ios-b:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-c:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-d:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.bubble--ios-e:not(.message--media) .meta,
${themeSel} #chat .row.in .bubble.meta-corner-tuck:not(.message--media) .meta {
  right: ${Math.round(8 * s)}px !important;
}
${themeSel} #chat .bubble.bubble--ios-c:not(.message--media) .bubble-text {
  padding-bottom: 0 !important;
}
${themeSel} #chat .bubble.bubble--ios-d:not(.message--media) .bubble-text {
  padding-bottom: 0 !important;
}
${themeSel} #chat .bubble.bubble--ios-e:not(.message--media) .bubble-text {
  padding-bottom: 0 !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) {
  position: relative !important;
  display: block !important;
  grid-template-columns: none !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) .bubble-text {
  padding-bottom: ${Math.round(8 * s)}px !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}
${themeSel} #chat .bubble.meta-corner-tuck:not(.message--media) .meta {
  position: absolute !important;
  float: none !important;
  clear: none !important;
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(5 * s)}px !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  display: inline-flex !important;
  z-index: 2 !important;
}
${themeSel} #chat .bubble:not(.message--media) .meta-slot,
${themeSel} #chat .bubble:not(.message--media) .meta-spacer {
  display: none !important;
}
${themeSel} #chat .row.out .bubble .checks {
  width: auto !important;
  height: 1em !important;
  height: 1cap !important;
  display: inline-flex !important;
  align-items: center !important;
  margin-left: 0 !important;
}
${themeSel} #chat .row.out .bubble .checks-img {
  height: 1em !important;
  height: 1cap !important;
  width: auto !important;
  object-fit: contain !important;
  filter: none !important;
}
${themeSel} #chat .bubble.message--media {
  width: fit-content !important;
  max-width: ${mediaW}px !important;
  padding: ${mediaPad}px !important;
  border-radius: ${mediaRad}px !important;
  border-bottom-left-radius: ${mediaRad}px !important;
  border-bottom-right-radius: ${mediaRad}px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
${themeSel} #chat .message__image-wrap {
  width: fit-content !important;
  max-width: 100% !important;
  border-radius: ${mediaImgRad}px !important;
  overflow: hidden !important;
  line-height: 0 !important;
  background: transparent !important;
}
${themeSel} #chat .message__image {
  display: block !important;
  width: auto !important;
  max-width: 100% !important;
  height: auto !important;
  max-height: ${mediaMaxH}px !important;
  object-fit: contain !important;
  object-position: center !important;
}
${themeSel} #chat .message__image-wrap--overlay .meta {
  right: ${Math.round(5 * s)}px !important;
  bottom: ${Math.round(4 * s)}px !important;
  font-size: ${mediaMetaFs}px !important;
  gap: ${Math.round(4 * s)}px !important;
  padding: ${Math.round(3 * s)}px ${Math.round(7 * s)}px !important;
}
${themeSel} #chat .message__image-placeholder {
  min-height: ${Math.round(79 * s)}px !important;
  font-size: ${mediaMetaFs}px !important;
  padding: ${Math.round(8 * s)}px !important;
}
${themeSel} #chat .message__caption,
${themeSel} #chat .message__action {
  font-size: ${mediaCaptionFs}px !important;
  font-weight: 300 !important;
  margin-top: ${Math.round(6 * s)}px !important;
}
${themeSel} #chat .message__action {
  height: ${Math.round(22 * s)}px !important;
  border-radius: ${Math.round(6 * s)}px !important;
}
${themeSel} #chat .bubble.message--media > .meta {
  margin-top: ${Math.round(5 * s)}px !important;
  font-size: ${mediaMetaFs}px !important;
}
${compositeLightTextCss(themeSel)}
</style>`;
}
