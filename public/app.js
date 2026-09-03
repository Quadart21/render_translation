const panelLogin = document.getElementById('panel-login');
const panelApp = document.getElementById('panel-app');
const panelLoading = document.getElementById('panel-loading');
const loginError = document.getElementById('login-error');
const renderError = document.getElementById('render-error');
const tgWidgetWrap = document.getElementById('tg-widget-wrap');
const authToolbar = document.getElementById('auth-toolbar');
const userLabel = document.getElementById('user-label');
const btnLogout = document.getElementById('btn-logout');
const btnRender = document.getElementById('btn-render');
const btnRenderRandom = document.getElementById('btn-render-random');
const btnRenderRandomMultipage = document.getElementById('btn-render-random-multipage');
const btnAddMessage = document.getElementById('btn-add-message');
const btnAddImage = document.getElementById('btn-add-image');
const btnAddDate = document.getElementById('btn-add-date');
const btnClearRows = document.getElementById('btn-clear-rows');
const platformSel = document.getElementById('platform');
const previewWrap = document.getElementById('preview-wrap');
const previewImg = document.getElementById('preview-img');
const downloadLink = document.getElementById('download-link');
const previewPages = document.getElementById('preview-pages');
const messageRows = document.getElementById('message-rows');
const feedStats = document.getElementById('feed-stats');
const chkPinned = document.getElementById('chk-pinned');
const pinnedText = document.getElementById('pinned-text');
const chkRandomAvatar = document.getElementById('chk-random-avatar');
const avatarOpponentFile = document.getElementById('avatar-opponent-file');
const btnAvatarOpponentClear = document.getElementById('btn-avatar-opponent-clear');
const avatarOpponentStatus = document.getElementById('avatar-opponent-status');
const accessManager = document.getElementById('access-manager');
const accessSummary = document.getElementById('access-summary');
const accessIdInput = document.getElementById('access-id-input');
const accessMakeAdmin = document.getElementById('access-make-admin');
const btnAccessGrant = document.getElementById('btn-access-grant');
const accessError = document.getElementById('access-error');
const accessList = document.getElementById('access-list');
const btnSectionChat = document.getElementById('btn-section-chat');
const btnSectionDocs = document.getElementById('btn-section-docs');
const sectionChatBuilder = document.getElementById('section-chat-builder');
const sectionDocsBuilder = document.getElementById('section-docs-builder');
const docTemplate = document.getElementById('doc-template');
const docDate = document.getElementById('doc-date');
const docInspection = document.getElementById('doc-inspection');
const docTaxpayerName = document.getElementById('doc-taxpayer-name');
const docInn = document.getElementById('doc-inn');
const docCertificateNumber = document.getElementById('doc-certificate-number');
const docCertificateRandom = document.getElementById('doc-certificate-random');
const docYear = document.getElementById('doc-year');
const docIdSeriesNumber = document.getElementById('doc-id-series-number');
const docAmount = document.getElementById('doc-amount');
const docTaxRate = document.getElementById('doc-tax-rate');
const docValidFrom = document.getElementById('doc-valid-from');
const docValidTo = document.getElementById('doc-valid-to');
const btnDocRender = document.getElementById('btn-doc-render');
const btnDocReset = document.getElementById('btn-doc-reset');
const docRenderError = document.getElementById('doc-render-error');
const docPreviewWrap = document.getElementById('doc-preview-wrap');
const docPreviewFrame = document.getElementById('doc-preview-frame');
const docDownloadLink = document.getElementById('doc-download-link');

let avatarOpponentDataUrl = null;
let canManageAccess = false;
let currentUserId = null;

/** data URL выбранного файла по строке «Картинка» */
const imageRowData = new WeakMap();

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function setActiveBuilderSection(section) {
  const isDocs = section === 'docs';
  sectionChatBuilder.classList.toggle('hidden', isDocs);
  sectionDocsBuilder.classList.toggle('hidden', !isDocs);
  btnSectionChat.classList.toggle('is-active', !isDocs);
  btnSectionDocs.classList.toggle('is-active', isDocs);
  btnSectionChat.setAttribute('aria-selected', String(!isDocs));
  btnSectionDocs.setAttribute('aria-selected', String(isDocs));
}

function clearDocError() {
  docRenderError.textContent = '';
  hide(docRenderError);
}

function showDocError(msg) {
  docRenderError.textContent = msg;
  show(docRenderError);
}

function bindAvatarInput(inputEl, clearBtnEl, statusEl, setValue) {
  inputEl.addEventListener('change', () => {
    const f = inputEl.files && inputEl.files[0];
    if (!f) {
      setValue(null);
      statusEl.textContent = '';
      return;
    }
    if (!f.type.startsWith('image/')) {
      inputEl.value = '';
      setValue(null);
      statusEl.textContent = 'Нужен файл изображения.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue(reader.result);
      // Пользователь явно задал аватарку, поэтому случайные аватары выключаем.
      chkRandomAvatar.checked = false;
      statusEl.textContent = `Загружено: ${f.name} (${Math.round(f.size / 1024)} KB)`;
    };
    reader.onerror = () => {
      setValue(null);
      statusEl.textContent = 'Не удалось прочитать файл.';
    };
    reader.readAsDataURL(f);
  });

  clearBtnEl.addEventListener('click', () => {
    inputEl.value = '';
    setValue(null);
    statusEl.textContent = '';
  });
}

async function renderPdfFromResponse(r, opts = {}) {
  if (!r.ok) {
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `Ошибка ${r.status}`);
    }
    throw new Error(`Ошибка ${r.status}`);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const frame = opts.frame || docPreviewFrame;
  const link = opts.link || docDownloadLink;
  const wrap = opts.wrap || docPreviewWrap;
  const filename = opts.filename || 'document.pdf';
  frame.src = url;
  link.href = url;
  link.download = filename;
  show(wrap);
}

function buildDocumentPayload() {
  return {
    template: docTemplate.value,
    date: docDate.value.trim(),
    inspection: docInspection.value.trim(),
    taxpayerName: docTaxpayerName.value.trim(),
    inn: docInn.value.trim(),
    certificateNumber: docCertificateNumber.value.trim(),
    randomizeCertificateNumber: docCertificateRandom.checked,
    year: docYear.value.trim(),
    idSeriesNumber: docIdSeriesNumber.value.trim(),
    amount: docAmount.value.trim(),
    taxRate: docTaxRate.value.trim(),
    validFrom: docValidFrom.value.trim(),
    validTo: docValidTo.value.trim(),
  };
}

function resetDocumentForm() {
  docTemplate.value = 'npd-certificate';
  docDate.value = new Date().toLocaleDateString('ru-RU');
  docInspection.value = 'Инспекция Федеральной налоговой службы по г. Санкт-Петербургу';
  docTaxpayerName.value = '';
  docInn.value = '';
  docCertificateNumber.value = '';
  docCertificateRandom.checked = true;
  docYear.value = String(new Date().getFullYear() - 1);
  docIdSeriesNumber.value = '';
  docAmount.value = '';
  docTaxRate.value = '6';
  docValidFrom.value = '';
  docValidTo.value = '';
  docPreviewWrap.classList.add('hidden');
  docPreviewFrame.removeAttribute('src');
  clearDocError();
}

async function fetchMe() {
  const r = await fetch('/api/me', { credentials: 'same-origin' });
  if (!r.ok) return null;
  return r.json();
}

function clearAccessError() {
  accessError.textContent = '';
  hide(accessError);
}

function showAccessError(msg) {
  accessError.textContent = msg;
  show(accessError);
}

function renderAccessList(access) {
  const allowed = Array.isArray(access?.allowedIds) ? access.allowedIds : [];
  const admins = new Set(Array.isArray(access?.adminIds) ? access.adminIds : []);
  accessSummary.textContent = `Доступов: ${allowed.length} · Админов: ${admins.size}`;
  if (!allowed.length) {
    accessList.innerHTML = '<p class="hint hint-tight">Список пуст. Добавьте первый Telegram ID.</p>';
    return;
  }
  accessList.innerHTML = allowed
    .map((id) => {
      const isAdmin = admins.has(id);
      const self = String(currentUserId || '') === String(id);
      const disableRevoke = self && admins.size <= 1;
      return `
        <div class="access-row">
          <div class="access-row-meta">
            <code>${id}</code>
            ${isAdmin ? '<span class="access-role">admin</span>' : '<span class="access-role access-role-user">user</span>'}
            ${self ? '<span class="access-self">вы</span>' : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-access-revoke" data-id="${id}" ${disableRevoke ? 'disabled' : ''}>Удалить</button>
        </div>
      `;
    })
    .join('');
}

async function refreshAccessManager() {
  if (!canManageAccess) return;
  clearAccessError();
  const r = await fetch('/api/access', { credentials: 'same-origin' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Ошибка доступа: ${r.status}`);
  }
  renderAccessList(data.access || {});
}

async function grantAccessFromUi() {
  clearAccessError();
  const id = accessIdInput.value.trim();
  if (!/^\d{5,20}$/.test(id)) {
    showAccessError('Введите Telegram ID: только цифры (5-20 символов).');
    return;
  }
  const r = await fetch('/api/access/grant', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, admin: accessMakeAdmin.checked }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    showAccessError(data.error || `Ошибка ${r.status}`);
    return;
  }
  accessIdInput.value = '';
  accessMakeAdmin.checked = false;
  renderAccessList(data.access || {});
}

async function revokeAccessFromUi(id) {
  clearAccessError();
  const r = await fetch('/api/access/revoke', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    showAccessError(data.error || `Ошибка ${r.status}`);
    return;
  }
  renderAccessList(data.access || {});
}

function mountTelegramWidget(botUsername) {
  tgWidgetWrap.innerHTML = '';
  window.onTelegramAuth = async (user) => {
    loginError.textContent = '';
    hide(loginError);
    try {
      const r = await fetch('/api/auth/telegram', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        loginError.textContent = data.error || 'Ошибка входа';
        show(loginError);
        return;
      }
      initUi();
    } catch (e) {
      loginError.textContent = String(e.message || e);
      show(loginError);
    }
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  script.setAttribute('data-request-access', 'write');
  tgWidgetWrap.appendChild(script);
}

async function initUi() {
  const cfg = await fetch('/api/config').then((r) => r.json());
  const avatarHint = document.getElementById('avatar-pool-hint');
  if (avatarHint) {
    const n = Number(cfg.avatarPoolSize) || 0;
    if (n > 0) {
      avatarHint.textContent = `Доступно аватарок: ${n}`;
      avatarHint.classList.remove('error');
    } else {
      avatarHint.textContent =
        'Папка avatar/ пуста — галочка случайных аватарок не сработает, пока не положите туда JPG/PNG.';
      avatarHint.classList.add('error');
    }
  }

  if (!cfg.authEnabled) {
    hide(panelLoading);
    hide(panelLogin);
    show(panelApp);
    hide(authToolbar);
    hide(accessManager);
    return;
  }

  const me = await fetchMe();
  hide(panelLoading);

  if (!me?.user) {
    hide(panelApp);
    show(panelLogin);
    if (!cfg.telegramBotUsername) {
      loginError.textContent =
        'Задан AUTH_ENABLED, но не задан TELEGRAM_BOT_USERNAME — виджет не загрузится.';
      show(loginError);
      return;
    }
    mountTelegramWidget(cfg.telegramBotUsername);
    return;
  }

  hide(panelLogin);
  show(panelApp);
  show(authToolbar);
  currentUserId = me.user.id;
  canManageAccess = Boolean(me?.access?.canManageAccess);
  const uname = me.user.username ? `@${me.user.username}` : '';
  const role = canManageAccess ? 'admin' : 'user';
  userLabel.textContent = [me.user.first_name, uname, `(id ${me.user.id})`, `· ${role}`].filter(Boolean).join(' ');
  if (canManageAccess) {
    show(accessManager);
    await refreshAccessManager();
  } else {
    hide(accessManager);
  }
}

function syncIosFields() {
  const isIos = platformSel.value === 'ios';
  document.querySelectorAll('.ios-only-row').forEach((el) => {
    el.classList.toggle('hidden', !isIos);
  });
}

function rowTypeLabel(kind) {
  if (kind === 'image') return 'Картинка';
  if (kind === 'date') return 'Дата';
  return 'Сообщение';
}

function refreshRowsUi() {
  const rows = [...messageRows.querySelectorAll('.msg-row')];
  rows.forEach((row, i) => {
    const idx = row.querySelector('.msg-row-index');
    const kind = row.querySelector('.row-kind')?.value || 'message';
    const kindEl = row.querySelector('.msg-row-kind-label');
    const removeBtn = row.querySelector('.btn-remove-row');
    if (idx) idx.textContent = `#${i + 1}`;
    if (kindEl) kindEl.textContent = rowTypeLabel(kind);
    if (removeBtn) removeBtn.disabled = rows.length <= 1;
  });
}

function updateFeedStats() {
  if (!feedStats) return;
  let total = 0;
  let text = 0;
  let image = 0;
  let date = 0;
  messageRows.querySelectorAll('.msg-row').forEach((row) => {
    total += 1;
    const kind = row.querySelector('.row-kind')?.value;
    if (kind === 'image') image += 1;
    else if (kind === 'date') date += 1;
    else text += 1;
  });
  const platform = platformSel.value === 'ios' ? 'iPhone' : 'Android';
  feedStats.textContent = `${platform} · строк: ${total} · текст: ${text} · фото: ${image} · даты: ${date}`;
}

function createMessageRow(preset) {
  const kind = preset?.kind || 'message';
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-row-top">
      <div class="msg-row-meta">
        <span class="msg-row-index">#1</span>
        <span class="msg-row-kind-label">Сообщение</span>
      </div>
      <label class="field field-inline">
        <span class="field-label">Тип</span>
        <select class="select select-sm row-kind">
          <option value="message">Сообщение</option>
          <option value="image">Картинка</option>
          <option value="date">Дата в ленте</option>
        </select>
      </label>
      <button type="button" class="btn btn-ghost btn-sm btn-remove-row">Удалить</button>
    </div>
    <div class="msg-block msg-block-message">
      <div class="field-row">
        <label class="field field-inline">
          <span class="field-label">Кто</span>
          <select class="select select-sm msg-from">
            <option value="bank">Опонент</option>
            <option value="me">Я</option>
          </select>
        </label>
        <label class="field field-inline field-time">
          <span class="field-label">Время</span>
          <input type="text" class="input input-sm msg-time" placeholder="14:30" maxlength="8" />
        </label>
      </div>
      <label class="field field-full">
        <span class="field-label">Текст</span>
        <textarea class="textarea textarea-sm msg-text" rows="2" placeholder="Текст сообщения"></textarea>
      </label>
    </div>
    <div class="msg-block msg-block-image hidden">
      <div class="field-row">
        <label class="field field-inline">
          <span class="field-label">Кто</span>
          <select class="select select-sm msg-from-img">
            <option value="bank">Опонент</option>
            <option value="me">Я</option>
          </select>
        </label>
        <label class="field field-inline field-time">
          <span class="field-label">Время</span>
          <input type="text" class="input input-sm msg-time-img" placeholder="14:30" maxlength="8" />
        </label>
      </div>
      <div class="field field-full">
        <span class="field-label">Файл изображения</span>
        <div class="msg-img-file-row">
          <input type="file" class="msg-img-file" accept="image/*" />
          <button type="button" class="btn btn-ghost btn-sm btn-clear-img">Сбросить</button>
        </div>
        <div class="msg-img-preview-wrap hidden">
          <img class="msg-img-preview" alt="Предпросмотр" />
        </div>
      </div>
    </div>
    <div class="msg-block msg-block-date hidden">
      <label class="field field-full">
        <span class="field-label">Подпись даты</span>
        <input type="text" class="input date-label" placeholder="9 мая" />
      </label>
    </div>
  `;

  const kindSel = row.querySelector('.row-kind');
  kindSel.value = kind;

  if (preset?.from) {
    row.querySelector('.msg-from').value = preset.from;
    row.querySelector('.msg-from-img').value = preset.from;
  }
  if (preset?.time) {
    row.querySelector('.msg-time').value = preset.time;
    row.querySelector('.msg-time-img').value = preset.time;
  }
  if (preset?.text) row.querySelector('.msg-text').value = preset.text;
  if (preset?.dateLabel) row.querySelector('.date-label').value = preset.dateLabel;

  imageRowData.set(row, { dataUrl: null });

  const fileIn = row.querySelector('.msg-img-file');
  const preview = row.querySelector('.msg-img-preview');
  const previewWrap = row.querySelector('.msg-img-preview-wrap');

  fileIn.addEventListener('change', () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) {
      imageRowData.set(row, { dataUrl: null });
      preview.removeAttribute('src');
      previewWrap.classList.add('hidden');
      return;
    }
    if (!f.type.startsWith('image/')) {
      fileIn.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      imageRowData.set(row, { dataUrl: reader.result });
      preview.src = reader.result;
      previewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(f);
  });

  row.querySelector('.btn-clear-img').addEventListener('click', () => {
    fileIn.value = '';
    imageRowData.set(row, { dataUrl: null });
    preview.removeAttribute('src');
    previewWrap.classList.add('hidden');
  });

  function applyKind() {
    const k = kindSel.value;
    const isDate = k === 'date';
    const isImage = k === 'image';
    row.querySelector('.msg-block-message').classList.toggle('hidden', isDate || isImage);
    row.querySelector('.msg-block-image').classList.toggle('hidden', !isImage);
    row.querySelector('.msg-block-date').classList.toggle('hidden', !isDate);
  }

  kindSel.addEventListener('change', () => {
    const k = kindSel.value;
    if (k === 'image') {
      row.querySelector('.msg-from-img').value = row.querySelector('.msg-from').value;
      row.querySelector('.msg-time-img').value = row.querySelector('.msg-time').value;
    } else if (k === 'message') {
      row.querySelector('.msg-from').value = row.querySelector('.msg-from-img').value;
      row.querySelector('.msg-time').value = row.querySelector('.msg-time-img').value;
    }
    applyKind();
    refreshRowsUi();
    updateFeedStats();
  });
  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    if (messageRows.querySelectorAll('.msg-row').length <= 1) return;
    row.remove();
    refreshRowsUi();
    updateFeedStats();
  });

  applyKind();
  refreshRowsUi();
  updateFeedStats();
  return row;
}

function collectItemsFromRows() {
  const items = [];
  messageRows.querySelectorAll('.msg-row').forEach((row) => {
    const kind = row.querySelector('.row-kind').value;
    if (kind === 'date') {
      const label = row.querySelector('.date-label').value.trim();
      if (label) items.push({ type: 'date', label });
      return;
    }
    if (kind === 'image') {
      const from = row.querySelector('.msg-from-img').value;
      const time = row.querySelector('.msg-time-img').value.trim() || '12:00';
      const stored = imageRowData.get(row);
      const src = stored && stored.dataUrl ? stored.dataUrl : null;
      const item = { type: 'image', from, time, src };
      items.push(item);
      return;
    }
    const from = row.querySelector('.msg-from').value;
    const time = row.querySelector('.msg-time').value.trim() || '12:00';
    const text = row.querySelector('.msg-text').value.trim();
    if (text) items.push({ type: 'text', from, time, text });
  });
  return items;
}

function buildScenePayload() {
  const platform = platformSel.value === 'ios' ? 'ios' : 'android';
  const statusTime = document.getElementById('status-time').value.trim() || '14:32';
  const nameOpponent = document.getElementById('name-opponent').value.trim() || 'Опонент';
  const nameMe = document.getElementById('name-me').value.trim() || 'Я';

  const items = collectItemsFromRows();
  const hasContent = items.some((i) => i.type === 'text' || i.type === 'image');
  if (!hasContent) {
    throw new Error('Добавьте хотя бы одно сообщение или картинку в ленте.');
  }

  const scene = {
    platform,
    statusBar: {
      time: statusTime,
      date: new Date().toISOString().slice(0, 10),
    },
    meta: {},
    participants: [
      { id: 'bank', name: nameOpponent, side: 'left', avatar: avatarOpponentDataUrl || null },
      { id: 'me', name: nameMe, side: 'right', avatar: null },
    ],
    items,
  };

  /* Подложка 1:1 — без CSS-хрома и без растяжения к чужому эталону */
  /* Подложка 1:1 — Android substrate; iPhone — новые обои (не ios-substrate doodle). */
  scene.compositeScreenshot =
    platform === 'ios' ? 'assets/ios-composite-base.jpg' : 'assets/android-substrate.jpg';

  {
    const sub = document.getElementById('ios-subtitle').value.trim();
    const header = { ...(scene.header || {}) };
    if (sub) header.subtitle = sub;
    const batRaw = document.getElementById('status-battery').value.trim();
    if (batRaw) {
      const batNum = Number(String(batRaw).replace('%', '').trim());
      if (Number.isFinite(batNum)) {
        scene.statusBar.battery = String(Math.max(0, Math.min(100, Math.round(batNum))));
      }
    }
    if (platform === 'ios') {
      const badge = document.getElementById('ios-back-badge').value.trim();
      if (badge) header.backBadge = badge;
    }
    if (Object.keys(header).length) scene.header = header;
  }

  if (chkPinned.checked) {
    const pt = pinnedText.value.trim();
    if (pt) scene.pinned = { text: pt };
  }

  /* На подложке pinned уже не рисуем — убираем, чтобы не мешал оверлею */
  if (scene.compositeScreenshot) {
    delete scene.pinned;
  }

  const payload = { ...scene };
  if (chkRandomAvatar.checked) payload.randomAvatars = true;

  return payload;
}

function initFormDefaults() {
  document.getElementById('status-time').value = '14:32';
  document.getElementById('name-opponent').value = '';
  document.getElementById('name-me').value = '';
  document.getElementById('ios-subtitle').value = '';
  document.getElementById('ios-back-badge').value = '';
  document.getElementById('status-battery').value = '';
  chkPinned.checked = false;
  pinnedText.value = '';
  pinnedText.disabled = true;
  chkRandomAvatar.checked = false;
  avatarOpponentDataUrl = null;
  avatarOpponentFile.value = '';
  avatarOpponentStatus.textContent = '';

  bindAvatarInput(avatarOpponentFile, btnAvatarOpponentClear, avatarOpponentStatus, (v) => {
    avatarOpponentDataUrl = v;
  });

  messageRows.innerHTML = '';
  const seedRows = [
    { from: 'bank', time: '14:28', text: 'Здравствуйте! Чем могу помочь?' },
    { from: 'me', time: '14:29', text: 'Добрый день. Приложите скан чека.' },
    { kind: 'image', from: 'me', time: '14:30' },
    { kind: 'image', from: 'me', time: '14:31' },
  ];
  seedRows.forEach((rowPreset) => messageRows.appendChild(createMessageRow(rowPreset)));

  platformSel.addEventListener('change', () => {
    syncIosFields();
    updateFeedStats();
  });
  chkPinned.addEventListener('change', () => {
    pinnedText.disabled = !chkPinned.checked;
  });

  btnAddMessage.addEventListener('click', () => {
    messageRows.appendChild(createMessageRow({ from: 'bank', time: '', text: '' }));
    refreshRowsUi();
    updateFeedStats();
  });
  btnAddImage.addEventListener('click', () => {
    messageRows.appendChild(createMessageRow({ kind: 'image', from: 'me', time: '' }));
    refreshRowsUi();
    updateFeedStats();
  });
  btnAddDate.addEventListener('click', () => {
    messageRows.appendChild(createMessageRow({ kind: 'date', dateLabel: '' }));
    refreshRowsUi();
    updateFeedStats();
  });
  btnClearRows.addEventListener('click', () => {
    messageRows.innerHTML = '';
    messageRows.appendChild(createMessageRow({ from: 'bank', time: '', text: '' }));
    refreshRowsUi();
    updateFeedStats();
  });
  btnAccessGrant.addEventListener('click', async () => {
    try {
      await grantAccessFromUi();
    } catch (e) {
      showAccessError(String(e.message || e));
    }
  });
  accessIdInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    try {
      await grantAccessFromUi();
    } catch (err) {
      showAccessError(String(err.message || err));
    }
  });
  accessList.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest('.btn-access-revoke');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    try {
      await revokeAccessFromUi(id);
    } catch (err) {
      showAccessError(String(err.message || err));
    }
  });
  btnSectionChat.addEventListener('click', () => setActiveBuilderSection('chat'));
  btnSectionDocs.addEventListener('click', () => setActiveBuilderSection('docs'));
  btnDocReset.addEventListener('click', () => resetDocumentForm());

  syncIosFields();
  refreshRowsUi();
  updateFeedStats();
  resetDocumentForm();
  setActiveBuilderSection('chat');
}

btnLogout.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  previewWrap.classList.add('hidden');
  previewPages.classList.add('hidden');
  previewPages.innerHTML = '';
  window.location.reload();
});

function renderScenePages(pages, opts = {}) {
  const img = opts.img || previewImg;
  const link = opts.link || downloadLink;
  const wrap = opts.wrap || previewWrap;
  const pagesEl = opts.pagesEl || previewPages;
  const list = Array.isArray(pages) ? pages : [];
  if (!list.length) {
    throw new Error('Рендер не вернул изображения.');
  }
  const first = list[0];
  img.src = first.dataUrl;
  link.href = first.dataUrl;
  link.download = first.name || 'chat-1.png';
  if (list.length <= 1) {
    pagesEl.innerHTML = '';
    pagesEl.classList.add('hidden');
    show(wrap);
    return;
  }
  const tail = list.slice(1);
  pagesEl.innerHTML = tail
    .map((p, i) => `
      <article class="preview-page-card">
        <p class="preview-page-title">Скрин ${i + 2}</p>
        <img class="preview-page-img" src="${p.dataUrl}" alt="Скрин ${i + 2}" />
        <a class="link-download" href="${p.dataUrl}" download="${p.name || `chat-${i + 2}.png`}">Скачать ${i + 2}</a>
      </article>
    `)
    .join('');
  pagesEl.classList.remove('hidden');
  show(wrap);
}

async function renderSceneFromResponse(r, opts = {}) {
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const payload = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(payload.error || payload.detail || `Ошибка ${r.status}`);
    }
    const images = Array.isArray(payload.images) ? payload.images : [];
    renderScenePages(images, opts);
    return;
  }
  if (!r.ok) {
    if (ct.includes('application/json')) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `Ошибка ${r.status}`);
    }
    throw new Error(`Ошибка ${r.status}`);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const img = opts.img || previewImg;
  const link = opts.link || downloadLink;
  const wrap = opts.wrap || previewWrap;
  const filename = opts.filename || 'chat.png';
  const pagesEl = opts.pagesEl || previewPages;
  img.src = url;
  link.href = url;
  link.download = filename;
  pagesEl.innerHTML = '';
  pagesEl.classList.add('hidden');
  show(wrap);
}

btnRender.addEventListener('click', async () => {
  renderError.textContent = '';
  hide(renderError);
  btnRender.disabled = true;
  btnRenderRandom.disabled = true;
  if (btnRenderRandomMultipage) btnRenderRandomMultipage.disabled = true;
  try {
    const payload = buildScenePayload();
    const r = await fetch('/api/render/scene', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await renderSceneFromResponse(r);
  } catch (e) {
    renderError.textContent = String(e.message || e);
    show(renderError);
  } finally {
    btnRender.disabled = false;
    btnRenderRandom.disabled = false;
    if (btnRenderRandomMultipage) btnRenderRandomMultipage.disabled = false;
  }
});

async function runRandomRender({ multiPage }) {
  renderError.textContent = '';
  hide(renderError);
  btnRender.disabled = true;
  btnRenderRandom.disabled = true;
  if (btnRenderRandomMultipage) btnRenderRandomMultipage.disabled = true;
  try {
    const platform = platformSel.value === 'ios' ? 'ios' : 'android';
    const r = await fetch('/api/render/random', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, multiPage: Boolean(multiPage) }),
    });
    await renderSceneFromResponse(r);
  } catch (e) {
    renderError.textContent = String(e.message || e);
    show(renderError);
  } finally {
    btnRender.disabled = false;
    btnRenderRandom.disabled = false;
    if (btnRenderRandomMultipage) btnRenderRandomMultipage.disabled = false;
  }
}

btnRenderRandom.addEventListener('click', () => runRandomRender({ multiPage: false }));

if (btnRenderRandomMultipage) {
  btnRenderRandomMultipage.addEventListener('click', () => runRandomRender({ multiPage: true }));
}

btnDocRender.addEventListener('click', async () => {
  clearDocError();
  btnDocRender.disabled = true;
  btnDocReset.disabled = true;
  try {
    const payload = buildDocumentPayload();
    const r = await fetch('/api/render/document', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await renderPdfFromResponse(r, {
      frame: docPreviewFrame,
      link: docDownloadLink,
      wrap: docPreviewWrap,
      filename: 'document.pdf',
    });
  } catch (e) {
    showDocError(String(e.message || e));
  } finally {
    btnDocRender.disabled = false;
    btnDocReset.disabled = false;
  }
});

initUi();
initFormDefaults();
