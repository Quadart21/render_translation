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
const btnAddMessage = document.getElementById('btn-add-message');
const btnAddImage = document.getElementById('btn-add-image');
const platformSel = document.getElementById('platform');
const previewWrap = document.getElementById('preview-wrap');
const previewImg = document.getElementById('preview-img');
const downloadLink = document.getElementById('download-link');
const messageRows = document.getElementById('message-rows');
const chkPinned = document.getElementById('chk-pinned');
const pinnedText = document.getElementById('pinned-text');
const chkRandomAvatar = document.getElementById('chk-random-avatar');
const chkCompositeScreen = document.getElementById('chk-composite-screen');
const compositeScreenFile = document.getElementById('composite-screen-file');
const btnCompositeClear = document.getElementById('btn-composite-clear');
const compositeScreenStatus = document.getElementById('composite-screen-status');

/** data URL полного скрина для compositeScreenshot (только iOS) */
let compositeScreenshotDataUrl = null;

/** data URL выбранного файла по строке «Картинка» */
const imageRowData = new WeakMap();

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

async function fetchMe() {
  const r = await fetch('/api/me', { credentials: 'same-origin' });
  if (!r.ok) return null;
  const data = await r.json();
  return data.user;
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

  if (!cfg.authEnabled) {
    hide(panelLoading);
    hide(panelLogin);
    show(panelApp);
    hide(authToolbar);
    return;
  }

  const user = await fetchMe();
  hide(panelLoading);

  if (!user) {
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
  const uname = user.username ? `@${user.username}` : '';
  userLabel.textContent = [user.first_name, uname, `(id ${user.id})`].filter(Boolean).join(' ');
}

function syncIosFields() {
  const isIos = platformSel.value === 'ios';
  document.querySelectorAll('.ios-only-row').forEach((el) => {
    el.classList.toggle('hidden', !isIos);
  });
}

function createMessageRow(preset) {
  const kind = preset?.kind || 'message';
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-row-top">
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
      <label class="field field-full">
        <span class="field-label">Подпись под картинкой</span>
        <textarea class="textarea textarea-sm msg-img-caption" rows="2" placeholder="Необязательно"></textarea>
      </label>
      <label class="field field-full">
        <span class="field-label">Текст кнопки под медиа</span>
        <input type="text" class="input input-sm msg-img-action" placeholder="Например: Открыть" />
      </label>
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
  if (preset?.caption) row.querySelector('.msg-img-caption').value = preset.caption;
  if (preset?.action) row.querySelector('.msg-img-action').value = preset.action;

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
  });
  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    if (messageRows.querySelectorAll('.msg-row').length <= 1) return;
    row.remove();
  });

  applyKind();
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
      const caption = row.querySelector('.msg-img-caption').value.trim();
      const action = row.querySelector('.msg-img-action').value.trim();
      const stored = imageRowData.get(row);
      const src = stored && stored.dataUrl ? stored.dataUrl : null;
      const item = { type: 'image', from, time, src };
      if (caption) item.caption = caption;
      if (action) item.action = action;
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
      { id: 'bank', name: nameOpponent, side: 'left', avatar: null },
      { id: 'me', name: nameMe, side: 'right', avatar: null },
    ],
    items,
  };

  if (platform === 'ios') {
    const sub = document.getElementById('ios-subtitle').value.trim();
    const badge = document.getElementById('ios-back-badge').value.trim();
    const bat = document.getElementById('ios-battery').value.trim();
    const header = {};
    if (sub) header.subtitle = sub;
    if (badge) header.backBadge = badge;
    if (Object.keys(header).length) scene.header = header;
    if (bat) scene.statusBar.battery = bat;
  }

  if (chkPinned.checked) {
    const pt = pinnedText.value.trim();
    if (pt) scene.pinned = { text: pt };
  }

  const payload = { ...scene };
  if (chkRandomAvatar.checked) payload.randomAvatars = true;

  if (platform === 'ios') {
    if (chkCompositeScreen.checked && !compositeScreenshotDataUrl) {
      throw new Error('Включена подложка скрина: загрузите файл скрина (PNG или JPEG).');
    }
    if (chkCompositeScreen.checked && compositeScreenshotDataUrl) {
      payload.compositeScreenshot = compositeScreenshotDataUrl;
    }
  }

  return payload;
}

function initFormDefaults() {
  document.getElementById('status-time').value = '14:32';
  document.getElementById('name-opponent').value = '';
  document.getElementById('name-me').value = '';
  document.getElementById('ios-subtitle').value = '';
  document.getElementById('ios-back-badge').value = '';
  document.getElementById('ios-battery').value = '';
  chkPinned.checked = false;
  pinnedText.value = '';
  pinnedText.disabled = true;
  chkRandomAvatar.checked = false;
  chkCompositeScreen.checked = false;
  compositeScreenshotDataUrl = null;
  compositeScreenFile.value = '';
  compositeScreenStatus.textContent = '';

  compositeScreenFile.addEventListener('change', () => {
    const f = compositeScreenFile.files && compositeScreenFile.files[0];
    if (!f) {
      compositeScreenshotDataUrl = null;
      compositeScreenStatus.textContent = '';
      return;
    }
    if (!f.type.startsWith('image/')) {
      compositeScreenFile.value = '';
      compositeScreenshotDataUrl = null;
      compositeScreenStatus.textContent = 'Нужен файл изображения.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      compositeScreenshotDataUrl = reader.result;
      chkCompositeScreen.checked = true;
      compositeScreenStatus.textContent = `Загружено: ${f.name} (${Math.round(f.size / 1024)} KB)`;
    };
    reader.onerror = () => {
      compositeScreenshotDataUrl = null;
      compositeScreenStatus.textContent = 'Не удалось прочитать файл.';
    };
    reader.readAsDataURL(f);
  });

  btnCompositeClear.addEventListener('click', () => {
    compositeScreenFile.value = '';
    compositeScreenshotDataUrl = null;
    chkCompositeScreen.checked = false;
    compositeScreenStatus.textContent = '';
  });

  messageRows.innerHTML = '';
  messageRows.appendChild(
    createMessageRow({ from: 'bank', time: '14:28', text: 'Здравствуйте! Чем могу помочь?' })
  );
  messageRows.appendChild(
    createMessageRow({ from: 'me', time: '14:29', text: 'Добрый день. Приложите скан чека.' })
  );
  messageRows.appendChild(
    createMessageRow({
      kind: 'image',
      from: 'me',
      time: '14:30',
      caption: 'Чек об оплате',
      action: 'Открыть',
    })
  );
  messageRows.appendChild(
    createMessageRow({
      kind: 'image',
      from: 'me',
      time: '14:31',
      caption: 'Второй файл (при необходимости)',
      action: 'Открыть',
    })
  );

  platformSel.addEventListener('change', syncIosFields);
  chkPinned.addEventListener('change', () => {
    pinnedText.disabled = !chkPinned.checked;
  });

  btnAddMessage.addEventListener('click', () => {
    messageRows.appendChild(createMessageRow({ from: 'bank', time: '', text: '' }));
  });
  btnAddImage.addEventListener('click', () => {
    messageRows.appendChild(
      createMessageRow({ kind: 'image', from: 'me', time: '', caption: '', action: '' })
    );
  });

  syncIosFields();
}

btnLogout.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  previewWrap.classList.add('hidden');
  window.location.reload();
});

async function renderPngFromResponse(r) {
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
  previewImg.src = url;
  downloadLink.href = url;
  show(previewWrap);
}

btnRender.addEventListener('click', async () => {
  renderError.textContent = '';
  hide(renderError);
  btnRender.disabled = true;
  btnRenderRandom.disabled = true;
  try {
    const payload = buildScenePayload();
    const r = await fetch('/api/render/scene', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await renderPngFromResponse(r);
  } catch (e) {
    renderError.textContent = String(e.message || e);
    show(renderError);
  } finally {
    btnRender.disabled = false;
    btnRenderRandom.disabled = false;
  }
});

btnRenderRandom.addEventListener('click', async () => {
  renderError.textContent = '';
  hide(renderError);
  btnRender.disabled = true;
  btnRenderRandom.disabled = true;
  try {
    const platform = platformSel.value === 'ios' ? 'ios' : 'android';
    const r = await fetch('/api/render/random', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    await renderPngFromResponse(r);
  } catch (e) {
    renderError.textContent = String(e.message || e);
    show(renderError);
  } finally {
    btnRender.disabled = false;
    btnRenderRandom.disabled = false;
  }
});

initUi();
initFormDefaults();
