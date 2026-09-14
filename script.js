/* =========================================================
   LumiTech — script principal (JavaScript puro)
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---- Armazenamento tolerante a falhas -------------------
     Alguns navegadores bloqueiam localStorage em contextos
     restritos; nesses casos usamos memória para não gerar erro. */
  var store = (function () {
    var memory = {};
    var ok = false;
    try {
      localStorage.setItem('__lt', '1');
      localStorage.removeItem('__lt');
      ok = true;
    } catch (e) { ok = false; }
    return {
      get: function (k) { try { return ok ? localStorage.getItem(k) : (k in memory ? memory[k] : null); } catch (e) { return null; } },
      set: function (k, v) { try { ok ? localStorage.setItem(k, v) : (memory[k] = v); } catch (e) { memory[k] = v; } }
    };
  })();

  var brl = function (n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  /* ---------- TEMA ---------- */
  var root = document.documentElement;
  var themeBtn = $('#themeBtn');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    store.set('lumitech-theme', theme);
    themeBtn.setAttribute('title', theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro');
  }

  applyTheme(store.get('lumitech-theme') === 'dark' ? 'dark' : 'light');

  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
  });

  /* ---------- HEADER, MENU E OVERLAY ---------- */
  var header = $('#header');
  var nav = $('#nav');
  var menuBtn = $('#menuBtn');
  var overlay = $('#overlay');

  window.addEventListener('scroll', function () {
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }, { passive: true });

  function showOverlay(show) {
    if (show) {
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    } else {
      overlay.classList.remove('is-open');
      setTimeout(function () { overlay.hidden = true; }, 220);
    }
  }

  function closeMenu() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menu');
  }

  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });

  /* ---------- NAVEGAÇÃO ---------- */
  var links = $$('.nav__link');

  links.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Marca a seção visível no menu
  var sections = ['#hero', '#produtos', '#quem-somos', '#contato']
    .map(function (id) { return $(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- BUSCA E FILTROS ---------- */
  var searchBtn = $('#searchBtn');
  var searchBar = $('#searchBar');
  var searchInput = $('#searchInput');
  var searchClose = $('#searchClose');
  var chips = $$('.chip');
  var cards = $$('.card');
  var emptyState = $('#emptyState');
  var activeFilter = 'all';

  function applyFilters() {
    var term = searchInput.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matchCat = activeFilter === 'all' || card.dataset.cat === activeFilter;
      var haystack = (card.dataset.name + ' ' + card.dataset.cat).toLowerCase();
      var matchTerm = !term || haystack.indexOf(term) !== -1;
      var show = matchCat && matchTerm;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });

    emptyState.hidden = visible > 0;
  }

  function toggleSearch(open) {
    searchBar.hidden = !open;
    searchBtn.setAttribute('aria-expanded', String(open));
    if (open) searchInput.focus();
    else { searchInput.value = ''; applyFilters(); }
  }

  searchBtn.addEventListener('click', function () { toggleSearch(searchBar.hidden); });
  searchClose.addEventListener('click', function () { toggleSearch(false); });
  searchInput.addEventListener('input', applyFilters);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      applyFilters();
      $('#produtos').scrollIntoView({ behavior: 'smooth' });
    }
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });

  // Cards de categoria filtram a vitrine
  $$('.cat').forEach(function (cat) {
    cat.addEventListener('click', function () {
      var target = cat.dataset.cat;
      chips.forEach(function (c) { c.classList.toggle('is-active', c.dataset.filter === target); });
      activeFilter = target;
      applyFilters();
      closeMenu();
    });
  });

  /* ---------- FAVORITOS ---------- */
  var favs = JSON.parse(store.get('lumitech-favs') || '[]');

  $$('.fav').forEach(function (btn) {
    var name = btn.closest('.card').dataset.name;
    if (favs.indexOf(name) !== -1) btn.setAttribute('aria-pressed', 'true');

    btn.addEventListener('click', function () {
      var active = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!active));
      btn.classList.remove('beat');
      void btn.offsetWidth; // reinicia a animação
      btn.classList.add('beat');

      var i = favs.indexOf(name);
      if (active) { if (i !== -1) favs.splice(i, 1); }
      else if (i === -1) { favs.push(name); }

      store.set('lumitech-favs', JSON.stringify(favs));
      toast(active ? 'Removido dos favoritos' : 'Salvo nos favoritos');
    });
  });

  /* ---------- CARRINHO ---------- */
  var cart = [];
  var cartBtn = $('#cartBtn');
  var cartBadge = $('#cartBadge');
  var cartDrawer = $('#cartDrawer');
  var cartItems = $('#cartItems');
  var cartTotal = $('#cartTotal');

  function renderCart() {
    var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var total = cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0);

    cartBadge.hidden = count === 0;
    cartBadge.textContent = count;
    cartTotal.textContent = brl(total);

    if (!cart.length) {
      cartItems.innerHTML = '<p class="drawer__empty">Seu carrinho está vazio. Escolha um produto nos destaques para começar.</p>';
      return;
    }

    cartItems.innerHTML = '';
    cart.forEach(function (item, index) {
      var row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML =
        '<div class="cart-item__info">' +
          '<div class="cart-item__name"></div>' +
          '<div class="cart-item__meta"></div>' +
        '</div>' +
        '<button class="cart-item__remove" type="button">Remover</button>';
      $('.cart-item__name', row).textContent = item.name;
      $('.cart-item__meta', row).textContent = item.qty + ' × ' + brl(item.price);
      $('.cart-item__remove', row).addEventListener('click', function () {
        cart.splice(index, 1);
        renderCart();
      });
      cartItems.appendChild(row);
    });
  }

  function openCart(open) {
    cartDrawer.classList.toggle('is-open', open);
    cartDrawer.setAttribute('aria-hidden', String(!open));
    showOverlay(open);
  }

  $$('.btn--buy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.card');
      var name = card.dataset.name;
      var price = parseFloat($('.price', card).dataset.price);
      var found = cart.filter(function (i) { return i.name === name; })[0];

      if (found) found.qty++;
      else cart.push({ name: name, price: price, qty: 1 });

      renderCart();
      cartBadge.classList.remove('pop');
      void cartBadge.offsetWidth;
      cartBadge.classList.add('pop');
      toast(name + ' adicionado ao carrinho');
    });
  });

  cartBtn.addEventListener('click', function () { openCart(!cartDrawer.classList.contains('is-open')); });
  $('#cartClose').addEventListener('click', function () { openCart(false); });
  overlay.addEventListener('click', function () { openCart(false); closeMenu(); });

  $('#checkoutBtn').addEventListener('click', function () {
    if (!cart.length) { toast('Adicione um produto antes de finalizar'); return; }
    toast('Checkout de demonstração — pedido não enviado');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    openCart(false);
    closeMenu();
    if (!searchBar.hidden) toggleSearch(false);
  });

  renderCart();

  /* ---------- TOAST ---------- */
  var toastEl = $('#toast');
  var toastTimer;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2200);
  }

  /* ---------- REVELAÇÃO AO ROLAR ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    var targets = $$('.section__head, .cat, .card, .perk, .about__copy, .about__art, .cta__inner');
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        setTimeout(function () { el.classList.add('is-in'); }, Math.min(i * 60, 240));
        revealObserver.unobserve(el);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- ANO DO RODAPÉ ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
