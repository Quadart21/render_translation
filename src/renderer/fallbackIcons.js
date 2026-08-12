/** Fallback data-URL icons when PNG assets are missing. */
/** Запасные SVG (не 1×1 px): если PNG из assets недоступны, не будет «квадратиков». */
export const FALLBACK_ICON_CLIP =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>'
  );
export const FALLBACK_ICON_MIC =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm7-3a7 7 0 01-14 0H3a9 9 0 0018 0h-2z"/><path d="M12 19v3"/></svg>'
  );
export const FALLBACK_ICON_SIGNAL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 11" fill="white"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="5" y="5" width="3" height="6" rx="0.5"/><rect x="10" y="3" width="3" height="8" rx="0.5"/><rect x="15" y="0" width="3" height="11" rx="0.5"/></svg>'
  );
export const FALLBACK_ICON_WIFI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 11" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round"><path d="M7 9.5h.01"/><path d="M3.5 7a4 4 0 017 0"/><path d="M1.5 5a7 7 0 0111 0"/><path d="M0 3a9 9 0 0114 0"/></svg>'
  );
export const FALLBACK_ICON_SMILEY =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.3" fill="white" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="white" stroke="none"/><path d="M8.5 14.5c1.3 1.6 3.7 2 5.5 1"/></svg>'
  );
/** Звонок в шапке Android — контур трубки, белый силуэт после Sharp как у остальных иконок */
export const FALLBACK_ICON_PHONE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>'
  );
export const FALLBACK_ICON_BACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l-8 8 8 8"/><path d="M20 12H4"/></svg>'
  );
/** Плашка TELEGRAM в строке статуса (полноцветный PNG). */
export const FALLBACK_TELEGRAM_PLAQUE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="32" viewBox="0 0 140 32"><rect width="140" height="32" rx="16" fill="#3390ec"/></svg>'
  );
/** Две галочки «прочитано» у исходящих (если нет PNG — упрощённый SVG). */
export const FALLBACK_MESSAGE_CHECKS =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 26 12"><path fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" d="M1 6l3.5 3.5L12 2m4 4l3.5 3.5L25 2"/></svg>'
  );
/** iOS: справа в статус-баре одним PNG (сигнал + Wi‑Fi + батарея). */
export const FALLBACK_IOS_STATUS_TRAY =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="18" viewBox="0 0 78 18"><rect width="78" height="18" rx="4" fill="rgba(255,255,255,0.14)"/></svg>'
  );
