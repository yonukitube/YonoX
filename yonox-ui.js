'use strict';

(() => {
  const $ = id => document.getElementById(id);
  let lang = 'en';
  let page = 'home';
  let displayedAccountToken = '';
  let tokenStatusKey = 'tokenHidden';

  const words = {
    en: {
      home:'Home', market:'Market', portfolio:'Portfolio', account:'Account',
      greeting:'Welcome to YonoX', summary:'Your investment overview',
      balance:'Your virtual balance', note:'Virtual currency inside YonoX',
      math:'Math Rewards', mathDesc:'Answer questions and earn virtual YNC. You have 20 daily attempts.',
      difficulty:'Difficulty', easy:'Easy — 10 YNC',
      medium:'Medium — 100 YNC', hard:'Hard — 500 YNC',
      start:'Start a question', submit:'Submit answer',
      buy:'Buy stocks', buySub:'Explore companies and buy shares',
      sell:'Sell stocks', sellSub:'Sell shares you own',
      overview:'Market overview', index:'Virtual market index',
      companies:'Companies', holdings:'Your holdings',
      accountInfo:'Account information', language:'Language',
      accountToken:'Account login token',
      accountTokenDesc:'Use this token to sign in to your YonoX account.',
      createToken:'Create / renew token',
      copyToken:'Copy token',
      tokenHidden:'The token is shown only once. If lost, create a new one.',
      tokenCreated:'Save this token safely. It will not be shown again.',
      tokenCopied:'Token copied.',
      listings:'Companies for sale', owned:'Companies you own',
      create:'Create a company',
      sellOwnership:'Sell ownership', cancelOffer:'Cancel offer',
      buyOwnership:'Buy ownership', listed:'Listed for {price} YNC',
      notListed:'Not listed for sale', seller:'Seller',
      price:'Price', noOwned:'You do not own any companies yet.',
      noListings:'No companies are currently for sale.',
      choosePrice:'Choose a price from 100 to 1000 YNC',
      invalidPrice:'Price must be between 100 and 1000 YNC.',
      confirmBuy:'Buy {name} for {price} YNC?',
      success:'Operation completed successfully.',
      homeNav:'Home', marketNav:'Market',
      portfolioNav:'Portfolio', accountNav:'Account'
    },
    ar: {
      home:'الرئيسية', market:'السوق', portfolio:'محفظتي', account:'حسابي',
      greeting:'مرحباً بك في YonoX', summary:'ملخص استثماراتك',
      balance:'رصيدك الافتراضي', note:'عملات افتراضية داخل YonoX',
      math:'مكافأة الرياضيات', mathDesc:'أجب عن الأسئلة واجمع عملات YNC. لديك 20 محاولة يوميًا.',
      difficulty:'مستوى الصعوبة', easy:'سهل — 10 YNC',
      medium:'متوسط — 100 YNC', hard:'صعب — 500 YNC',
      start:'ابدأ سؤالًا', submit:'إرسال الإجابة',
      buy:'شراء الأسهم', buySub:'استكشف الشركات واشترِ أسهماً',
      sell:'بيع الأسهم', sellSub:'اعرض أسهمك للبيع',
      overview:'نظرة على السوق', index:'مؤشر السوق الافتراضي',
      companies:'الشركات', holdings:'أسهمك',
      accountInfo:'معلومات الحساب', language:'اللغة',
      accountToken:'توكن تسجيل الدخول',
      accountTokenDesc:'استخدم هذا التوكن لتسجيل الدخول إلى حسابك في YonoX.',
      createToken:'إنشاء / تجديد التوكن',
      copyToken:'نسخ التوكن',
      tokenHidden:'يظهر التوكن مرة واحدة فقط. إذا فقدته، أنشئ توكنًا جديدًا.',
      tokenCreated:'احفظ التوكن في مكان آمن، فلن يظهر مرة أخرى.',
      tokenCopied:'تم نسخ التوكن.',
      listings:'شركات معروضة للبيع', owned:'الشركات التي تملكها',
      create:'إنشاء شركة جديدة',
      sellOwnership:'بيع ملكية الشركة', cancelOffer:'إلغاء العرض',
      buyOwnership:'شراء ملكية الشركة', listed:'معروضة بسعر {price} YNC',
      notListed:'غير معروضة للبيع', seller:'البائع',
      price:'السعر', noOwned:'لا تملك أي شركات حتى الآن.',
      noListings:'لا توجد شركات معروضة للبيع حاليًا.',
      choosePrice:'اختر سعرًا بين 100 و1000 YNC',
      invalidPrice:'يجب أن يكون السعر بين 100 و1000 YNC.',
      confirmBuy:'هل تريد شراء {name} مقابل {price} YNC؟',
      success:'تمت العملية بنجاح.',
      homeNav:'الرئيسية', marketNav:'السوق',
      portfolioNav:'محفظتي', accountNav:'حسابي'
    }
  };

  const t = key => words[lang][key] || key;

  function styles() {
    const s = document.createElement('style');
    s.textContent = `
      body{padding-bottom:75px}
      .yx-page{display:none}
      .yx-page.active{display:block}
      .yx-nav{position:fixed;z-index:1000;bottom:0;left:0;right:0;
        display:flex;justify-content:space-around;background:white;
        border-top:1px solid #e9eeeb;padding:10px 4px calc(10px + env(safe-area-inset-bottom))}
      .yx-nav button{border:0;background:none;color:#89938e;font-size:12px}
      .yx-nav button.active{color:#176b55;font-weight:bold}
      .yx-nav b{display:block;font-size:20px;margin-bottom:4px}
      .yx-language{padding:10px 16px;border:0;border-radius:10px;
        background:#edf4f0;color:#176b55;font-weight:bold}
      .yx-panel{background:white;border-radius:15px;padding:16px;margin:14px 0}
      .yx-listing{background:white;border:1px solid #e8eeeb;
        border-radius:13px;padding:14px;margin:10px 0}
      .yx-listing button{padding:10px;border:0;border-radius:9px;
        background:#176b55;color:white;margin:8px 5px 0 0}
      .yx-muted{color:#89938e;font-size:13px}
    `;
    document.head.appendChild(s);
  }

  function makePages() {
    const main = document.querySelector('main');
    if (!main || $('yx-pages')) return;

    const greeting = main.querySelector('.greeting');
    const heading = main.querySelector('h1');
    const balance = main.querySelector('.balance');
    const math = $('math-rewards');
    const actions = main.querySelector('.actions');
    const market = main.querySelector('.market');
    const first = main.querySelector('.company');
    if (!balance || !first || !market) return;

    const companySection = first.parentElement;
    const companyHeading = companySection.previousElementSibling;

    const pages = document.createElement('div');
    pages.id = 'yx-pages';

    const home = document.createElement('section');
    home.id = 'yx-home';
    home.className = 'yx-page active';

    const marketPage = document.createElement('section');
    marketPage.id = 'yx-market';
    marketPage.className = 'yx-page';

    const portfolio = document.createElement('section');
    portfolio.id = 'yx-portfolio';
    portfolio.className = 'yx-page';

    const account = document.createElement('section');
    account.id = 'yx-account';
    account.className = 'yx-page';

    [greeting, heading, balance, math, actions].forEach(el => {
      if (el) home.appendChild(el);
    });

    marketPage.innerHTML = '<h1 data-word="overview"></h1>';
    marketPage.append(market);
    if (companyHeading) marketPage.append(companyHeading);
    marketPage.append(companySection);

    portfolio.innerHTML = '<h1 data-word="holdings"></h1>';

    account.innerHTML = `
      <h1 data-word="accountInfo"></h1>
      <section class="yx-panel">
        <div id="yx-profile"></div>
        <p data-word="language"></p>
        <button id="yx-language" class="yx-language"></button>
      </section>
      <section class="yx-panel" id="yx-token-panel">
        <h2 data-word="accountToken"></h2>
        <p class="yx-muted" data-word="accountTokenDesc"></p>
        <div id="yx-token-value" style="margin:12px 0;padding:12px;background:#f2f6f3;border-radius:9px;overflow-wrap:anywhere;direction:ltr;text-align:left;user-select:text"></div>
        <p class="yx-muted" id="yx-token-message"></p>
        <button id="yx-token-action" class="yx-language"></button>
        <button id="yx-token-copy" class="yx-language" hidden></button>
      </section>
      <div id="yx-ownership"></div>`;

    pages.append(home, marketPage, portfolio, account);
    main.prepend(pages);

    const nav = document.createElement('nav');
    nav.className = 'yx-nav';
    nav.innerHTML = `
      <button data-page="home"><b>⌂</b><span></span></button>
      <button data-page="market"><b>▥</b><span></span></button>
      <button data-page="portfolio"><b>▣</b><span></span></button>
      <button data-page="account"><b>♙</b><span></span></button>`;
    document.body.appendChild(nav);

    nav.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => showPage(btn.dataset.page));
    });

    const oldNav = document.querySelector('nav.bottom');
    if (oldNav) oldNav.remove();

    const demo = main.querySelector('.demo');
    if (demo) demo.remove();

    const labels = {
      greeting:'greeting', summary:'summary',
      balance:'balance', note:'note',
      math:'math', mathDesc:'mathDesc',
      difficulty:'difficulty', start:'start', submit:'submit',
      buy:'buy', sell:'sell', index:'index', companies:'companies'
    };

    Object.entries(labels).forEach(([selector, key]) => {
      let el;
      if (selector === 'greeting') el = greeting;
      else if (selector === 'summary') el = heading;
      else if (selector === 'balance') el = balance.querySelector('.balance-label');
      else if (selector === 'note') el = balance.querySelector('.balance-note');
      else if (selector === 'math') el = math?.querySelector('div');
      else if (selector === 'mathDesc') el = math?.querySelector('p');
      else if (selector === 'difficulty') el = $('math-difficulty')?.previousElementSibling;
      else if (selector === 'start') el = $('math-start');
      else if (selector === 'submit') el = $('math-submit');
      else if (selector === 'buy') el = document.querySelector('.buy');
      else if (selector === 'sell') el = document.querySelector('.sell');
      else if (selector === 'index') el = market.querySelector('.market-top span:first-child');
      else if (selector === 'companies') el = companyHeading?.querySelector('h2');
      if (el) el.dataset.word = key;
    });

    $('math-difficulty')?.querySelectorAll('option').forEach((el, i) => {
      el.dataset.word = ['easy','medium','hard'][i];
    });

    $('math-start').dataset.word = 'start';
    $('math-submit').dataset.word = 'submit';
  }

  function showPage(name) {
    page = name;
    document.querySelectorAll('.yx-page').forEach(el => {
      el.classList.toggle('active', el.id === `yx-${name}`);
    });
    document.querySelectorAll('.yx-nav button').forEach(el => {
      el.classList.toggle('active', el.dataset.page === name);
    });

    if (name === 'portfolio') {
      const holdings = $('my-holdings');
      if (holdings && holdings.parentElement !== $('yx-portfolio')) $('yx-portfolio').append(holdings);
    }
    if (name === 'account') {
      updateAccount();
      window.yonoxOwnershipLoad?.().catch(error =>
        console.error('Ownership loading failed:', error)
      );
    }
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.yonoxTranslatePage?.(lang);

    document.querySelectorAll('[data-word]').forEach(el => {
      const key = el.dataset.word;
      if (el.tagName === 'OPTION') el.textContent = t(key);
      else if (key === 'math' || key === 'mathDesc') return;
      else if (key === 'buy' || key === 'sell') {
        const sub = key === 'buy' ? 'buySub' : 'sellSub';
        el.innerHTML = `${t(key)}<small>${t(sub)}</small>`;
      } else el.textContent = t(key);
    });

    document.querySelectorAll('.yx-nav button').forEach(el => {
      el.querySelector('b').textContent = ({home:'⌂',market:'▥',portfolio:'▣',account:'♙'})[el.dataset.page];
      el.setAttribute('aria-label', t(el.dataset.page));
      el.title = t(el.dataset.page);
      const label = el.querySelector('span');
      if (label) label.textContent = t(el.dataset.page);
    });

    $('yx-language').textContent = lang === 'en' ? 'العربية' : 'English';
    window.yonoxT = t;
    window.dispatchEvent(new Event('yonox-language-change'));
    updateTokenPanel();
  }


  function updateTokenPanel() {
    const value = $('yx-token-value');
    const message = $('yx-token-message');
    const action = $('yx-token-action');
    const copy = $('yx-token-copy');
    if (!value || !message || !action || !copy) return;
    const t = window.yonoxT || (key => key);
    value.textContent = displayedAccountToken;
    message.textContent = t(tokenStatusKey);
    action.textContent = t('createToken');
    copy.textContent = t('copyToken');
    copy.hidden = !displayedAccountToken;
  }

  function setupTokenPanel() {
    const action = $('yx-token-action');
    const copy = $('yx-token-copy');
    if (!action || !copy || action.dataset.bound) return;
    action.dataset.bound = '1';

    action.addEventListener('click', async () => {
      action.disabled = true;
      try {
        const result = await request('/account/token', { method: 'POST' });
        displayedAccountToken = result.token;
        tokenStatusKey = 'tokenCreated';
        updateTokenPanel();
      } catch (error) {
        $('yx-token-message').textContent = error.message;
      } finally {
        action.disabled = false;
      }
    });

    copy.addEventListener('click', async () => {
      if (!displayedAccountToken) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(displayedAccountToken);
        } else {
          const field = document.createElement('textarea');
          field.value = displayedAccountToken;
          document.body.appendChild(field);
          field.select();
          document.execCommand('copy');
          field.remove();
        }
        tokenStatusKey = 'tokenCopied';
        updateTokenPanel();
      } catch {
        $('yx-token-message').textContent = 'Copy failed. Copy the token manually.';
      }
    });

    window.yonoxShowAccountToken = token => {
      displayedAccountToken = String(token || '');
      tokenStatusKey = 'tokenCreated';
      updateTokenPanel();
      showPage('account');
    };
    updateTokenPanel();
  }

  function updateAccount() {
    const profile = $('yx-profile');
    if (profile && typeof user !== 'undefined' && user) {
      profile.textContent = `${user.username} · ${Number(user.balance).toFixed(2)} YNC`;
    }
  }

  function init() {
    styles();
    makePages();
    if (!$('yx-pages')) return setTimeout(init, 150);
    setupTokenPanel();
    $('yx-language').addEventListener('click', () => {
      lang = lang === 'en' ? 'ar' : 'en';
      applyLanguage();
    });
    applyLanguage();
    showPage('home');
    setInterval(updateAccount, 3000);
  }

  init();
})();
