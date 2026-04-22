‎const TelegramBot = require('node-telegram-bot-api');

‎// Firebase Setup
‎const serviceAccount = require("./firebase-key.json");
‎if (!admin.apps.length) {
‎  admin.initializeApp({
‎    credential: admin.credential.cert(serviceAccount),
‎    databaseURL: "https://gild-agency-db-default-rtdb.firebaseio.com/"
‎  });
‎}
‎const db = admin.database();
‎const token = process.env.BOT_TOKEN; 
‎const bot = new TelegramBot(token, {polling: true});
‎
‎const ETB_TO_USD = 160;
‎
‎// Bot Menu Commands
‎bot.setMyCommands([
‎  { command: '/start', description: 'Start the GILD Bot' },
‎  { command: '/settings', description: 'Change Language & Currency' }
‎]);
‎
‎// ------------------- COMMANDS -------------------
‎bot.onText(/\/start/, (msg) => {
‎  const opts = {
‎    reply_markup: {
‎      inline_keyboard: [
‎        [{ text: "አማርኛ 🇪🇹", callback_data: 'lang_am' }, { text: "English 🇺🇸", callback_data: 'lang_en' }]
‎      ]
‎    }
‎  };
‎  bot.sendMessage(msg.chat.id, "Welcome to GILD Agency. Select your language / ቋንቋ ይምረጡ።", opts);
‎});
‎
‎bot.onText(/\/settings/, (msg) => {
‎  const opts = {
‎    reply_markup: {
‎      inline_keyboard: [
‎        [{ text: "Language / ቋንቋ", callback_data: 'settings_lang' }],
‎        [{ text: "Currency / የገንዘብ አይነት", callback_data: 'settings_currency' }]
‎      ]
‎    }
‎  };
‎  bot.sendMessage(msg.chat.id, "⚙️ Settings / ማስተካከያዎች", opts);
‎});
‎
‎// ------------------- CALLBACKS (EDIT MESSAGE STYLE) -------------------
‎bot.on('callback_query', async (callbackQuery) => {
‎  const msg = callbackQuery.message;
‎  const data = callbackQuery.data;
‎  const chatId = msg.chat.id;
‎  const messageId = msg.message_id;
‎
‎  // Helper to Edit Message
‎  const editMsg = (text, inlineKeyboard) => {
‎    bot.editMessageText(text, {
‎      chat_id: chatId,
‎      message_id: messageId,
‎      parse_mode: 'Markdown',
‎      reply_markup: { inline_keyboard: inlineKeyboard }
‎    }).catch(err => console.log(err));
‎  };
‎
‎  // Get user settings from DB
‎  const userRef = db.ref(`users/${chatId}/settings`);
‎  const snapshot = await userRef.once('value');
‎  const settings = snapshot.val() || { lang: 'en', curr: 'ETB' };
‎
‎  // --- LANGUAGE & CURRENCY SETTINGS ---
‎  if (data === 'lang_am' || data === 'lang_en') {
‎    const isAm = data === 'lang_am';
‎    await userRef.update({ lang: isAm ? 'am' : 'en' });
‎    const welcomeMsg = isAm ? "እንኳን ወደ GILD በሰላም መጡ። የወርቅ ማንነትዎን ለመገንባት ዝግጁ ነን።" : "Welcome to GILD. We are ready to forge your golden identity.";
‎    editMsg(welcomeMsg, [
‎      [{ text: isAm ? "የእኔ ፎርም (My Form)" : "My Form", callback_data: 'my_form' }],
‎      [{ text: isAm ? "አገልግሎቶች (Services)" : "Services", callback_data: 'services' }],
‎      [{ text: isAm ? "ተጨማሪ (More...)" : "More...", callback_data: 'more' }]
‎    ]);
‎  }
‎
‎  if (data === 'settings_lang') {
‎    editMsg("Select Language / ቋንቋ ይምረጡ:", [
‎      [{ text: "አማርኛ 🇪🇹", callback_data: 'lang_am' }, { text: "English 🇺🇸", callback_data: 'lang_en' }]
‎    ]);
‎  }
‎
‎  if (data === 'settings_currency') {
‎    editMsg("Select your preferred currency:", [
‎      [{ text: "Ethiopian Birr (ETB)", callback_data: 'curr_etb' }],
‎      [{ text: "US Dollar (USD)", callback_data: 'curr_usd' }]
‎    ]);
‎  }
‎
‎  if (data === 'curr_etb' || data === 'curr_usd') {
‎    await userRef.update({ curr: data === 'curr_etb' ? 'ETB' : 'USD' });
‎    editMsg("✅ Currency updated successfully! \n\nGo back to Main Menu:", [
‎      [{ text: "⬅️ Main Menu", callback_data: settings.lang === 'am' ? 'lang_am' : 'lang_en' }]
‎    ]);
‎  }
‎
‎  // Helper for pricing
‎  const formatPrice = (etbAmount) => {
‎    return settings.curr === 'USD' ? `$${(etbAmount / ETB_TO_USD).toFixed(2)}` : `${etbAmount.toLocaleString()} ETB`;
‎  };
‎
‎  // --- MAIN MENU: SERVICES ---
‎  if (data === 'services') {
‎    editMsg("የ GILD ልዩ አገልግሎቶች / GILD Services፦", [
‎      [{ text: "Packages 📦", callback_data: 'packages' }],
‎      [{ text: "Individual Services 🛠️", callback_data: 'indiv_services' }],
‎      [{ text: "⬅️ Back", callback_data: settings.lang === 'am' ? 'lang_am' : 'lang_en' }]
‎    ]);
‎  }
‎
‎  if (data === 'packages') {
‎    editMsg("የእርስዎን ደረጃ ይምረጡ / Select Your Package፦", [
‎      [{ text: "GILD Luster (The Foundation)", callback_data: 'pkg_luster' }],
‎      [{ text: "GILD Radiant (The Growth Accelerator)", callback_data: 'pkg_radiant' }],
‎      [{ text: "GILD 24K (The Empire Builder)", callback_data: 'pkg_24k' }],
‎      [{ text: "⬅️ Back", callback_data: 'services' }]
‎    ]);
‎  }
‎
‎  // --- PACKAGE DETAILS ---
‎  if (data === 'pkg_luster') {
‎    const text = `✨ *GILD Luster (The Foundation)* ✨\n\n🎯 A foundational suite designed to prepare your business for the market with an undeniable premium presence and solid brand architecture.\n\n• *Brand Architecture:* Custom logo, premium color palette, typography.\n• *Digital Authority Setup:* Facebook, Instagram, TikTok profiles.\n• *Strategic Content Design:* 12 graphic posts & 2 short videos per month.\n• *Corporate Stationery:* Business cards, letterheads, email signatures.\n• *Community Engagement:* Proactive DM and comment management.\n• *Growth Consultation:* Monthly strategy session.`;
‎    editMsg(text, [
‎      [{ text: "1 Month", callback_data: 'price_luster_1' }, { text: "2 Months", callback_data: 'price_luster_2' }, { text: "3 Months", callback_data: 'price_luster_3' }],
‎      [{ text: "⬅️ Back", callback_data: 'packages' }]
‎    ]);
‎  }
‎
‎  if (data === 'pkg_radiant') {
‎    const text = `🔥 *GILD Radiant (The Growth Accelerator)* 🔥\n\n🚀 An aggressive growth accelerator engineered to convert visibility into measurable sales.\n\n• *Conversion Copywriting:* Psychological & persuasive content.\n• *Advertising Mastery:* 5 targeted ad campaigns (Max ROI).\n• *The GILD Landing Page:* Luxury, high-conversion single-page website.\n• *Local Search Dominance:* Google Maps & SEO.\n• *Creative Dominance:* 20+ custom posts/stories + 1 photoshoot session.\n• *Performance Intelligence:* Comprehensive monthly reports.`;
‎    editMsg(text, [
‎      [{ text: "1 Month", callback_data: 'price_radiant_1' }, { text: "2 Months", callback_data: 'price_radiant_2' }, { text: "3 Months", callback_data: 'price_radiant_3' }],
‎      [{ text: "⬅️ Back", callback_data: 'packages' }]
‎    ]);
‎  }
‎
‎  if (data === 'pkg_24k') {
‎    const text = `👑 *GILD 24K (The Empire Builder)* 👑\n\n💎 The ultimate 360-degree VIP experience designed to transform your brand into a market-leading empire.\n\n• *Omnichannel Mastery:* Daily high-impact posting on all platforms.\n• *Cinematic Storytelling:* 4 commercial-grade brand videos.\n• *AI-Powered Support:* Smart Telegram/Messenger bot development.\n• *Sales Ecosystem:* Full sales funnel & Pixel integration.\n• *SOP Development:* Internal workflow Standard Operating Procedures.\n• *Digital PR & Authority:* Strategic placements to build prestige.\n• *VIP Concierge:* 24/7 direct access priority support.`;
‎    editMsg(text, [
‎      [{ text: "1 Month", callback_data: 'price_24k_1' }, { text: "2 Months", callback_data: 'price_24k_2' }, { text: "3 Months", callback_data: 'price_24k_3' }],
‎      [{ text: "⬅️ Back", callback_data: 'packages' }]
‎    ]);
‎  }
‎
‎  // --- PACKAGE PRICES & PAY BUTTONS ---
‎  const handlePrice = (pkgName, months, priceETB) => {
‎    editMsg(`💳 *${pkgName} (${months} Month)*\n\nPrice: *${formatPrice(priceETB)}*\n\nPress Pay to proceed.`, [
‎      [{ text: "💳 Pay", url: "https://t.me/GILD_Owner" }], // Change URL to your payment link later
‎      [{ text: "⬅️ Back", callback_data: `pkg_${pkgName.split(' ')[1].toLowerCase()}` }]
‎    ]);
‎  };
‎
‎  if (data.startsWith('price_')) {
‎    const parts = data.split('_');
‎    const pkg = parts[1];
‎    const duration = parts[2];
‎    
‎    if (pkg === 'luster') {
‎      if (duration === '1') handlePrice("GILD Luster", 1, 20000);
‎      if (duration === '2') handlePrice("GILD Luster", 2, 35000);
‎      if (duration === '3') handlePrice("GILD Luster", 3, 50000);
‎    } else if (pkg === 'radiant') {
‎      if (duration === '1') handlePrice("GILD Radiant", 1, 35000);
‎      if (duration === '2') handlePrice("GILD Radiant", 2, 65000);
‎      if (duration === '3') handlePrice("GILD Radiant", 3, 90000);
‎    } else if (pkg === '24k') {
‎      if (duration === '1') handlePrice("GILD 24K", 1, 70000);
‎      if (duration === '2') handlePrice("GILD 24K", 2, 130000);
‎      if (duration === '3') handlePrice("GILD 24K", 3, 205000);
‎    }
‎  }
‎
‎  // --- INDIVIDUAL SERVICES ---
‎  if (data === 'indiv_services') {
‎    const text = `🛠 *Individual Services*\n\n• Full Brand Identity (Logo+Book): ${formatPrice(7000)} - ${formatPrice(10000)}\n• Landing Page (1 Page): ${formatPrice(10000)} - ${formatPrice(15000)}\n• Full Business Website: ${formatPrice(30000)} - ${formatPrice(60000)}+\n• Smart Telegram Bot (AI): ${formatPrice(15000)} - ${formatPrice(25000)}\n• Logo Only: ${formatPrice(5000)}\n• SEO Optimization: ${formatPrice(8000)}\n• Strategy Consultation: ${formatPrice(4000)}\n• Business Card Design: ${formatPrice(2000)}\n\n💡 *ለመግዛት ከፈለጉ ከታች ያለውን ይጫኑ:*`;
‎    editMsg(text, [
‎      [{ text: "💳 Order Individual Service", url: "https://t.me/GILD_Owner" }],
‎      [{ text: "⬅️ Back", callback_data: 'services' }]
‎    ]);
‎  }
‎
‎  // --- MORE SECTION ---
‎  if (data === 'more') {
‎    editMsg("ተጨማሪ መረጃዎች / Explore GILD፦", [
‎      [{ text: "About Us", callback_data: 'about' }, { text: "Story", callback_data: 'story' }],
‎      [{ text: "FAQ", callback_data: 'faq' }, { text: "Vision & Mission", callback_data: 'v_m' }],
‎      [{ text: "Our Platform", callback_data: 'platform' }, { text: "Support", callback_data: 'support' }],
‎      [{ text: "Contact Us", callback_data: 'contact' }],
‎      [{ text: "⬅️ Back", callback_data: settings.lang === 'am' ? 'lang_am' : 'lang_en' }]
‎    ]);
‎  }
‎
‎  if (data === 'faq') {
‎    const faqText = `❓ *GILD FAQ*\n\n*Q: Does GILD only work with Ethiopian clients?*\nA: No. While our heart is in Addis Ababa, our standards are international. We serve clients globally, bridging the gap between local insight and world-class execution.\n\n*Q: Can you help a business starting from zero?*\nA: Absolutely. We specialize in building strong foundations. We ensure that your brand starts with a 24K identity, saving you from expensive rebrands later.\n\n*Q: Do you offer consultation only?*\nA: Yes. We provide high-level strategic consulting for brands that need direction before execution.\n\n*Q: Personal Branding: Who do you help?*\nA: We build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity and a strategic voice that commands respect.\n\n*Q: What makes GILD different from other agencies?*\nA: Most agencies focus on "posting." We focus on "Gilding"—a mix of luxury aesthetics, data-driven strategy, and 24/7 automation.\n\n*Q: How do we get started?*\nA: It begins with filling out our Onboarding Form, followed by a discovery call to align our visions.`;
‎    editMsg(faqText, [[{ text: "⬅️ Back", callback_data: 'more' }]]);
‎  }
‎
‎  if (data === 'about') {
‎    const text = `🏢 *About GILD*\n\nAt GILD, we believe that every established business has a "hidden gold"—a core value that is often obscured by outdated branding and mediocre marketing. Our mission is to peel back those metallic layers and reveal the brilliant gold underneath.\n\nFor startups and visionaries starting from zero, we don't just "reveal"—we "forge." We take your raw ideas and transform them into a 24K gold brand identity that commands respect from day one.\n\nWe are not just a marketing agency; we are the master gilders of the digital age, ensuring your business shines with international quality.`;
‎    editMsg(text, [[{ text: "⬅️ Back", callback_data: 'more' }]]);
‎  }
‎
‎  if (data === 'story') {
‎    const text = `📖 *GILD STORY*\n*The Alchemy of Brands: Gild*\n\n"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡"\n\nበጥንታዊው ዘመን፣ አልኬሚ (Alchemy) የሚባል እጅግ ምስጢራዊ እና ጥልቅ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ትልቁ ምኞት እና ጥበብ፣ ተራ የሆኑትን ብረቶች እና ማዕድናት ወደ ንፁህ፣ አንፀባራቂ እና ውድ ወርቅነት መቀየር ነበር፡፡\n\nበዛሬው የዲጂታል እና የሶሻል ሚዲያ ዓለም፣ የእርስዎ ቢዝነስም ይሄው እውነታ ይገጥመዋል፡፡\n\n"ዕንቁ በጭቃ ውስጥ ቢወድቅም እሴቱን አያጣም፤ ነገር ግን እንዲያበራ ጭቃው መገፈፍ አለበት፡፡"\n\nእኛ በ GILD፣ እራሳችንን እንደ ዘመኑ አልኬሚስቶች እንቆጥራለን፡፡ ስራችን ዝም ብሎ ዲዛይን ማድረግ ወይም ፖስት መለጠፍ አይደለም፡፡ የእኛ 'አልኬሚ' (Alchemy) የእርስዎን ቢዝነስ ከሌሎች ተለይቶ እንዲታይ፣ እንዲከበር እና እንደ ወርቅ እንዲያንፀባርቅ የማድረግ ሂደት ነው፡፡\n\n• *መገፈፍ (The Peeling):* የቆዩ ንብርብሮችን እንገፍፋለን፡፡\n• *መቅረጽ (The Forging):* ጠንካራ የብራንድ ማንነት እንቀርጻለን፡፡\n• *መለበጥ (The Gilding):* እንደ ወርቅ አንፀባርቆ እንዲታይ እናደርጋለን፡፡\n\n*GILD Marketing Agency*\n*Where Vision Meets Alchemy.*`;
‎    editMsg(text, [[{ text: "⬅️ Back", callback_data: 'more' }]]);
‎  }
‎
‎  if (data === 'v_m') {
‎    const text = `🌟 *Vision & Mission*\n\n*Where Vision Meets Alchemy*\n\n👁‍🗨 *ራዕይ (Our Vision)*\n"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።"\n\n🎯 *ተልዕኮ (Our Mission)*\n"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)። እያንዳንዱ የምንፈጥረው ይዘት እና የምንቀርጸው ማስታወቂያ የደንበኞቻችንን ክብር፣ ተአማኒነት እና የንግድ ስኬት በዘላቂነት እንዲያድግ ማድረግ፡፡"`;
‎    editMsg(text, [[{ text: "⬅️ Back", callback_data: 'more' }]]);
‎  }
‎
‎  if (data === 'contact') {
‎    editMsg("📩 *Contact Us*\n\nReach out to the Master Gilders:\n\n📧 Email: contact@gild.agency\n✈️ Telegram: @GILD_Owner\n📞 Phone: +251 900 000000", [
‎        [{ text: "⬅️ Back", callback_data: 'more' }]
‎    ]);
‎  }
‎
‎  if (data === 'platform' || data === 'support') {
‎      editMsg("🚧 ይህ ገፅ በቅርቡ ይከፈታል / This page is coming soon.", [[{ text: "⬅️ Back", callback_data: 'more' }]]);
‎  }
‎
‎  // --- MY FORM SECTION ---
‎  if (data === 'my_form') {
‎    const snapshot = await db.ref(`clients/${chatId}`).once('value');
‎    const userData = snapshot.val();
‎
‎    if (userData) {
‎      let info = `📋 *Your GILD Form*\n\n👤 Name: ${userData.fullName}\n📱 Phone: ${userData.phone}\n🏢 Brand: ${userData.brandName}\n🏷 Type: ${userData.serviceType}`;
‎      editMsg(info, [
‎        [{ text: "Edit Form ✏️", callback_data: 'start_form' }],
‎        [{ text: "⬅️ Back", callback_data: settings.lang === 'am' ? 'lang_am' : 'lang_en' }]
‎      ]);
‎    } else {
‎      editMsg("ገና ፎርም አልሞሉም። እባክዎ ፎርሙን ይሙሉ ስንል 'Start Form' ይጫኑ።", [
‎        [{ text: "Start Form 📝", callback_data: 'start_form' }],
‎        [{ text: "⬅️ Back", callback_data: settings.lang === 'am' ? 'lang_am' : 'lang_en' }]
‎      ]);
‎    }
‎  }
‎
‎  if (data === 'start_form') {
‎    // We send a new message here because the user has to type
‎    bot.sendMessage(chatId, "✍️ እባክዎ ሙሉ ስምዎን ያስገቡ?\n\nምሳሌ፦ ተፈራ ካሳ (Tefera Kassa)");
‎    db.ref(`temp/${chatId}`).set({ step: 'name' });
‎  }
‎});
‎
‎// --- FORM TEXT INPUT HANDLER ---
‎bot.on('message', async (msg) => {
‎  const chatId = msg.chat.id;
‎  const text = msg.text;
‎  if (!text || text.startsWith('/')) return;
‎
‎  const tempSnapshot = await db.ref(`temp/${chatId}`).once('value');
‎  const temp = tempSnapshot.val();
‎
‎  if (temp) {
‎    if (temp.step === 'name') {
‎      await db.ref(`temp/${chatId}`).update({ fullName: text, step: 'phone' });
‎      bot.sendMessage(chatId, "በጣም ጥሩ! አሁን ስልክ ቁጥርዎን ያስገቡ?");
‎    } else if (temp.step === 'phone') {
‎      await db.ref(`temp/${chatId}`).update({ phone: text, step: 'brand' });
‎      bot.sendMessage(chatId, "የብራንድዎ ወይም የድርጅትዎ ስም ማን ይባላል?");
‎    } else if (temp.step === 'brand') {
‎      await db.ref(`temp/${chatId}`).update({ brandName: text, step: 'type' });
‎      const opts = {
‎          reply_markup: {
‎              keyboard: [[{text: "Company"}], [{text: "Personal Brand"}], [{text: "E-commerce"}]],
‎              resize_keyboard: true,
‎              one_time_keyboard: true
‎          }
‎      };
‎      bot.sendMessage(chatId, "የቢዝነስ አይነት ይምረጡ?", opts);
‎    } else if (temp.step === 'type') {
‎      const finalData = { ...temp, serviceType: text };
‎      delete finalData.step;
‎      await db.ref(`clients/${chatId}`).set(finalData);
‎      await db.ref(`temp/${chatId}`).remove();
‎      bot.sendMessage(chatId, "✅ መረጃዎ በሚገባ ተመዝግቧል። /start ብለው በመመለስ 'My Form' ውስጥ ማየት ይችላሉ።", {
‎          reply_markup: { remove_keyboard: true }
‎      });
‎    }
‎  }
‎});
‎
