require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const USD_RATE = 160;

const PACKAGE_INFO = {
  luster: {
    en: {
      name: 'GILD Luster (The Foundation)',
      services: [
        'Brand Architecture: Comprehensive visual identity setup including custom logo design, premium color palette, typography selection, and brand naming.',
        'Digital Authority Setup: High-end optimization and setup of Facebook, Instagram, and TikTok profiles to reflect absolute prestige.',
        'Strategic Content Design: 12 visually striking, high-quality graphic posts and 2 engaging short-form videos (Reels/Shorts) per month.',
        'Corporate Stationery: Elegant design suite for business cards, letterheads, and professional email signatures.',
        'Community Engagement: Proactive and professional management of audience interactions, comments, and direct messages (DMs).',
        'Growth Consultation: A dedicated monthly strategy session to review digital performance and align future objectives.'
      ],
      pricesETB: { '1': 20000, '2': 35000, '3': 50000 }
    },
    am: {
      name: 'GILD Luster (The Foundation)',
      services: [
        'Brand Architecture: የብራንድ አወቃቀር፣ ኩላሊት ያለው የሎጎ ንድፍ፣ የቀለም ስብስብ፣ የፎንት ምርጫ እና የብራንድ ስም መስጠት።',
        'Digital Authority Setup: የFacebook, Instagram, TikTok ፕሮፋይሎችን በላቀ ሁኔታ ማዘጋጀት።',
        'Strategic Content Design: በወር 12 ፕሮፌሽናል ፖስቶች እና 2 short-form ቪዲዮዎች።',
        'Corporate Stationery: የቢዝነስ ካርድ፣ letterhead እና professional email signature ንድፍ።',
        'Community Engagement: ኮመንት እና DM ማስተዳደር።',
        'Growth Consultation: የወርሃዊ ስትራቴጂ ስብሰባ።'
      ],
      pricesETB: { '1': 20000, '2': 35000, '3': 50000 }
    }
  },
  radiant: {
    en: {
      name: 'GILD Radiant (The Growth Accelerator)',
      services: [
        'Conversion Copywriting: Psychological and persuasive content creation designed to turn spectators into loyal clients.',
        'Advertising Mastery: Management of 5 targeted ad campaigns engineered for maximum ROI and lead generation.',
        'The GILD Landing Page: A luxury, high-conversion single-page website designed to showcase and sell your primary offer.',
        'Local Search Dominance: Optimization of Google Maps and Search Engine Presence (SEO) to ensure you are the first choice.',
        'Creative Dominance: 20+ custom posts and stories per month, plus one professional product or service photoshoot session.',
        'Performance Intelligence: Comprehensive monthly reports detailing sales funnel performance and ad metrics.'
      ],
      pricesETB: { '1': 35000, '2': 65000, '3': 90000 }
    },
    am: {
      name: 'GILD Radiant (The Growth Accelerator)',
      services: [
        'Conversion Copywriting: ሰዎችን ወደ ደንበኛ የሚቀይር የማሳመኛ ጽሁፍ አዘጋጅት።',
        'Advertising Mastery: 5 የታለሙ የማስታወቂያ ዘመቻዎች አስተዳደር።',
        'The GILD Landing Page: የቅንጦት እና ከፍተኛ ሽያጭ የሚያመጣ አንድ ገጽ ድህረ ገጽ።',
        'Local Search Dominance: Google Maps እና SEO ማሻሻል።',
        'Creative Dominance: በወር 20+ ፖስቶች እና ስቶሪዎች፣ እንዲሁም አንድ ፕሮፌሽናል ፎቶ ስራ።',
        'Performance Intelligence: የወርሃዊ ሪፖርት።'
      ],
      pricesETB: { '1': 35000, '2': 65000, '3': 90000 }
    }
  },
  '24k': {
    en: {
      name: 'GILD 24K (The Empire Builder)',
      services: [
        'Omnichannel Mastery: Daily high-impact posting and full management across all major social media platforms.',
        'Cinematic Storytelling: 4 commercial-grade, cinematic brand videos that define your industry authority.',
        'AI-Powered 24/7 Support: Development of a smart AI bot for Telegram/Messenger to automate inquiries and sales leads.',
        'Sales Ecosystem: Full sales funnel construction, Pixel integration, and advanced retargeting strategies.',
        'SOP Development: Creation of detailed Standard Operating Procedures for your internal workflow, ensuring business continuity without your constant presence.',
        'Digital PR & Authority: Strategic placements and mentions to build high-level brand prestige.',
        'VIP Concierge: 24/7 direct access and priority support for all urgent business needs.'
      ],
      pricesETB: { '1': 70000, '2': 130000, '3': 205000 }
    },
    am: {
      name: 'GILD 24K (The Empire Builder)',
      services: [
        'Omnichannel Mastery: በየቀኑ ከፍተኛ ተፅዕኖ ያለው ፖስቲንግ እና ሙሉ ማስተዳደር።',
        'Cinematic Storytelling: 4 የሲኒማ ደረጃ ብራንድ ቪዲዮዎች።',
        'AI-Powered 24/7 Support: ለTelegram/Messenger ስማርት AI bot ልማት።',
        'Sales Ecosystem: ሙሉ sales funnel, pixel integration እና retargeting።',
        'SOP Development: የውስጥ ስራ አሰራር ሰነድ ዝግጅት።',
        'Digital PR & Authority: ብራንድን ለማሳደግ ስትራቴጂክ መታየቶች።',
        'VIP Concierge: 24/7 ፈጣን ድጋፍ።'
      ],
      pricesETB: { '1': 70000, '2': 130000, '3': 205000 }
    }
  }
};

const INDIVIDUAL_SERVICES = {
  en: [
    { key: 'brand_identity', name: 'Full Brand Identity (Logo + Brand Book)', price: '7,000 - 10,000 ETB' },
    { key: 'landing_page', name: 'Landing Page Website (1 Page)', price: '10,000 - 15,000 ETB (Hosting separate)' },
    { key: 'full_website', name: 'Full Business Website (Multi-page)', price: '30,000 - 60,000+ ETB' },
    { key: 'telegram_bot', name: 'Smart Telegram Bot (AI Integrated)', price: '15,000 - 25,000 ETB' },
    { key: 'logo_only', name: 'Logo Only', price: '5,000 ETB' },
    { key: 'seo_only', name: 'SEO Only', price: 'Market price, slightly discounted' },
    { key: 'strategy', name: 'Strategy Consultation Only', price: 'Custom quote' },
    { key: 'business_card', name: 'Business Card Design', price: '2,000 ETB' }
  ],
  am: [
    { key: 'brand_identity', name: 'Full Brand Identity (Logo + Brand Book)', price: '7,000 - 10,000 ETB' },
    { key: 'landing_page', name: 'Landing Page Website (1 Page)', price: '10,000 - 15,000 ETB (Hosting በተናጠል)' },
    { key: 'full_website', name: 'Full Business Website (ባለብዙ ገጽ)', price: '30,000 - 60,000+ ETB' },
    { key: 'telegram_bot', name: 'Smart Telegram Bot (AI Integrated)', price: '15,000 - 25,000 ETB' },
    { key: 'logo_only', name: 'Logo Only', price: '5,000 ETB' },
    { key: 'seo_only', name: 'SEO Only', price: 'ገበያዊ ዋጋ ላይ ትንሽ ቅናሽ' },
    { key: 'strategy', name: 'Strategy Consultation Only', price: 'Custom quote' },
    { key: 'business_card', name: 'Business Card Design', price: '2,000 ETB' }
  ]
};

const FAQ_EN = [
  ['Does GILD only work with Ethiopian clients?', 'No. While our heart is in Addis Ababa, our standards are international. We serve clients globally, bridging the gap between local insight and world-class execution.'],
  ['Can you help a business starting from zero?', 'Absolutely. We specialize in building strong foundations. We ensure that your brand starts with a 24K identity, saving you from expensive rebrands later.'],
  ['Do you offer consultation only?', 'Yes. We provide high-level strategic consulting for brands that need direction before execution.'],
  ['Personal Branding: Who do you help?', 'We build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity and a strategic voice that commands respect.'],
  ['What makes GILD different from other agencies?', 'Most agencies focus on "posting." We focus on "Gilding"—a mix of luxury aesthetics, data-driven strategy, and 24/7 automation.'],
  ['How do we get started?', 'It begins with filling out our Onboarding Form, followed by a discovery call to align our visions.']
];

const FAQ_AM = [
  ['GILD የሚሰራው ከኢትዮጵያ ደንበኞች ብቻ ነው?', 'አይ። ዋናው አቀማመጣችን Addis Ababa ቢሆንም ደረጃችን ዓለም አቀፍ ነው።'],
  ['ከዜሮ የጀመረ ቢዝነስ ሊረዱ ይችላሉ?', 'በፍጹም። ጠንካራ መሠረት መገንባት ላይ እንሰራለን።'],
  ['Consultation only ይሰጣሉ?', 'አዎ። ከመፈጸም በፊት ከፍተኛ ስትራቴጂካዊ ምክር እንሰጣለን።'],
  ['Personal branding ማንን ይረዳል?', 'CEOs, Doctors, Consultants የመሳሰሉ ባለሙያዎችን እንረዳለን።'],
  ['GILD ከሌሎች ኤጀንሲዎች ምን ያህል ይለያል?', 'እኛ ብቻ መፖስት አንደርግም፤ እኛ "Gilding" እንሰራለን።'],
  ['እንዴት እንጀምራለን?', 'Onboarding Form በመሙላት እንጀምራለን።']
];

const STORY_AM = `GILD STORY

"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡"

በጥንታዊው ዘመን፣ አልኬሚ የሚባል ምስጢራዊ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ምኞት ተራ ብረቶችን ወደ ወርቅ መቀየር ነበር፡፡ ይህ ሂደት የነገሮችን ውጫዊ ገፅታ ብቻ ሳይሆን ውስጣዊ እሴታቸውን ማውጣት ነው፡፡

በዛሬው ዲጂታል ዓለም፣ የቢዝነስዎ ድንቅ እሴት በጫጫታ ውስጥ ሊጠፋ ይችላል። እኛ በ GILD እንደ ዘመኑ አልኬሚስቶች ነን። የእኛ ስራ መገፈፍ፣ መቅረጽ እና መለበጥ ነው።

GILD Marketing Agency
Where Vision Meets Alchemy.`;

const VISION_MISSION_AM = `Gild Marketing Agency
Where Vision Meets Alchemy

ራዕይ (Our Vision)
"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።"

ተልዕኮ (Our Mission)
"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)።"`;

function getLang(ctx) {
  return ctx.session.lang || 'en';
}
function t(ctx, en, am) {
  return getLang(ctx) === 'am' ? am : en;
}
function currencyLabel(currency) {
  return currency === 'USD' ? 'USD' : 'ETB';
}
function convertPrice(etb, currency) {
  return currency === 'USD' ? `$${(etb / USD_RATE).toFixed(2)}` : `${etb.toLocaleString()} ETB`;
}
function getProfileState(ctx) {
  if (!ctx.session.form) ctx.session.form = {};
  return ctx.session.form;
}
function hasFormComplete(form) {
  return form.fullName && form.phone && form.address && form.brandName && form.businessType;
}

function mainMenu(ctx) {
  const lang = getLang(ctx);
  const form = getProfileState(ctx);
  const myFormLabel = hasFormComplete(form) ? (lang === 'am' ? 'My Form' : 'My Form') : (lang === 'am' ? 'Form ሙሉ' : 'Fill Form');

  return Markup.inlineKeyboard([
    [Markup.button.callback(myFormLabel, 'my_form')],
    [Markup.button.callback(lang === 'am' ? 'Service' : 'Service', 'service_menu')],
    [Markup.button.callback(lang === 'am' ? 'More...' : 'More...', 'more_menu')]
  ]);
}

function languageMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('አማርኛ', 'lang_am')],
    [Markup.button.callback('English', 'lang_en')]
  ]);
}

function serviceMenu(ctx) {
  const lang = getLang(ctx);
  return Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'am' ? 'Package' : 'Package', 'package_menu')],
    [Markup.button.callback(lang === 'am' ? 'Individuals service' : 'Individuals service', 'individual_menu')],
    [Markup.button.callback('Back', 'back_main')]
  ]);
}

function packageMenu(ctx) {
  const lang = getLang(ctx);
  return Markup.inlineKeyboard([
    [Markup.button.callback('GILD Luster (The Foundation)', 'pkg_luster')],
    [Markup.button.callback('GILD Radiant (The Growth Accelerator)', 'pkg_radiant')],
    [Markup.button.callback('GILD 24K (The Empire Builder)', 'pkg_24k')],
    [Markup.button.callback('Back', 'service_menu')]
  ]);
}

function packageDurationMenu(pkgKey) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1 Month', `pkg_dur_${pkgKey}_1`)],
    [Markup.button.callback('2 Months', `pkg_dur_${pkgKey}_2`)],
    [Markup.button.callback('3 Months', `pkg_dur_${pkgKey}_3`)],
    [Markup.button.callback('Back', 'package_menu')]
  ]);
}

function currencyMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('ETB', 'currency_etb')],
    [Markup.button.callback('USD', 'currency_usd')],
    [Markup.button.callback('Back', 'back_main')]
  ]);
}

function individualMenu(ctx) {
  const lang = getLang(ctx);
  const items = INDIVIDUAL_SERVICES[lang];
  const rows = items.map(item => [Markup.button.callback(`${item.name}`, `ind_${item.key}`)]);
  rows.push([Markup.button.callback('Back', 'service_menu')]);
  return Markup.inlineKeyboard(rows);
}

function moreMenu(ctx) {
  const lang = getLang(ctx);
  return Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'am' ? 'About us' : 'About us', 'about_us')],
    [Markup.button.callback(lang === 'am' ? 'Contact us' : 'Contact us', 'contact_us')],
    [Markup.button.callback('FAQ', 'faq_menu')],
    [Markup.button.callback(lang === 'am' ? 'Story' : 'Story', 'story_page')],
    [Markup.button.callback(lang === 'am' ? 'Vision & Mission' : 'Vision & Mission', 'vision_mission')],
    [Markup.button.callback('Back', 'back_main')]
  ]);
}

function faqMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('FAQ 1', 'faq_1')],
    [Markup.button.callback('FAQ 2', 'faq_2')],
    [Markup.button.callback('FAQ 3', 'faq_3')],
    [Markup.button.callback('FAQ 4', 'faq_4')],
    [Markup.button.callback('FAQ 5', 'faq_5')],
    [Markup.button.callback('FAQ 6', 'faq_6')],
    [Markup.button.callback('Back', 'more_menu')]
  ]);
}

function formDataText(form, lang) {
  return lang === 'am'
    ? `የተሞላ ፎርም

FULL NAME: ${form.fullName}
ስልክ ቁጥር: ${form.phone}
አድራሻ: ${form.address}
Brand Name: ${form.brandName}
Business Type: ${form.businessType}`
    : `Filled Form

FULL NAME: ${form.fullName}
Phone: ${form.phone}
Address: ${form.address}
Brand Name: ${form.brandName}
Business Type: ${form.businessType}`;
}

bot.use(session());

bot.start(async (ctx) => {
  ctx.session.step = null;
  await ctx.reply('Language ምረጥ / Choose language', languageMenu());
});

bot.action('lang_am', async (ctx) => {
  ctx.session.lang = 'am';
  await ctx.answerCbQuery();
  await ctx.reply('አማርኛ ተመርጧል', mainMenu(ctx));
});

bot.action('lang_en', async (ctx) => {
  ctx.session.lang = 'en';
  await ctx.answerCbQuery();
  await ctx.reply('English selected', mainMenu(ctx));
});

bot.action('back_main', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, 'Main menu', 'ዋና ሜኑ'), mainMenu(ctx));
});

bot.action('service_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, 'Service menu', 'Service ሜኑ'), serviceMenu(ctx));
});

bot.action('package_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, 'Choose a package', 'Package ምረጥ'), packageMenu(ctx));
});

bot.action('individual_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, 'Choose an individual service', 'Individual service ምረጥ'), individualMenu(ctx));
});

bot.action('more_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, 'More options', 'ተጨማሪ ምርጫዎች'), moreMenu(ctx));
});

bot.action('my_form', async (ctx) => {
  const form = getProfileState(ctx);
  await ctx.answerCbQuery();
  if (hasFormComplete(form)) {
    await ctx.reply(formDataText(form, getLang(ctx)), Markup.inlineKeyboard([
      [Markup.button.callback('Edit Form', 'edit_form')],
      [Markup.button.callback('Back', 'back_main')]
    ]));
  } else {
    ctx.session.step = 'fullName';
    await ctx.reply(
      'FULL NAME እንዲህ ብለህ ጻፍ:
Example: John Michael Doe',
      Markup.inlineKeyboard([[Markup.button.callback('Back', 'back_main')]])
    );
  }
});

bot.action('edit_form', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.step = 'fullName';
  await ctx.reply('FULL NAME አዲስ በመጻፍ አድስ፣ Example: John Michael Doe');
});

bot.action('currency_etb', async (ctx) => {
  ctx.session.currency = 'ETB';
  await ctx.answerCbQuery();
  await ctx.reply('Currency: ETB', Markup.inlineKeyboard([[Markup.button.callback('Back', 'back_main')]]));
});

bot.action('currency_usd', async (ctx) => {
  ctx.session.currency = 'USD';
  await ctx.answerCbQuery();
  await ctx.reply('Currency: USD', Markup.inlineKeyboard([[Markup.button.callback('Back', 'back_main')]]));
});

['pkg_luster', 'pkg_radiant', 'pkg_24k'].forEach(pkgKey => {
  bot.action(pkgKey, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    const pkg = PACKAGE_INFO[pkgKey === 'pkg_24k' ? '24k' : pkgKey.replace('pkg_', '')][lang];
    const text = `${pkg.name}

${pkg.services.map(s => `• ${s}`).join('

')}

Select duration and price will be shown.`;
    await ctx.reply(text, packageDurationMenu(pkgKey));
  });
});

['pkg_dur_pkg_luster_1','pkg_dur_pkg_luster_2','pkg_dur_pkg_luster_3','pkg_dur_pkg_radiant_1','pkg_dur_pkg_radiant_2','pkg_dur_pkg_radiant_3','pkg_dur_pkg_24k_1','pkg_dur_pkg_24k_2','pkg_dur_pkg_24k_3'].forEach(() => {});

bot.action(/pkg_dur_(pkg_luster|pkg_radiant|pkg_24k)_(1|2|3)/, async (ctx) => {
  await ctx.answerCbQuery();
  const [, pkgKey, duration] = ctx.match;
  const key = pkgKey === 'pkg_24k' ? '24k' : pkgKey.replace('pkg_', '');
  const lang = getLang(ctx);
  const currency = ctx.session.currency || 'ETB';
  const pkg = PACKAGE_INFO[key][lang];
  const etb = pkg.pricesETB[duration];
  const amount = convertPrice(etb, currency);
  await ctx.reply(
    `${pkg.name}
Duration: ${duration} Month(s)
Price: ${amount}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Pay', `pay_${pkgKey}_${duration}`)],
      [Markup.button.callback('Currency', 'currency_menu')],
      [Markup.button.callback('Back', 'package_menu')]
    ])
  );
});

bot.action('currency_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Choose currency', currencyMenu());
});

bot.action(/^pay_(pkg_luster|pkg_radiant|pkg_24k)_(1|2|3)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const [, pkgKey, duration] = ctx.match;
  const key = pkgKey === 'pkg_24k' ? '24k' : pkgKey.replace('pkg_', '');
  const lang = getLang(ctx);
  const currency = ctx.session.currency || 'ETB';
  const pkg = PACKAGE_INFO[key][lang];
  const etb = pkg.pricesETB[duration];
  const amount = convertPrice(etb, currency);
  await ctx.reply(`Payment request for:
${pkg.name}
Duration: ${duration} month(s)
Amount: ${amount}

Send payment proof after transfer.`, Markup.inlineKeyboard([[Markup.button.callback('Back', 'package_menu')]]));
});

bot.action(/^ind_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = getLang(ctx);
  const key = ctx.match[1];
  const item = INDIVIDUAL_SERVICES[lang].find(x => x.key === key);
  if (!item) return ctx.reply('Not found');
  await ctx.reply(`${item.name}

Price: ${item.price}

Type / or press pay when ready.`, Markup.inlineKeyboard([
    [Markup.button.callback('Pay', `indpay_${key}`)],
    [Markup.button.callback('Back', 'individual_menu')]
  ]));
});

bot.action(/^indpay_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = getLang(ctx);
  const key = ctx.match[1];
  const item = INDIVIDUAL_SERVICES[lang].find(x => x.key === key);
  if (!item) return ctx.reply('Not found');
  await ctx.reply(`Order request for:
${item.name}

Price: ${item.price}

Please send your details and requirements.`);
});

bot.action('about_us', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, `About us

At GILD, we believe that every established business has a hidden gold...`, `About us

At GILD, we believe that every established business has a hidden gold...`), moreMenu(ctx));
});

bot.action('story_page', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(STORY_AM, moreMenu(ctx));
});

bot.action('vision_mission', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(VISION_MISSION_AM, moreMenu(ctx));
});

bot.action('contact_us', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `Contact us

Email: your-email@example.com
Telegram: @yourtelegram
Phone: +251xxxxxxxxx`,
    moreMenu(ctx)
  );
});

bot.action('faq_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('FAQ', faqMenu());
});

for (let i = 1; i <= 6; i++) {
  bot.action(`faq_${i}`, async (ctx) => {
    await ctx.answerCbQuery();
    const [q, a] = getLang(ctx) === 'am' ? FAQ_AM[i - 1] : FAQ_EN[i - 1];
    await ctx.reply(`Q: ${q}

A: ${a}`, faqMenu());
  });
}

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const form = getProfileState(ctx);
  const step = ctx.session.step;

  if (step === 'fullName') {
    form.fullName = text;
    ctx.session.step = 'phone';
    return ctx.reply('Phone number አስገባ:
Example: +251911234567');
  }

  if (step === 'phone') {
    form.phone = text;
    ctx.session.step = 'address';
    return ctx.reply('Address አስገባ:
Example: Addis Ababa, Bole');
  }

  if (step === 'address') {
    form.address = text;
    ctx.session.step = 'brandName';
    return ctx.reply('Brand Name አስገባ:
Example: GILD Marketing Agency');
  }

  if (step === 'brandName') {
    form.brandName = text;
    ctx.session.step = 'businessType';
    return ctx.reply(
      'What do you need? Choose one or write your own:
• Company
• Personal Brand
• Business Website
• Logo
• SEO
• Strategy',
      Markup.inlineKeyboard([
        [Markup.button.callback('Company', 'bt_company')],
        [Markup.button.callback('Personal Brand', 'bt_personal_brand')],
        [Markup.button.callback('Business Website', 'bt_business_website')],
        [Markup.button.callback('Logo', 'bt_logo')],
        [Markup.button.callback('SEO', 'bt_seo')],
        [Markup.button.callback('Strategy', 'bt_strategy')],
        [Markup.button.callback('Other', 'bt_other')],
        [Markup.button.callback('Back', 'back_main')]
      ])
    );
  }

  if (step === 'businessType') {
    form.businessType = text;
    ctx.session.step = null;
    return ctx.reply(
      'Form saved successfully.',
      Markup.inlineKeyboard([
        [Markup.button.callback('My Form', 'my_form')],
        [Markup.button.callback('Back', 'back_main')]
      ])
    );
  }

  return ctx.reply('Use the buttons below.', mainMenu(ctx));
});

['bt_company', 'bt_personal_brand', 'bt_business_website', 'bt_logo', 'bt_seo', 'bt_strategy', 'bt_other'].forEach(action => {
  bot.action(action, async (ctx) => {
    await ctx.answerCbQuery();
    const map = {
      bt_company: 'Company',
      bt_personal_brand: 'Personal Brand',
      bt_business_website: 'Business Website',
      bt_logo: 'Logo',
      bt_seo: 'SEO',
      bt_strategy: 'Strategy',
      bt_other: 'Other'
    };
    getProfileState(ctx).businessType = map[action];
    ctx.session.step = null;
    await ctx.reply(
      `Business type saved: ${map[action]}

Form completed.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('My Form', 'my_form')],
        [Markup.button.callback('Back', 'back_main')]
      ])
    );
  });
});

bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
