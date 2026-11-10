'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const translations = {
    owned: ['الشركات التي تملكها', 'Companies you own'],
    listings: ['شركات معروضة للبيع', 'Companies for sale'],
    cancelOffer: ['إلغاء العرض', 'Cancel offer'],
    sellOwnership: ['بيع ملكية الشركة', 'Sell ownership'],
    choosePrice: ['اختر سعرًا بين 100 و1000 YNC', 'Choose a price between 100 and 1000 YNC'],
    invalidPrice: ['يجب أن يكون السعر بين 100 و1000 YNC.', 'Price must be between 100 and 1000 YNC.'],
    listed: ['معروضة للبيع بسعر {price} YNC', 'Listed for {price} YNC'],
    notListed: ['غير معروضة للبيع', 'Not listed for sale'],
    seller: ['البائع', 'Seller'],
    price: ['السعر', 'Price'],
    buyOwnership: ['شراء ملكية الشركة', 'Buy ownership'],
    confirmBuy: ['هل تريد شراء {name} مقابل {price} YNC؟', 'Buy {name} for {price} YNC?'],
    success: ['تمت العملية بنجاح.', 'Operation completed successfully.'],
    noOwned: ['لا تملك أي شركات حتى الآن.', 'You do not own any companies yet.'],
    noListings: ['لا توجد شركات معروضة للبيع حاليًا.', 'No companies are currently for sale.'],
    deleteCompany: ['حذف الشركة', 'Delete company'],
    confirmDeleteCompany: ['هل أنت متأكد أنك تريد حذف هذه الشركة نهائيًا؟', 'Are you sure you want to permanently delete this company?'],
    deleteCompanyWarning: ['سيتم توزيع رصيد الخزينة على المستثمرين حسب تكلفة أسهمهم المتبقية، وقد يكون التعويض جزئيًا إذا لم تكفِ الخزينة. لا يمكن التراجع عن الحذف.', 'The treasury will be distributed among investors based on the cost of their remaining shares. Compensation may be partial if the treasury is insufficient. This cannot be undone.']
  };

  const t = (key, values = {}) => {
    const language = document.documentElement.lang === 'ar' ? 0 : 1;
    let value = translations[key]?.[language] || key;
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll('{' + name + '}', String(replacement));
    }
    return value;
  };

  const api = async (path, body) => {
    const response = await fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? {'Content-Type':'application/json'} : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  };

  const section = (title, id) => {
    let el = $(id);
    if (!el) {
      el = document.createElement('section');
      el.id = id;
      el.className = 'yx-panel';
      el.innerHTML = `<h2>${title}</h2><div class="yx-items"></div>`;
    }
    return el;
  };

  function card(item, details, actions) {
    const el = document.createElement('article');
    el.className = 'yx-listing';
    const title = document.createElement('strong');
    title.textContent = `${item.name} (${item.ticker})`;
    const info = document.createElement('p');
    info.className = 'yx-muted';
    info.textContent = details;
    el.append(title, info);
    actions.forEach(([label, callback]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', callback);
      el.append(btn);
    });
    return el;
  }

  async function load() {
    const account = $('yx-ownership') || $('yx-account');
    if (!account) throw new Error('Account section was not found.');

    function prepare(id, title) {
      let el = $(id);
      if (!el) {
        el = document.createElement('section');
        el.id = id;
        el.className = 'yx-panel';
        el.innerHTML = '<h2></h2><div class="yx-items"></div>';
      }
      const heading = el.querySelector('h2');
      if (heading) heading.textContent = title;
      let items = el.querySelector('.yx-items');
      if (!items) {
        items = document.createElement('div');
        items.className = 'yx-items';
        el.append(items);
      }
      if (!account.contains(el)) account.append(el);
      return {el, items};
    }

    const mine = prepare('yx-owned', t('owned'));
    const listings = prepare('yx-for-sale', t('listings'));

    mine.items.replaceChildren();
    listings.items.replaceChildren();

    try {
      const [mineData, marketData] = await Promise.all([
        api('companies/mine'),
        api('company-listings')
      ]);

      (mineData.companies || []).forEach(c => {
        const actions = [];
        if (c.listing_id) {
          actions.push([t('cancelOffer'), async () => {
            await run('company-listings/cancel', {listingId:c.listing_id});
          }]);
        } else {
          actions.push([t('sellOwnership'), async () => {
            const value = prompt(t('choosePrice'));
            if (value === null) return;
            const price = Number(value);
            if (!Number.isFinite(price) || price < 100 || price > 1000) {
              alert(t('invalidPrice'));
              return;
            }
            await run('company-listings/create', {
              companyId:c.id, askingPrice:price
            });
          }]);
        }

        actions.push([t('deleteCompany'), async () => {
          const message = t('confirmDeleteCompany') + '\n' + c.name +
            '\n\n' + t('deleteCompanyWarning');
          if (!confirm(message)) return;
          await run('companies/delete', {companyId:c.id});
        }]);

        mine.items.append(card(
          c,
          c.listing_id ? t('listed', {price:c.asking_price}) : t('notListed'),
          actions
        ));
      });

      (marketData.listings || []).forEach(l => {
        listings.items.append(card(
          l,
          `${t('seller')}: ${l.seller_username} · ${t('price')}: ${l.asking_price} YNC`,
          [[t('buyOwnership'), async () => {
            if (!confirm(t('confirmBuy', {name:l.name, price:l.asking_price}))) return;
            await run('company-listings/buy', {listingId:l.listing_id});
          }]]
        ));
      });

      if (!mine.items.children.length)
        mine.items.textContent = t('noOwned');
      if (!listings.items.children.length)
        listings.items.textContent = t('noListings');

    } catch (error) {
      mine.items.textContent = 'Loading error: ' + error.message;
      listings.items.textContent = 'Could not load company listings.';
      throw error;
    }
  }

  async function run(path, body) {
    try {
      await api(path, body);
      await load();
      alert(t('success'));
    } catch (error) {
      alert(error.message);
    }
  }

  window.yonoxOwnershipLoad = load;
  window.addEventListener('yonox-language-change', () => {
    load().catch(error => console.error('Ownership:', error));
  });
})();
