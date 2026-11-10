'use strict';
(() => {
  const dictionaries = {
    en: {
      'السوق الافتراضي':'Virtual Market',
      'مرحباً بك في YonoX 👋':'Welcome to YonoX 👋',
      'ملخص استثماراتك':'Your investment overview',
      'رصيدك الافتراضي':'Your virtual balance',
      'هذه عملات تجريبية داخل المنصة':'Virtual currency inside YonoX',
      'مكافأة الرياضيات':'Math Rewards',
      'أجب عن الأسئلة واجمع عملات YNC الافتراضية. لديك 20 محاولة يوميًا.':'Answer questions and earn virtual YNC. You have 20 daily attempts.',
      'جارٍ تحميل المحاولات...':'Loading attempts...',
      'مستوى الصعوبة':'Difficulty',
      'سهل — 10 YNC':'Easy — 10 YNC',
      'متوسط — 100 YNC':'Medium — 100 YNC',
      'صعب — 500 YNC':'Hard — 500 YNC',
      'ابدأ سؤالًا':'Start a question',
      'إجابتك':'Your answer',
      'إرسال الإجابة':'Submit answer',
      'شراء الأسهم':'Buy stocks',
      'بيع الأسهم':'Sell stocks',
      'استكشف الشركات واشترِ أسهماً':'Explore companies and buy shares',
      'اعرض أسهمك للبيع':'Sell shares you own',
      'نظرة على السوق':'Market overview',
      'بيانات تجريبية':'Demo data',
      'مؤشر السوق الافتراضي':'Virtual market index',
      'خلال اليوم':'today',
      'أبرز الشركات':'Featured companies',
      'عرض الكل ←':'View all →',
      'الرئيسية':'Home',
      'السوق':'Market',
      'محفظتي':'Portfolio',
      'حسابي':'Account',
      'مرحبًا بك في السوق الافتراضي. أدخل اسم حسابك لإنشاء حساب جديد.':'Welcome to the virtual market. Enter an account name to create a new account.',
      'اسم الحساب':'Username',
      'إنشاء الحساب':'Create account',
      'استخدم اسمًا من 3 إلى 20 حرفًا أو رقمًا أو شرطة سفلية.':'Use 3–20 letters, numbers, or underscores.',
      'اختر الشركة':'Select company',
      'إغلاق':'Close',
      'عدد الأسهم':'Number of shares',
      'تأكيد العملية':'Confirm transaction',
      'الحساب:':'Account:',
      'تسجيل الخروج':'Log out',
      'إنشاء شركة جديدة': 'Create a company',
      'لا تمتلك أي أسهم حاليًا':'You do not own any shares yet.',
      'أسهمك':'Your shares',
      'متاح':'Available',
      'سهم':'shares',
      'شراء الأسهم':'Buy stocks',
      'بيع الأسهم':'Sell stocks',
      'تأكيد الشراء':'Confirm purchase',
      'تأكيد البيع':'Confirm sale',
      'لا توجد أسهم متاحة للشراء.':'No shares available to buy.',
      'لا تمتلك أسهمًا للبيع.':'You do not own shares to sell.',
      'اسم الشركة':'Company name',
      'رمز الشركة':'Company ticker',
      'السعر الأولي للسهم (YNC)':'Initial share price (YNC)',
      'هذه شركة افتراضية. لا يمكن تغيير رمزها بعد إنشائها.':'This is a virtual company. Its ticker cannot be changed after creation.',
      'إنشاء الشركة':'Create company',
      'تم إنشاء الشركة بنجاح.':'Company created successfully.',
      'هل تريد تسجيل الخروج من هذا الجهاز؟':'Do you want to log out from this device?',
      'جارٍ إنشاء الحساب...':'Creating account...',
      'تعذر الاتصال بالخادم. حدّث الصفحة وحاول مجددًا.':'Could not connect to the server. Refresh the page and try again.',
      'استكمال السؤال الحالي':'Continue current question',
      'انتهت محاولات اليوم':'No attempts remaining today',
      'اكتب إجابتك أولًا.':'Enter your answer first.',
      'إجابة غير صحيحة. لم تحصل على مكافأة، وتم احتساب المحاولة.':'Incorrect answer. No reward earned. The attempt was counted.',
      'الشركات':'Companies',
      'معلومات الحساب':'Account information',
      'اللغة':'Language',
      'شركات معروضة للبيع':'Companies for sale',
      'الشركات التي تملكها':'Companies you own',
      'بيع ملكية الشركة':'Sell ownership',
      'إلغاء العرض':'Cancel offer',
      'شراء ملكية الشركة':'Buy ownership',
      'غير معروضة للبيع':'Not listed for sale',
      'البائع':'Seller',
      'السعر':'Price',
      'لا تملك أي شركات حتى الآن.':'You do not own any companies yet.',
      'لا توجد شركات معروضة للبيع حاليًا.':'No companies are currently for sale.',
      'اختر سعرًا بين 100 و1000 YNC':'Choose a price between 100 and 1000 YNC',
      'يجب أن يكون السعر بين 100 و1000 YNC.':'Price must be between 100 and 1000 YNC.',
      'تمت العملية بنجاح.':'Operation completed successfully.',
      'حذف الشركة':'Delete company',
      'هل أنت متأكد أنك تريد حذف هذه الشركة نهائيًا؟':'Are you sure you want to permanently delete this company?',
      'سيتم توزيع رصيد الخزينة على المستثمرين حسب تكلفة أسهمهم المتبقية، وقد يكون التعويض جزئيًا إذا لم تكفِ الخزينة. لا يمكن التراجع عن الحذف.':'The company treasury will be distributed among investors based on the cost of their remaining shares. Compensation may be partial if the treasury is insufficient. This deletion cannot be undone.'
    },
    ar: {}
  };

  for (const [ar, en] of Object.entries(dictionaries.en))
    dictionaries.ar[en] = ar;

  dictionaries.en['إجابة صحيحة! حصلت على'] = 'Correct answer! You earned';
  dictionaries.en['الإجمالي:'] = 'Total:';
  dictionaries.en['رصيدك:'] = 'Your balance:';
  dictionaries.en['سعر السهم:'] = 'Share price:';
  dictionaries.en['المحاولات المستخدمة:'] = 'Attempts used:';
  dictionaries.en['المتبقية:'] = 'Remaining:';
  dictionaries.en['مكافآتك اليوم:'] = 'Your rewards today:';
  dictionaries.en['مقارنة بسعر التأسيس'] = 'compared with initial price';
  dictionaries.en['سهم ·'] = 'shares ·';
  dictionaries.en['مثلاً'] = 'Example:';

  for (const [ar, en] of Object.entries(dictionaries.en))
    dictionaries.ar[en] = ar;

  dictionaries.ar['from the initial price'] = 'من سعر التأسيس';
  dictionaries.ar['share'] = 'سهم';

  let language = 'en';

  function translateText(value) {
    const original = value;
    const map = dictionaries[language];
    const trimmed = value.trim();
    if (map[trimmed]) return value.replace(trimmed, map[trimmed]);

    let result = value;
    for (const [from, to] of Object.entries(map)) {
      if (from.length > 3 && result.includes(from))
        result = result.split(from).join(to);
    }

    if (language === 'en') {
      result = result
        .replace(/متاح\s+([\d,.]+)\s+سهم/g, 'Available $1 shares')
        .replace(/تملك\s+([\d,.]+)\s+سهم/g, 'You own $1 shares')
        .replace(/الإجمالي:\s*/g, 'Total: ')
        .replace(/رصيدك:\s*/g, 'Your balance: ')
        .replace(/تمت العملية بنجاح\. الإجمالي:/g, 'Transaction successful. Total:')
        .replace(/إجابة صحيحة! حصلت على\s*([\d,.]+)/g, 'Correct answer! You earned $1')
        .replace(/المحاولات المستخدمة:\s*(\d+)/g, 'Attempts used: $1')
        .replace(/المتبقية:\s*(\d+)/g, 'Remaining: $1')
        .replace(/مكافآتك اليوم:\s*/g, 'Your rewards today: ');
    } else {
      result = result
        .replace(/Available\s+([\d,.]+)\s+shares/g, 'متاح $1 سهم')
        .replace(/You own\s+([\d,.]+)\s+shares/g, 'تملك $1 سهم')
        .replace(/Total:\s*/g, 'الإجمالي: ')
        .replace(/Your balance:\s*/g, 'رصيدك: ')
        .replace(/Correct answer! You earned\s*([\d,.]+)/g, 'إجابة صحيحة! حصلت على $1')
        .replace(/Attempts used:\s*(\d+)/g, 'المحاولات المستخدمة: $1')
        .replace(/Remaining:\s*(\d+)/g, 'المتبقية: $1')
        .replace(/Your rewards today:\s*/g, 'مكافآتك اليوم: ');
    }
    return result;
  }


  // Translate native browser dialogs as well as page content.
  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);

  window.alert = message => nativeAlert(translateText(String(message ?? '')));
  window.confirm = message => nativeConfirm(translateText(String(message ?? '')));
  window.prompt = (message, value) =>
    nativePrompt(translateText(String(message ?? '')),
      value == null ? value : translateText(String(value)));

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      const parent = root.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA)$/i.test(parent.tagName)) return;
      const next = translateText(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && /^(SCRIPT|STYLE)$/i.test(root.tagName)) return;

    if (root.nodeType === 1) {
      for (const attr of ['placeholder','title','aria-label']) {
        if (root.hasAttribute(attr)) {
          const old = root.getAttribute(attr);
          const next = translateText(old);
          if (next !== old) root.setAttribute(attr, next);
        }
      }
    }
    for (const child of root.childNodes) walk(child);
  }

  window.yonoxTranslatePage = next => {
    language = next === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar' ? 'YonoX - السوق الافتراضي' : 'YonoX - Virtual Market';
    walk(document.body);
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') walk(record.target);
      else record.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.documentElement, {
    subtree:true, childList:true, characterData:true
  });
})();
