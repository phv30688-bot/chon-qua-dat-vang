(function () {
  'use strict';

  var PAGE_SIZE = 10;

  var state = {
    recipients: new Set(),
    occasions: new Set(),
    productTypes: new Set(),
    budget: null,
    products: [],
    meta: null,
    resultsVisible: false,
    visibleCount: PAGE_SIZE,
  };

  var els = {
    chipsRecipients: document.getElementById('chips-recipients'),
    chipsOccasions: document.getElementById('chips-occasions'),
    chipsBudget: document.getElementById('chips-budget'),
    chipsProductType: document.getElementById('chips-productType'),
    resetBtn: document.getElementById('resetBtn'),
    ctaBtn: document.getElementById('ctaBtn'),
    resultsWrap: document.getElementById('resultsWrap'),
    resultCount: document.getElementById('resultCount'),
    resultsGrid: document.getElementById('resultsGrid'),
    emptyState: document.getElementById('emptyState'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
  };

  function formatPrice(n) {
    return n.toLocaleString('vi-VN') + '₫';
  }

  function renderChipGroup(container, items, selectedSet, multi) {
    container.innerHTML = '';
    items.forEach(function (item) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.innerHTML = item.label + '<span class="count">' + item.count + '</span>';
      if (selectedSet.has(item.key)) chip.classList.add('active');
      chip.addEventListener('click', function () {
        if (selectedSet.has(item.key)) selectedSet.delete(item.key);
        else selectedSet.add(item.key);
        onFilterChanged();
      });
      container.appendChild(chip);
    });
  }

  function renderBudgetChips() {
    els.chipsBudget.innerHTML = '';
    state.meta.budgetTiers.forEach(function (item) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.innerHTML = item.label + '<span class="count">' + item.count + '</span>';
      if (state.budget === item.key) chip.classList.add('active');
      chip.addEventListener('click', function () {
        state.budget = (state.budget === item.key) ? null : item.key;
        onFilterChanged();
      });
      els.chipsBudget.appendChild(chip);
    });
  }

  function onFilterChanged() {
    state.resultsVisible = false;
    state.visibleCount = PAGE_SIZE;
    renderAll();
  }

  function productMatches(p) {
    if (state.budget && p.budgetTier !== state.budget) return false;
    if (state.productTypes.size > 0 && !state.productTypes.has(p.productType)) return false;

    if (state.recipients.size > 0 && p.recipients.length > 0) {
      var hit = p.recipients.some(function (r) { return state.recipients.has(r); });
      if (!hit) return false;
    }
    if (state.occasions.size > 0 && p.occasions.length > 0) {
      var hit2 = p.occasions.some(function (o) { return state.occasions.has(o); });
      if (!hit2) return false;
    }
    return true;
  }

  function specificity(p) {
    var score = 0;
    if (state.recipients.size > 0 && p.recipients.some(function (r) { return state.recipients.has(r); })) score += 1;
    if (state.occasions.size > 0 && p.occasions.some(function (o) { return state.occasions.has(o); })) score += 1;
    return score;
  }

  function getFiltered() {
    var filtered = state.products.filter(productMatches);
    var anySpecificFilter = state.recipients.size > 0 || state.occasions.size > 0;
    if (anySpecificFilter) {
      filtered = filtered.slice().sort(function (a, b) { return specificity(b) - specificity(a); });
    }
    return filtered;
  }

  function renderResults() {
    if (!state.resultsVisible) {
      els.resultsWrap.hidden = true;
      return;
    }
    els.resultsWrap.hidden = false;

    var filtered = getFiltered();
    var shown = filtered.slice(0, state.visibleCount);

    if (filtered.length === 0) {
      els.resultCount.textContent = '';
    } else {
      els.resultCount.textContent = 'Đang gợi ý ' + shown.length + ' / ' + filtered.length + ' sản phẩm phù hợp';
    }
    els.resultsGrid.innerHTML = '';
    els.emptyState.hidden = filtered.length > 0;
    els.loadMoreBtn.hidden = shown.length >= filtered.length;

    var frag = document.createDocumentFragment();
    shown.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'card';
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener';

      var imgWrap = document.createElement('div');
      imgWrap.className = 'card-img-wrap';
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.src = p.image || '';
      img.alt = p.title;
      imgWrap.appendChild(img);

      var body = document.createElement('div');
      body.className = 'card-body';
      var title = document.createElement('p');
      title.className = 'card-title';
      title.textContent = p.title;
      var price = document.createElement('p');
      price.className = 'card-price';
      price.textContent = formatPrice(p.price);
      body.appendChild(title);
      body.appendChild(price);

      a.appendChild(imgWrap);
      a.appendChild(body);
      frag.appendChild(a);
    });
    els.resultsGrid.appendChild(frag);
  }

  function renderAll() {
    renderChipGroup(els.chipsRecipients, state.meta.recipients, state.recipients, true);
    renderChipGroup(els.chipsOccasions, state.meta.occasions, state.occasions, true);
    renderChipGroup(els.chipsProductType, state.meta.productTypes, state.productTypes, true);
    renderBudgetChips();
    renderResults();
  }

  els.resetBtn.addEventListener('click', function () {
    state.recipients.clear();
    state.occasions.clear();
    state.productTypes.clear();
    state.budget = null;
    state.resultsVisible = false;
    state.visibleCount = PAGE_SIZE;
    renderAll();
  });

  els.ctaBtn.addEventListener('click', function () {
    state.resultsVisible = true;
    state.visibleCount = PAGE_SIZE;
    renderResults();
    els.resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  els.loadMoreBtn.addEventListener('click', function () {
    state.visibleCount += PAGE_SIZE;
    renderResults();
  });

  els.ctaBtn.disabled = true;
  els.ctaBtn.textContent = 'Đang tải dữ liệu...';

  Promise.all([
    fetch('data/products.json').then(function (r) { return r.json(); }),
    fetch('data/meta.json').then(function (r) { return r.json(); }),
  ]).then(function (res) {
    state.products = res[0];
    state.meta = res[1];
    els.ctaBtn.disabled = false;
    els.ctaBtn.textContent = 'Xem gợi ý quà phù hợp';
    renderAll();
  }).catch(function (err) {
    els.ctaBtn.textContent = 'Không tải được dữ liệu, thử tải lại trang';
    console.error(err);
  });

  // ---- Install prompt handling ----
  var installBtn = document.getElementById('installBtn');
  var iosHint = document.getElementById('iosInstallHint');
  var iosHintClose = document.getElementById('iosHintClose');
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
  iosHintClose.addEventListener('click', function () { iosHint.hidden = true; });

  // ---- Service worker ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('SW registration failed', err);
      });
    });
  }
})();
