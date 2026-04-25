require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const usersState = {};
const usersData = {};
const usersCurrency = {}; 

const RATE = 160; 

function formatPrice(minEtb, maxEtb = null, chatId) {
    const curr = usersCurrency[chatId] || 'ETB';
    if (curr === 'USD') {
        if (maxEtb) {
            return `$${(minEtb / RATE).toFixed(2)} - $${(maxEtb / RATE).toFixed(2)}`;
        }
        return `$${(minEtb / RATE).toFixed(2)}`;
    }
    if (maxEtb) {
        return `${minEtb.toLocaleString()} - ${maxEtb.toLocaleString()} ETB`;
    }
    return `${minEtb.toLocaleString()} ETB`;
}

function getMainMenu(chatId) {
    const hasForm = usersData[chatId] && usersData[chatId].isComplete;
    return {
        inline_keyboard: [
            [{ text: hasForm ? "My Form" : "Form ይሙሉ", callback_data: hasForm ? 'my_form' : 'fill_form' }],
            [{ text: "Service", callback_data: 'service' }],
            [{ text: "More....", callback_data: 'more' }]
        ]
    };
}

const bottomMenu = {
    reply_markup: {
        keyboard: [[{ text: "💱 Change Currency" }]],
        resize_keyboard: true,
        persistent: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    usersCurrency[chatId] = 'ETB'; 
    
    bot.sendMessage(chatId, "እንኳን በደህና መጡ! / Welcome!", bottomMenu).then(() => {
        bot.sendMessage(chatId, "እባክዎ ቋንቋ ያስመርጡ / Please select a language:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🇪🇹 አማርኛ", callback_data: 'lang_selected' }, { text: "🇬🇧 English", callback_data: 'lang_selected' }]
                ]
            }
        });
    });
});

bot.onText(/\/(currency|cur)/i, (msg) => {
    toggleCurrency(msg.chat.id);
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text === "💱 Change Currency") {
        toggleCurrency(chatId);
        return;
    }

    if (text.startsWith('/')) {
        handleIndividualCommands(chatId, text);
        return;
    }

    const state = usersState[chatId];
    if (state === 'AWAITING_NAME') {
        usersData[chatId].name = text;
        usersState[chatId] = 'AWAITING_PHONE';
        bot.sendMessage(chatId, "ስልክ ቁጥር ያስገቡ:");
    } 
    else if (state === 'AWAITING_PHONE') {
        usersData[chatId].phone = text;
        usersState[chatId] = 'AWAITING_ADDRESS';
        bot.sendMessage(chatId, "አድራሻ ያስገቡ:");
    }
    else if (state === 'AWAITING_ADDRESS') {
        usersData[chatId].address = text;
        usersState[chatId] = 'AWAITING_BRAND';
        bot.sendMessage(chatId, "Brand Name ያስገቡ:");
    }
    else if (state === 'AWAITING_BRAND') {
        usersData[chatId].brand = text;
        usersState[chatId] = 'AWAITING_NEEDS';
        bot.sendMessage(chatId, "ምን እንደሚፈልጉ ይምረጡ:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Company", callback_data: 'need_company' }],
                    [{ text: "Personal brand", callback_data: 'need_personal' }],
                    [{ text: "Other", callback_data: 'need_other' }]
                ]
            }
        });
    }
});

function toggleCurrency(chatId) {
    usersCurrency[chatId] = (usersCurrency[chatId] === 'ETB') ? 'USD' : 'ETB';
    const curr = usersCurrency[chatId];
    bot.sendMessage(chatId, `Currency changed to: ${curr}. Menu is updated.`, {
        reply_markup: getMainMenu(chatId)
    });
}

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    if (data === 'lang_selected') {
        bot.editMessageText("ቋንቋ መርጠዋል። ከታች ካለው Menu ይምረጡ፡", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId)
        });
    }

    if (data === 'main_menu') {
        usersState[chatId] = null;
        bot.editMessageText("Main Menu:", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId)
        });
    }

    // FORM LOGIC
    if (data === 'fill_form' || data === 'edit_form') {
        usersData[chatId] = { isComplete: false };
        usersState[chatId] = 'AWAITING_NAME';
        bot.editMessageText("Form እንዲሞሉ ተጠይቀዋል።\n\nFULL NAME (ለምሳሌ: Abebe Kebede):", {
            chat_id: chatId, message_id: messageId
        });
    }

    if (data === 'my_form') {
        const d = usersData[chatId];
        const text = `የሞሉት Form:\n\nName: ${d.name}\nPhone: ${d.phone}\nAddress: ${d.address}\nBrand Name: ${d.brand}\nNeeds: ${d.needs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Edit Form", callback_data: 'edit_form' }],
                    [{ text: "Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data.startsWith('need_')) {
        const needMap = { need_company: 'Company', need_personal: 'Personal Brand', need_other: 'Other' };
        usersData[chatId].needs = needMap[data];
        usersData[chatId].isComplete = true;
        usersState[chatId] = null;
        bot.editMessageText("መዝግበነዋል!", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId)
        });
    }

    // SERVICE MENU
    if (data === 'service') {
        bot.editMessageText("Service Menu:", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Package", callback_data: 'packages' }],
                    [{ text: "Individuals service", callback_data: 'individuals' }],
                    [{ text: "Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'packages') {
        bot.editMessageText("Package:", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "GILD Luster (The Foundation)", callback_data: 'pkg_luster' }],
                    [{ text: "GILD Radiant (The Growth Accelerator)", callback_data: 'pkg_radiant' }],
                    [{ text: "GILD 24K (The Empire Builder)", callback_data: 'pkg_24k' }],
                    [{ text: "Back", callback_data: 'service' }]
                ]
            }
        });
    }

    // PACKAGES DETAILS
    if (data === 'pkg_luster') {
        const text = `GILD Luster : A foundational suite designed to prepare your business for the market with an undeniable premium presence and solid brand architecture.\n\nBrand Architecture: Comprehensive visual identity setup including custom logo design, premium color palette, typography selection, and brand naming.\n\nDigital Authority Setup: High-end optimization and setup of Facebook, Instagram, and TikTok profiles to reflect absolute prestige.\n\nStrategic Content Design: 12 visually striking, high-quality graphic posts and 2 engaging short-form videos (Reels/Shorts) per month.\n\nCorporate Stationery: Elegant design suite for business cards, letterheads, and professional email signatures.\n\nCommunity Engagement: Proactive and professional management of audience interactions, comments, and direct messages (DMs).\n\nGrowth Consultation: A dedicated monthly strategy session to review digital performance and align future objectives.\n\nየአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ለ 1 ወር", callback_data: 'dur_lus_1' }, { text: "ለ 2 ወር", callback_data: 'dur_lus_2' }, { text: "ለ 3 ወር", callback_data: 'dur_lus_3' }],
                    [{ text: "Back", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_radiant') {
        const text = `GILD Radiant : An aggressive growth accelerator engineered to convert visibility into measurable sales and establish dominant market prominence.\n\nConversion Copywriting: Psychological and persuasive content creation designed to turn spectators into loyal clients.\n\nAdvertising Mastery: Management of 5 targeted ad campaigns engineered for maximum ROI and lead generation.\n\nThe GILD Landing Page: A luxury, high-conversion single-page website designed to showcase and sell your primary offer.\n\nLocal Search Dominance: Optimization of Google Maps and Search Engine Presence (SEO) to ensure you are the first choice.\n\nCreative Dominance: 20+ custom posts and stories per month, plus one professional product or service photoshoot session.\n\nPerformance Intelligence: Comprehensive monthly reports detailing sales funnel performance and ad metrics.\n\nየአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ለ 1 ወር", callback_data: 'dur_rad_1' }, { text: "ለ 2 ወር", callback_data: 'dur_rad_2' }, { text: "ለ 3 ወር", callback_data: 'dur_rad_3' }],
                    [{ text: "Back", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_24k') {
        const text = `GILD 24K : The ultimate 360-degree VIP experience designed to transform your brand into a market-leading empire.\n\nOmnichannel Mastery: Daily high-impact posting and full management across all major social media platforms.\n\nCinematic Storytelling: 4 commercial-grade, cinematic brand videos that define your industry authority.\n\nAI-Powered 24/7 Support: Development of a smart AI bot for Telegram/Messenger to automate inquiries and sales leads.\n\nSales Ecosystem: Full sales funnel construction, Pixel integration, and advanced retargeting strategies.\n\nSOP Development: Creation of detailed Standard Operating Procedures for your internal workflow, ensuring business continuity without your constant presence.\n\nDigital PR & Authority: Strategic placements and mentions to build high-level brand prestige.\n\nVIP Concierge: 24/7 direct access and priority support for all urgent business needs.\n\nየአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ለ 1 ወር", callback_data: 'dur_24k_1' }, { text: "ለ 2 ወር", callback_data: 'dur_24k_2' }, { text: "ለ 3 ወር", callback_data: 'dur_24k_3' }],
                    [{ text: "Back", callback_data: 'packages' }]
                ]
            }
        });
    }

    // DURATIONS AND PRICES
    const packagePrices = {
        'dur_lus_1': { price: formatPrice(20000, null, chatId), back: 'pkg_luster' },
        'dur_lus_2': { price: formatPrice(35000, null, chatId), back: 'pkg_luster' },
        'dur_lus_3': { price: formatPrice(50000, null, chatId), back: 'pkg_luster' },
        'dur_rad_1': { price: formatPrice(35000, null, chatId), back: 'pkg_radiant' },
        'dur_rad_2': { price: formatPrice(65000, null, chatId), back: 'pkg_radiant' },
        'dur_rad_3': { price: formatPrice(90000, null, chatId), back: 'pkg_radiant' },
        'dur_24k_1': { price: formatPrice(70000, null, chatId), back: 'pkg_24k' },
        'dur_24k_2': { price: formatPrice(130000, null, chatId), back: 'pkg_24k' },
        'dur_24k_3': { price: formatPrice(205000, null, chatId), back: 'pkg_24k' }
    };

    if (packagePrices[data]) {
        bot.editMessageText(`Price: ${packagePrices[data].price}`, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Pay", callback_data: 'pay_action' }],
                    [{ text: "Back", callback_data: packagePrices[data].back }]
                ]
            }
        });
    }

    // INDIVIDUAL SERVICES
    if (data === 'individuals') {
        const text = `Individuals service\n\nመግዛት ከፈለጉ ከታች ያሉትን ነክተው ይፃፉ:\n/Brand\n/LandingPage\n/Website\n/Bot\n/Logo\n/SEO\n/Strategy\n/BusinessCard`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'service' }]] }
        });
    }

    if (data === 'pay_action') {
        bot.answerCallbackQuery(query.id, { text: "ክፍያ ለማካሄድ ያነጋግሩን!", show_alert: true });
    }

    // MORE MENU
    if (data === 'more') {
        bot.editMessageText("MORE..", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "About us", callback_data: 'about_us' }, { text: "Contact us", callback_data: 'contact_us' }],
                    [{ text: "FAQ", callback_data: 'faq' }, { text: "Story", callback_data: 'story' }],
                    [{ text: "Vision & Mission", callback_data: 'vision_mission' }],
                    [{ text: "Our Platform", callback_data: 'our_platform' }, { text: "Support", callback_data: 'support' }],
                    [{ text: "Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'faq') {
        const text = `Does GILD only work with Ethiopian clients?\nNo. While our heart is in Addis Ababa, our standards are international. We serve clients globally, bridging the gap between local insight and world-class execution.\n\nCan you help a business starting from zero?\nAbsolutely. We specialize in building strong foundations. We ensure that your brand starts with a 24K identity, saving you from expensive rebrands later.\n\nDo you offer consultation only?\nYes. We provide high-level strategic consulting for brands that need direction before execution.\n\nPersonal Branding: Who do you help?\nWe build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity and a strategic voice that commands respect.\n\nWhat makes GILD different from other agencies?\nMost agencies focus on "posting." We focus on "Gilding"—a mix of luxury aesthetics, data-driven strategy, and 24/7 automation.\n\nHow do we get started?\nIt begins with filling out our Onboarding Form, followed by a discovery call to align our visions.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'more' }]] } });
    }

    if (data === 'about_us') {
        const text = `At GILD, we believe that every established business has a "hidden gold"—a core value that is often obscured by outdated branding and mediocre marketing. Our mission is to peel back those metallic layers and reveal the brilliant gold underneath. For startups and visionaries starting from zero, we don't just "reveal"—we "forge." We take your raw ideas and transform them into a 24K gold brand identity that commands respect from day one. We are not just a marketing agency; we are the master gilders of the digital age, ensuring your business shines with international quality.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'more' }]] } });
    }

    if (data === 'story') {
        const text = `GILD STORY\n\nThe Alchemy of Brands: Gild\n\n"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡"\n\nበጥንታዊው ዘመን፣ አልኬሚ (Alchemy) የሚባል እጅግ ምስጢራዊ እና ጥልቅ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ትልቁ ምኞት እና ጥበብ፣ ተራ የሆኑትን ብረቶች እና ማዕድናት ወደ ንፁህ፣ አንፀባራቂ እና ውድ ወርቅነት መቀየር ነበር፡፡ ይህ ጥበብ የነገሮችን ላዩን ገፅታ ብቻ ሳይሆን፣ ውስጣዊ ማንነታቸውን አውጥቶ የማንገስ ሂደት ነው፡፡\n\nበዛሬው የዲጂታል እና የሶሻል ሚዲያ ዓለም፣ የእርስዎ ቢዝነስም ይሄው እውነታ ይገጥመዋል፡፡ ምናልባት እጅግ ድንቅ የሆነ ምርት አልዎት፤ ወደር የማይገኝለት አገልግሎት ይሰጣሉ፤ ወይንም በድርጅትዎ ውስጥ ትልቅ 'Premium' ብራንድ የመሆን ሙሉ እምቅ አቅም ታምቆ ይገኛል፡፡ ነገር ግን፣ በሶሻል ሚዲያው ማለቂያ የሌለው ጫጫታ እና በተለመዱ፣ ርካሽ ማስታወቂያዎች ጋጋታ ውስጥ ያ የላቀ ማንነትዎ ተቀብሮ፣ ትኩረት አጥቶ እና ገና ሳይወጣ ቀርቶ ሊሆን ይችላል፡፡\n\n"ዕንቁ በጭቃ ውስጥ ቢወድቅም እሴቱን አያጣም፤ ነገር ግን እንዲያበራ ጭቃው መገፈፍ አለበት፡፡"\n\nእኛ በ GILD፣ እራሳችንን እንደ ዘመኑ አልኬሚስቶች እንቆጥራለን፡፡ ስራችን ዝም ብሎ ዲዛይን ማድረግ ወይም ፖስት መለጠፍ አይደለም፡፡ የእኛ 'አልኬሚ' (Alchemy) የእርስዎን ቢዝነስ ከሌሎች ተለይቶ እንዲታይ፣ እንዲከበር እና እንደ ወርቅ እንዲያንፀባርቅ የማድረግ ሂደት ነው፡፡\n\nGild ማለት አንድን ነገር በወርቅ መለበጥ፣ ማስዋብ እና ውድ እንዲመስል ማድረግ ማለት ነው፡፡ እኛም የምናደርገው ይሄንን ነው፦\n\nመገፈፍ (The Peeling): ውጤታማ ያልሆኑ፣ የቆዩ እና የብራንድዎን ውበት የሸፈኑ 'ብረታማ' ንብርብሮችን እንገፍፋለን፡፡\n\nመቅረጽ (The Forging): በስነ-ልቦናዊ ስትራቴጂ እና በፈጠራ ጥበብ የታጀበ አዲስ እና ጠንካራ የብራንድ ማንነት እንቀርጻለን፡፡\n\nመለበጥ (The Gilding): በመጨረሻም ብራንድዎ በገበያው ውስጥ የላቀ ክብር እንዲኖረው እና እንደ ወርቅ አንፀባርቆ እንዲታይ እናደርጋለን፡፡\n\nየእርስዎ ቢዝነስ ተራ ብረት ሆኖ እንዲቀር አንፈቅድም፡፡ እኛ ጋር ሲመጡ፣ ቪዥንዎን ወደ ወርቅ እንቀይረዋለን፡፡\n\nGILD Marketing Agency\nWhere Vision Meets Alchemy.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'more' }]] } });
    }

    if (data === 'vision_mission') {
        bot.editMessageText("Vision & Mission", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Vision", callback_data: 'vision_btn' }, { text: "Mission", callback_data: 'mission_btn' }],
                    [{ text: "Back", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'vision_btn') {
        const text = `Gild Marketing Agency\nWhere Vision Meets Alchemy\n\nራዕይ (Our Vision)\n\n"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።''`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'vision_mission' }]] } });
    }

    if (data === 'mission_btn') {
        const text = `Gild Marketing Agency\nWhere Vision Meets Alchemy\n\nተልዕኮ (Our Mission)\n\n"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)። እያንዳንዱ የምንፈጥረው ይዘት እና የምንቀርጸው ማስታወቂያ የደንበኞቻችንን ክብር፣ ተአማኒነት እና የንግድ ስኬት በዘላቂነት እንዲያድግ ማድረግ፡፡"`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'vision_mission' }]] } });
    }

    if (data === 'contact_us') {
        bot.editMessageText("Contact us\nEmail :- gild.agency.et@gimail.com", {
            chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'more' }]] }
        });
    }

    if (data === 'our_platform') {
        bot.editMessageText("Our Platform", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Facebook", url: "https://www.facebook.com/share/18Ph7UH2Xq/" }],
                    [{ text: "Telegram", url: "https://t.me/gild_agency" }],
                    [{ text: "Tiktok", url: "https://www.tiktok.com/@gild.agency" }],
                    [{ text: "Instagram", url: "https://www.instagram.com/gild_agency" }],
                    [{ text: "X or Tweeter", url: "https://x.com/Gild_Agency" }],
                    [{ text: "Youtube", url: "https://www.youtube.com/@GILDAGENCY" }],
                    [{ text: "Back", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'support') {
        bot.editMessageText("Support", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Telegram Support", url: "https://t.me/Farisman72" }],
                    [{ text: "Back", callback_data: 'more' }]
                ]
            }
        });
    }
    
    // BACK HANDLER FOR INDIVIDUALS TEXT RESPONSE
    if (data === 'back_to_indiv') {
        const text = `Individuals service\n\nመግዛት ከፈለጉ ከታች ያሉትን ነክተው ይፃፉ:\n/Brand\n/LandingPage\n/Website\n/Bot\n/Logo\n/SEO\n/Strategy\n/BusinessCard`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[{ text: "Back", callback_data: 'service' }]] }
        });
    }
});

function handleIndividualCommands(chatId, text) {
    let responseText = "";
    let priceText = "";

    switch(text.toLowerCase()) {
        case '/brand':
            responseText = "Full Brand Identity (Logo + Brand Book)";
            priceText = formatPrice(7000, 10000, chatId);
            break;
        case '/landingpage':
            responseText = "Landing Page Website (1 ገጽ)\n(የ Hosting ወጪ ለብቻው ሆኖ)";
            priceText = formatPrice(10000, 15000, chatId);
            break;
        case '/website':
            responseText = "Full Business Website (ባለብዙ ገጽ)\n(እንደ ስራው ስፋት)";
            priceText = formatPrice(30000, 60000, chatId) + "+";
            break;
        case '/bot':
            responseText = "Smart Telegram Bot (AI Integrated)\n(እንደ ቦቱ ውስብስብነት)";
            priceText = formatPrice(15000, 25000, chatId);
            break;
        case '/logo':
            responseText = "LOGO ብቻውን";
            priceText = formatPrice(5000, null, chatId);
            break;
        case '/seo':
            responseText = "SEO ብቻ";
            priceText = formatPrice(3000, null, chatId);
            break;
        case '/strategy':
            responseText = "Strategy ምክር ብቻ";
            priceText = formatPrice(4000, null, chatId);
            break;
        case '/businesscard':
            responseText = "BUSINESS CARD Design";
            priceText = formatPrice(2000, null, chatId);
            break;
        default:
            return; 
    }

    bot.sendMessage(chatId, `${responseText}\n\nዋጋ: ${priceText}`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Pay", callback_data: 'pay_action' }],
                [{ text: "Back", callback_data: 'back_to_indiv' }]
            ]
        }
    });
}
