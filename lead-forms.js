(function () {
  'use strict';
  // Demonstration only: no HTTP requests, analytics, storage or actual lead delivery.
  var config = {
    price: {
      tag: 'Прайс-лист / ИЗОБОНД', title: 'Получить прайс-лист',
      intro: 'Укажите e-mail — отправим прайс на продукцию ИЗОБОНД.',
      button: 'Получить прайс', success: 'Спасибо за запрос!',
      message: 'Запрос на прайс принят. Прайс-лист будет направлен на указанный e-mail.'
    },
    wholesale: {
      tag: 'Оптовые поставки / ИЗОБОНД', title: 'Запросить оптовую цену',
      intro: 'Укажите объём и контакты — подготовим предложение.',
      button: 'Запросить оптовую цену', success: 'Заявка принята',
      message: 'Менеджер свяжется с вами, чтобы уточнить условия и стоимость.'
    },
    calculation: {
      tag: 'Расчёт на объект / ИЗОБОНД', title: 'Получить расчёт и стоимость',
      intro: 'Оставьте контакты — менеджер уточнит расчёт и подготовит предложение.',
      button: 'Отправить расчёт и запросить цену', success: 'Заявка с расчётом принята',
      message: 'Менеджер свяжется с вами для уточнения стоимости и поставки.'
    }
  };
  var dialog = document.createElement('dialog');
  dialog.className = 'lead-dialog';
  dialog.id = 'leadDialog';
  dialog.setAttribute('aria-labelledby', 'leadTitle');
  dialog.setAttribute('aria-describedby', 'leadIntro');
  dialog.innerHTML = '<button class="lead-close" type="button" aria-label="Закрыть форму">×</button>' +
    '<div class="lead-inner"><div id="leadEntry">' +
    '<div class="lead-eyebrow" id="leadTag"></div><h2 id="leadTitle" tabindex="-1"></h2>' +
    '<p class="lead-intro" id="leadIntro"></p><div id="leadContext" class="lead-context" hidden></div>' +
    '<p class="lead-required">* — обязательные поля</p>' +
    '<form id="leadForm" novalidate><div class="lead-grid" id="leadFields"></div>' +
    '<div class="lead-consent"><input id="leadConsent" name="consent" type="checkbox" required aria-describedby="leadConsentError">' +
    '<div><label for="leadConsent">Я даю согласие на обработку персональных данных *</label> ' +
    '<button class="lead-link" type="button" data-legal="consent">Текст согласия</button></div></div>' +
    '<p class="lead-error" id="leadConsentError" hidden></p>' +
    '<p class="lead-policy"><button type="button" class="lead-link" data-legal="policy">Политика обработки персональных данных</button></p>' +
    '<div id="leadFailure" class="lead-failure" role="alert" hidden>Не удалось отправить заявку. Попробуйте ещё раз — введённые данные сохранены.</div>' +
    '<button class="btn btn-primary lead-submit" id="leadSubmit" type="submit"></button></form></div>' +
    '<div class="lead-success" id="leadSuccess" hidden><div class="lead-success-icon" aria-hidden="true">✓</div>' +
    '<h2 id="leadSuccessTitle" tabindex="-1"></h2><p id="leadSuccessMessage"></p>' +
    '<button class="btn btn-primary lead-submit" type="button" data-close>Вернуться на сайт</button></div>' +
    '<p class="lead-note">Прототип: данные никуда не отправляются.</p>' +
    '<details class="lead-preview"><summary>Просмотр состояний для дизайнера</summary>' +
    '<div class="lead-preview-actions"><button class="lead-link" type="button" data-preview="errors">Ошибки полей</button>' +
    '<button class="lead-link" type="button" data-preview="failure">Ошибка отправки</button>' +
    '<button class="lead-link" type="button" data-preview="success">Успешная отправка</button></div></details></div>';
  document.body.appendChild(dialog);

  var legal = document.createElement('dialog');
  legal.className = 'lead-dialog';
  legal.setAttribute('aria-labelledby', 'leadLegalTitle');
  legal.innerHTML = '<button class="lead-close" type="button" aria-label="Закрыть документ">×</button>' +
    '<div class="lead-inner"><div class="lead-eyebrow">Документы / макет</div>' +
    '<h2 id="leadLegalTitle" tabindex="-1"></h2>' +
    '<p class="lead-intro">Здесь будет согласованный текст документа. В прототипе показаны расположение ссылки и открытие документа.</p>' +
    '<button class="btn btn-ghost lead-submit" type="button" data-close>Вернуться к форме</button></div>';
  document.body.appendChild(legal);

  var form = dialog.querySelector('form'), fields = dialog.querySelector('#leadFields');
  var entry = dialog.querySelector('#leadEntry'), success = dialog.querySelector('#leadSuccess');
  var submit = dialog.querySelector('#leadSubmit'), failure = dialog.querySelector('#leadFailure');
  var activeKind, opener, pending;
  function el(id) { return document.getElementById(id); }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function field(name, label, required, type, placeholder, wide, autocomplete) {
    var id = 'lead-' + name;
    return '<div class="lead-field' + (wide ? ' lead-wide' : '') + '"><label for="' + id + '">' + label + (required ? ' *' : '') + '</label>' +
      '<input id="' + id + '" name="' + name + '" type="' + (type || 'text') + '" ' + (required ? 'required ' : '') +
      (autocomplete ? 'autocomplete="' + autocomplete + '" ' : '') + 'placeholder="' + placeholder + '" maxlength="' + (name === 'phone' ? '30' : '200') +
      '" aria-describedby="' + id + '-error"><p class="lead-error" id="' + id + '-error" hidden></p></div>';
  }
  function summaryItem(label, value, total) {
    return '<div><dt>' + label + '</dt><dd' + (total ? ' class="lead-total"' : '') + '>' + escapeHTML(value) + '</dd></div>';
  }
  function showEntry() {
    clearTimeout(pending); entry.hidden = false; success.hidden = true;
    dialog.setAttribute('aria-labelledby', 'leadTitle');
    dialog.setAttribute('aria-describedby', 'leadIntro');
    form.removeAttribute('aria-busy'); submit.disabled = false; submit.textContent = config[activeKind].button;
  }
  function showSuccess() {
    clearTimeout(pending); entry.hidden = true; success.hidden = false;
    el('leadSuccessTitle').textContent = config[activeKind].success;
    el('leadSuccessMessage').textContent = config[activeKind].message;
    dialog.setAttribute('aria-labelledby', 'leadSuccessTitle');
    dialog.setAttribute('aria-describedby', 'leadSuccessMessage');
    dialog.scrollTop = 0; el('leadSuccessTitle').focus();
  }
  function open(kind, trigger) {
    if (!config[kind]) return;
    if (kind === 'calculation' && !el('cArea').reportValidity()) return;
    activeKind = kind; opener = trigger;
    var cfg = config[kind];
    el('leadTag').textContent = cfg.tag; el('leadTitle').textContent = cfg.title; el('leadIntro').textContent = cfg.intro;
    var price = kind === 'price';
    var html = price ? field('email', 'E-mail', true, 'email', 'you@company.ru', true, 'email') : '';
    html += field('name', 'Имя', !price, 'text', 'Как к вам обращаться', false, 'given-name');
    html += field('phone', 'Телефон', true, 'tel', '+7 (999) 123-45-67', false, 'tel');
    if (!price) html += field('email', 'E-mail', false, 'email', 'you@company.ru', false, 'email');
    html += field('company', 'Компания', false, 'text', 'Название компании', false, 'organization');
    html += field('region', price ? 'Город / регион' : 'Город / регион поставки', !price, 'text', 'Например, Москва', true, 'address-level2');
    if (kind === 'wholesale') html += '<div class="lead-field lead-wide"><label for="lead-volume">Планируемый объём</label>' +
      '<div class="lead-volume"><input id="lead-volume" name="volume" type="number" min="0.01" step="any" inputmode="decimal" placeholder="Например, 100" aria-describedby="lead-volume-help lead-volume-error">' +
      '<select name="unit" aria-label="Единица объёма"><option value="rolls">рулоны</option><option value="m2">м²</option></select></div>' +
      '<p class="lead-help" id="lead-volume-help">Если объём пока неизвестен, оставьте поле пустым — поможем рассчитать.</p><p class="lead-error" id="lead-volume-error" hidden></p></div>';
    if (!price) html += '<div class="lead-field lead-wide"><label for="lead-comment">' + (kind === 'calculation' ? 'Комментарий к заказу' : 'Комментарий') + '</label>' +
      '<textarea id="lead-comment" name="comment" rows="2" maxlength="2000" placeholder="Сроки, доставка или другие пожелания"></textarea></div>';
    fields.innerHTML = html;
    form.reset();
    el('leadConsent').removeAttribute('aria-invalid'); el('leadConsentError').hidden = true;
    failure.hidden = true; dialog.querySelector('details').open = false;
    var context = el('leadContext'); context.hidden = price;
    if (kind === 'wholesale') {
      context.innerHTML = '<div class="lead-context-label">Выбранный товар</div><div class="lead-product">' + escapeHTML(el('prodName').textContent) +
        '</div><p class="lead-product-detail">' + escapeHTML(el('prodArt').textContent) + '</p>';
      form.dataset.product = el('prodArt').textContent;
    } else if (kind === 'calculation') {
      context.innerHTML = '<div class="lead-context-label">Ваш расчёт</div><div class="lead-product">' + escapeHTML(el('cType').selectedOptions[0].textContent) + '</div>' +
        '<dl class="lead-summary">' + summaryItem('Площадь поверхности', el('cArea').value + ' м²') +
        summaryItem('Запас на подрезку', Math.round(Number(el('cReserve').value) * 100) + '%') +
        summaryItem('С учётом нахлёста', el('cEff').textContent) + summaryItem('С нахлёстом и запасом', el('cTot').textContent) +
        summaryItem('Площадь рулона', el('cRoll').textContent) + summaryItem('Рулонов к заказу', el('cRolls').textContent, true) + '</dl>' +
        '<button type="button" class="lead-link lead-edit" id="leadEdit">Изменить расчёт</button>';
      // Attach calculation context to the form for a future submission integration.
      form.dataset.calculation = JSON.stringify({ material: el('cType').selectedOptions[0].textContent, area: el('cArea').value,
        reserve: el('cReserve').value, effective: el('cEff').textContent, total: el('cTot').textContent,
        rollArea: el('cRoll').textContent, rolls: el('cRolls').textContent });
    } else context.replaceChildren();
    if (kind !== 'wholesale') delete form.dataset.product;
    if (kind !== 'calculation') delete form.dataset.calculation;
    showEntry(); dialog.showModal(); dialog.scrollTop = 0; el('leadTitle').focus();
  }
  function validate(input) {
    var message = '', value = input.value.trim();
    if (input.type === 'checkbox') { if (!input.checked) message = 'Подтвердите согласие на обработку данных.'; }
    else if (input.required && !value) message = 'Заполните это поле.';
    else if (value && input.type === 'email' && input.validity.typeMismatch) message = 'Укажите e-mail в формате name@company.ru.';
    else if (value && input.type === 'tel' && (!/^[+\d\s().-]+$/.test(value) || value.replace(/\D/g, '').length < 10 || value.replace(/\D/g, '').length > 15)) message = 'Укажите телефон: от 10 до 15 цифр с кодом страны.';
    else if (input.type === 'number' && !input.validity.valid) message = 'Укажите объём больше нуля.';
    var error = el(input.id === 'leadConsent' ? 'leadConsentError' : input.id + '-error');
    if (error) { error.textContent = message; error.hidden = !message; }
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !message;
  }
  function validateAll() {
    var first;
    form.querySelectorAll('input').forEach(function (input) { if (!validate(input) && !first) first = input; });
    if (first) first.focus();
    return !first;
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (submit.disabled || !validateAll()) return;
    failure.hidden = true; submit.disabled = true; form.setAttribute('aria-busy', 'true'); submit.textContent = 'Отправляем…';
    pending = setTimeout(function () { if (dialog.open) showSuccess(); }, 700);
  });
  form.addEventListener('input', function (event) {
    if (event.target.matches('input') && event.target.getAttribute('aria-invalid') === 'true') validate(event.target);
  });
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-lead]');
    if (trigger) { event.preventDefault(); open(trigger.dataset.lead, trigger); }
  });
  dialog.addEventListener('click', function (event) {
    if (event.target.closest('[data-legal]')) {
      el('leadLegalTitle').textContent = event.target.dataset.legal === 'policy' ? 'Политика обработки персональных данных' : 'Согласие на обработку персональных данных';
      legal.showModal(); el('leadLegalTitle').focus(); return;
    }
    if (event.target.closest('#leadEdit')) { opener = el('cArea'); dialog.close(); return; }
    var preview = event.target.closest('[data-preview]');
    if (!preview) return;
    showEntry(); failure.hidden = true;
    if (preview.dataset.preview === 'success') showSuccess();
    else if (preview.dataset.preview === 'failure') { failure.hidden = false; submit.textContent = 'Попробовать ещё раз'; failure.scrollIntoView({ block: 'nearest' }); }
    else { validateAll(); }
  });
  [dialog, legal].forEach(function (modal) {
    modal.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var focusable = Array.from(modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]'))
        .filter(function (node) { return node.checkVisibility(); });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || focusable.indexOf(document.activeElement) === -1)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    modal.addEventListener('click', function (event) {
      if (event.target.closest('.lead-close, [data-close]')) modal.close();
    });
    // Only dismiss a backdrop click if the gesture also began outside the dialog.
    var outsideStart = false;
    function outside(event) { var rect = modal.getBoundingClientRect(); return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom; }
    modal.addEventListener('pointerdown', function (event) { outsideStart = event.target === modal && outside(event); });
    modal.addEventListener('pointerup', function (event) { if (outsideStart && event.target === modal && outside(event)) modal.close(); outsideStart = false; });
  });
  dialog.addEventListener('close', function () { clearTimeout(pending); if (opener) opener.focus({ preventScroll: true }); });
})();
