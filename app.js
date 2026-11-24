(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var OCCASION_SKIP = 'any';

  var state = {
    products: [],
    meta: null,
    occasion: null,          // single key or OCCASION_SKIP
    budget: null,            // single key
    recipients: new Set(),   // optional, multi
    productTypes: new Set(), // optional, multi
    resultsOffset: 0,
  };

  var history = ['welcome'];

  var screens = {
    welcome: document.getElementById('screen-welcome'),
    occasion: document.getElementById('screen-occasion'),
    budget: document.getElementById('screen-budget'),
    review: document.getElementById('screen-review'),
    results: document.getElementById('screen-results'),
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].hidden = (k !== name);
    });
    window.scrollTo(0, 0);
  }

  function goTo(name) {
    history.push(name);
    showScreen(name);
  }

  function goBack() {
    if (history.length <= 1) return;
    history.pop();
    showScreen(history[history.length - 1]);
  }

  document.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', goBack);
  });

  function formatPrice(n) {
    return n.toLocaleString('vi-VN') + '₫';
  }

  // ---------- Bước 1: Dịp tặng ----------
  function renderOccasionOptions() {
    var container = document.getElementById('occasionOptions');
    container.innerHTML = '';
    state.meta.occasions.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        state.occasion = item.key;
        goTo('budget');
      });
      container.appendChild(btn);
    });
    var skipBtn = document.createElement('button');
    skipBtn.className = 'option-btn option-btn-wide';
    skipBtn.type = 'button';
    skipBtn.textContent = 'Dịp khác / Chưa chắc chắn';
    skipBtn.addEventListener('click', function () {
      state.occasion = OCCASION_SKIP;
      goTo('budget');
    });
    container.appendChild(skipBtn);
  }

  // ---------- Bước 2: Ngân sách ----------
  function renderBudgetOptions() {
    var container = document.getElementById('budgetOptions');
    container.innerHTML = '';
    state.meta.budgetTiers.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'option-row';
      btn.type = 'button';
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        state.budget = item.key;
        goTo('review');
        renderReview();
      });
      container.appendChild(btn);
    });
  }

  // ---------- Bước 3: Xem lại ----------
  function occasionLabel() {
    if (!state.occasion || state.occasion === OCCASION_SKIP) return null;
    var found = state.meta.occasions.find(function (o) { return o.key === state.occasion; });
    return found ? found.label : null;
  }
  function budgetLabel() {
    var found = state.meta.budgetTiers.find(function (b) { return b.key === state.budget; });
    return found ? found.label : '';
  }

  function renderReview() {
    var pillsWrap = document.getElementById('reviewPills');
    pillsWrap.innerHTML = '';
    var oLabel = occasionLabel();
    if (oLabel) {
      pillsWrap.appendChild(makePill(oLabel, function () { goTo('occasion'); }));
    }
    pillsWrap.appendChild(makePill(budgetLabel(), function () { goTo('budget'); }));

    renderToggleGrid('recipientOptions', state.meta.recipients, state.recipients);
    renderToggleGrid('productTypeOptions', state.meta.productTypes, state.productTypes);
  }

  function makePill(text, onClick) {
    var pill = document.createElement('button');
    pill.className = 'pill';
    pill.type = 'button';
    pill.textContent = text;
    pill.addEventListener('click', onClick);
    return pill;
  }

  function renderToggleGrid(containerId, items, selectedSet) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.textContent = item.label;
      if (selectedSet.has(item.key)) btn.classList.add('active');
      btn.addEventListener('click', function () {
        if (selectedSet.has(item.key)) selectedSet.delete(item.key);
        else selectedSet.add(item.key);
        btn.classList.toggle('active');
      });
      container.appendChild(btn);
    });
  }

  document.querySelectorAll('[data-accordion]').forEach(function (head) {
    head.addEventListener('click', function () {
      var key = head.getAttribute('data-accordion');
      var body = document.getElementById('accordion-' + key);
      body.hidden = !body.hidden;
      head.classList.toggle('open', !body.hidden);
    });
  });

  // ---------- Lọc & sắp xếp ----------
  function productMatches(p) {
    if (state.budget && p.budgetTier !== state.budget) return false;

    if (state.occasion && state.occasion !== OCCASION_SKIP && p.occasions.length > 0) {
      if (p.occasions.indexOf(state.occasion) === -1) return false;
    }
    if (state.recipients.size > 0 && p.recipients.length > 0) {
      var hit = p.recipients.some(function (r) { return state.recipients.has(r); });
      if (!hit) return false;
    }
    if (state.productTypes.size > 0 && !state.productTypes.has(p.productType)) return false;
    return true;
  }

  function specificity(p) {
    var score = 0;
    if (state.occasion && state.occasion !== OCCASION_SKIP && p.occasions.indexOf(state.occasion) !== -1) score += 2;
    if (state.recipients.size > 0 && p.recipients.some(function (r) { return state.recipients.has(r); })) score += 1;
    return score;
  }

  function getSortedMatches() {
    var filtered = state.products.filter(productMatches);
    filtered.sort(function (a, b) { return specificity(b) - specificity(a); });
    return filtered;
  }

  function productTypeLabel(key) {
    var found = state.meta.productTypes.find(function (t) { return t.key === key; });
    return found ? found.label : 'Khác';
  }

  // ---------- Kết quả ----------
  function renderResultsBatch() {
    var filtered = getSortedMatches();
    var oLabel = occasionLabel();
    var parts = [budgetLabel()];
    if (oLabel) parts.push(oLabel);
    document.getElementById('resultsSummary').textContent = 'Theo: ' + parts.join(' · ');

    var list = document.getElementById('resultsList');
    var emptyState = document.getElementById('emptyState');
    var moreBtn = document.getElementById('moreBtn');
    list.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.hidden = false;
      moreBtn.hidden = true;
      return;
    }
    emptyState.hidden = true;

    if (state.resultsOffset >= filtered.length) state.resultsOffset = 0;
    var batch = filtered.slice(state.resultsOffset, state.resultsOffset + PAGE_SIZE);
    if (batch.length < PAGE_SIZE) {
      // wrap to fill the batch so the customer always sees a full set of 10 when possible
      batch = batch.concat(filtered.slice(0, PAGE_SIZE - batch.length));
    }

    moreBtn.hidden = filtered.length <= PAGE_SIZE;

    var frag = document.createDocumentFragment();
    batch.forEach(function (p) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'result-row';
      row.addEventListener('click', function () { openProductModal(p); });

      var thumb = document.createElement('div');
      thumb.className = 'result-thumb';
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.src = p.image || '';
      img.alt = p.title;
      thumb.appendChild(img);

      var body = document.createElement('div');
      body.className = 'result-body';
      var title = document.createElement('p');
      title.className = 'result-title';
      title.textContent = p.title;
      var price = document.createElement('p');
      price.className = 'result-price';
      price.textContent = formatPrice(p.price);

      var tags = document.createElement('div');
      tags.className = 'result-tags';
      var tag1 = document.createElement('span');
      tag1.className = 'tag';
      tag1.textContent = 'Trong ngân sách';
      tags.appendChild(tag1);

      var score = specificity(p);
      var tag2 = document.createElement('span');
      tag2.className = 'tag tag-alt';
      tag2.textContent = score > 0 ? 'Đúng tiêu chí bạn chọn' : productTypeLabel(p.productType);
      tags.appendChild(tag2);

      body.appendChild(title);
      body.appendChild(price);
      body.appendChild(tags);

      row.appendChild(thumb);
      row.appendChild(body);
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }

  // ---------- Modal chi tiết sản phẩm (xem trước khắc/dán tem + đặt qua Zalo) ----------
  var ZALO_CONTACT = 'https://zalo.me/0904866869';
  var modalState = { product: null, style: 'engraved' };

  var modalEls = {
    overlay: document.getElementById('productModal'),
    image: document.getElementById('modalImage'),
    overlayText: document.getElementById('modalOverlayText'),
    title: document.getElementById('modalTitle'),
    price: document.getElementById('modalPrice'),
    styleEngraved: document.getElementById('styleEngraved'),
    styleSticker: document.getElementById('styleSticker'),
    customText: document.getElementById('customText'),
    charCount: document.getElementById('charCount'),
    websiteBtn: document.getElementById('modalWebsiteBtn'),
    zaloBtn: document.getElementById('modalZaloBtn'),
    closeBtn: document.getElementById('modalCloseBtn'),
    closeX: document.getElementById('modalCloseX'),
  };

  function updateOverlayPreview() {
    modalEls.overlayText.textContent = modalEls.customText.value.trim();
    modalEls.overlayText.className = 'overlay-text ' + modalState.style;
  }

  function setModalStyle(style) {
    modalState.style = style;
    modalEls.styleEngraved.classList.toggle('active', style === 'engraved');
    modalEls.styleSticker.classList.toggle('active', style === 'sticker');
    updateOverlayPreview();
  }

  // Paintings/photo frames are usually photographed propped on a table, so
  // the lower frame edge sits well above the bottom of the square photo;
  // statues and other objects are typically cropped tight to their wooden
  // base, which sits right at the bottom. This is an approximation (exact
  // position still varies photo to photo), not a per-image calibration.
  function overlayBottomFor(productType) {
    return (productType === 'tranh' || productType === 'khung_anh') ? '22%' : '9%';
  }

  function openProductModal(p) {
    modalState.product = p;
    modalEls.image.src = p.image || '';
    modalEls.image.alt = p.title;
    modalEls.title.textContent = p.title;
    modalEls.price.textContent = formatPrice(p.price);
    modalEls.overlayText.style.bottom = overlayBottomFor(p.productType);
    modalEls.websiteBtn.href = p.url;
    modalEls.customText.value = '';
    modalEls.charCount.textContent = '0';
    setModalStyle('engraved');
    modalEls.overlay.hidden = false;
  }

  function closeProductModal() {
    modalEls.overlay.hidden = true;
  }

  modalEls.styleEngraved.addEventListener('click', function () { setModalStyle('engraved'); });
  modalEls.styleSticker.addEventListener('click', function () { setModalStyle('sticker'); });
  modalEls.customText.addEventListener('input', function () {
    modalEls.charCount.textContent = String(modalEls.customText.value.length);
    updateOverlayPreview();
  });
  modalEls.closeBtn.addEventListener('click', closeProductModal);
  modalEls.closeX.addEventListener('click', closeProductModal);
  modalEls.overlay.addEventListener('click', function (e) {
    if (e.target === modalEls.overlay) closeProductModal();
  });

  modalEls.zaloBtn.addEventListener('click', function () {
    var p = modalState.product;
    if (!p) return;
    var styleLabel = modalState.style === 'sticker' ? 'Dán tem' : 'Khắc bảng';
    var customText = modalEls.customText.value.trim();
    var lines = [
      'Tôi muốn đặt: ' + p.title + ' - ' + formatPrice(p.price),
      'Kiểu thể hiện: ' + styleLabel,
    ];
    if (customText) lines.push('Nội dung khắc/in: ' + customText);
    lines.push('Link sản phẩm: ' + p.url);
    var message = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(function () {});
    }
    window.open(ZALO_CONTACT, '_blank', 'noopener');
  });

  document.getElementById('startBtn').addEventListener('click', function () {
    goTo('occasion');
  });

  document.getElementById('submitBtn').addEventListener('click', function () {
    state.resultsOffset = 0;
    goTo('results');
    renderResultsBatch();
  });

  document.getElementById('moreBtn').addEventListener('click', function () {
    state.resultsOffset += PAGE_SIZE;
    renderResultsBatch();
    document.getElementById('screen-results').scrollTo(0, 0);
  });

  document.getElementById('iosHintClose').addEventListener('click', function () {
    document.getElementById('iosInstallHint').hidden = true;
  });

  // ---------- Tải dữ liệu ----------
  document.getElementById('startBtn').disabled = true;
  document.getElementById('startBtn').textContent = 'Đang tải dữ liệu...';

  Promise.all([
    fetch('data/products.json').then(function (r) { return r.json(); }),
    fetch('data/meta.json').then(function (r) { return r.json(); }),
  ]).then(function (res) {
    state.products = res[0];
    state.meta = res[1];
    renderOccasionOptions();
    renderBudgetOptions();
    var startBtn = document.getElementById('startBtn');
    startBtn.disabled = false;
    startBtn.textContent = 'Bắt đầu tìm quà';
  }).catch(function (err) {
    var startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'Không tải được dữ liệu, thử tải lại trang';
    console.error(err);
  });

  // ---- Install prompt handling ----
  var installBtn = document.getElementById('installBtn');
  var iosHint = document.getElementById('iosInstallHint');
  var deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  if (!isStandalone()) {
    if (isIOS()) {
      installBtn.hidden = false;
      installBtn.addEventListener('click', function () { iosHint.hidden = false; });
    } else {
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.hidden = false;
      });
      installBtn.addEventListener('click', function () {
        if (deferredPrompt) deferredPrompt.prompt();
      });
      window.addEventListener('appinstalled', function () {
        installBtn.hidden = true;
      });
    }
  }

  // ---- Service worker ----
  // updateViaCache:'none' stops the browser's HTTP cache from ever serving a
  // stale sw.js, and reloading once a new worker takes control makes sure the
  // visitor always ends up on the latest app shell + data without manual steps.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
        reg.update();
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update();
        });
      }).catch(function (err) {
        console.warn('SW registration failed', err);
      });

      var reloadedForUpdate = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloadedForUpdate) return;
        reloadedForUpdate = true;
        window.location.reload();
      });
    });
  }
})();
