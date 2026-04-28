require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Port Error እንዳይፈጠር እና የ Cron Job ጥያቄን ለመቀበል (Keep-alive)
const app = express();
app.get('/', (req, res) => res.send('GILD Bot is Running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const usersState = {};
const usersData = {};
const usersCurrency = {}; 
const usersLang = {};

const RATE = 160; 

// የጎንዮሽ Menu ለማስተካከል
bot.setMyCommands([
    { command: '/start', description: 'ዋና ገፅ / Main Menu' },
    { command: '/language', description: 'ቋንቋ ለመቀየር / Change Language' },
    { command: '/currency', description: 'መገበያያ ለመቀየር / Change Currency' },
    { command: '/services', description: 'ነጠላ አገልግሎቶች / Single Services' }
]);

// ዋጋን ለማስተካከል
function getPrice(minEtb, maxEtb = null, chatId) {
    const curr = usersCurrency[chatId] || 'ETB';
    if (curr === 'USD') {
        if (maxEtb) return `$${(minEtb / RATE).toFixed(2)} - $${(maxEtb / RATE).toFixed(2)}`;
        return `$${(minEtb / RATE).toFixed(2)}`;
    }
    if (maxEtb) return `${minEtb.toLocaleString()} - ${maxEtb.toLocaleString()} ETB`;
    return `${minEtb.toLocaleString()} ETB`;
}

// ዋናው ሜኑ Button (Capitalized & Clean)
function getMainMenu(chatId) {
    const isEn = usersLang[chatId] === 'EN';
    const hasForm = usersData[chatId] && usersData[chatId].isComplete;
    return {
        inline_keyboard: [
            [{ text: hasForm ? (isEn ? "📄 MY PROFILE" : "📄 የእኔ መረጃ") : (isEn ? "📝 FILL FORM" : "📝 ፎርም ይሙሉ"), callback_data: hasForm ? 'my_form' : 'fill_form' }],
            [{ text: isEn ? "⚜️ SERVICES & PACKAGES" : "⚜️ አገልግሎቶች እና ጥቅሎች", callback_data: 'service' }],
            [{ text: isEn ? "🏛️ THE GILD LEGACY" : "🏛️ የGILD ማንነት", callback_data: 'more' }]
        ]
    };
}

// /start Command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!usersCurrency[chatId]) usersCurrency[chatId] = 'ETB'; 
    if (!usersLang[chatId]) usersLang[chatId] = 'AM'; 
    
    bot.sendMessage(chatId, "...", { reply_markup: { remove_keyboard: true } }).then((m) => {
        bot.deleteMessage(chatId, m.message_id).catch(() => {});
    });

    sendLanguageSelection(chatId);
});

bot.onText(/\/language/, (msg) => sendLanguageSelection(msg.chat.id));

function sendLanguageSelection(chatId) {
    const text = "Welcome to <b>GILD</b>. A standard of excellence in every interaction.\nPlease select your preferred language to proceed.\n\n<b>GILD</b> እንኳን በደህና መጡ። የላቀ ጥራትን ከክብር ጋር ያጣመረ አገልግሎት።\nለመቀጠል እባክዎ የሚመርጡትን ቋንቋ ይምረጡ።";
    
    bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🇪🇹 አማርኛ", callback_data: 'lang_AM' }, { text: "🇬🇧 ENGLISH", callback_data: 'lang_EN' }]
            ]
        }
    });
}

// የፅሁፍ እና የ Command ተቀባይ
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const isEn = usersLang[chatId] === 'EN';

    if (!text) return;

    if (text.toLowerCase() === '/currency') {
        const msgText = isEn 
            ? "<b>Live Market Rates.</b> 📈\n\nOur services are valued based on current global standards.\nPlease choose your preferred currency.\n\n<i>(Exchange rate: 1 USD = 160 ETB)</i>" 
            : "<b>ወቅታዊ የገበያ ተመን።</b> 📈\n\nአገልግሎቶቻችን ዓለም አቀፍ ደረጃን በጠበቀ ዋጋ የቀረቡ ናቸው።\nእባክዎ የሚከፍሉበትን ገንዘብ አይነት ይምረጡ።\n\n<i>(የምንዛሬ ተመን: 1 USD = 160 ETB)</i>";
        bot.sendMessage(chatId, msgText, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "USD ($)", callback_data: 'set_curr_usd' }, { text: "ETB (ብር)", callback_data: 'set_curr_etb' }]
                ]
            }
        });
        return;
    }

    if (text.startsWith('/')) {
        handleIndividualCommands(chatId, text);
        return;
    }

    // የ Form አሞላል ሁኔታ
    const state = usersState[chatId];
    if (state === 'AWAITING_NAME') {
        usersData[chatId].name = text;
        usersState[chatId] = 'AWAITING_PHONE';
        const txt = isEn 
            ? "<b>Contact Information.</b>\n\nPlease provide your direct phone number for our concierge to reach you:" 
            : "<b>የመገናኛ መረጃ።</b>\n\nልዩ ረዳታችን (Concierge) ሊያገኝዎ የሚችልበትን ትክክለኛ ስልክ ቁጥርዎን ያስገቡ፡";
        bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
    } 
    else if (state === 'AWAITING_PHONE') {
        usersData[chatId].phone = text;
        usersState[chatId] = 'AWAITING_ADDRESS';
        const txt = isEn 
            ? "<b>Location.</b>\n\nPlease select your primary city of operation:" 
            : "<b>አድራሻ።</b>\n\nእባክዎ የሚገኙበትን ከተማ ከስር ይምረጡ፡";
        bot.sendMessage(chatId, txt, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ADDIS ABABA", callback_data: 'city_Addis Ababa' }, { text: "DIRE DAWA", callback_data: 'city_Dire Dawa' }],
                    [{ text: "MEKELLE", callback_data: 'city_Mekelle' }, { text: "GONDAR", callback_data: 'city_Gondar' }],
                    [{ text: "BAHIR DAR", callback_data: 'city_Bahir Dar' }, { text: "HAWASSA", callback_data: 'city_Hawassa' }],
                    [{ text: "JIMMA", callback_data: 'city_Jimma' }, { text: "DESSIE", callback_data: 'city_Dessie' }]
                ]
            }
        });
    }
    else if (state === 'AWAITING_BRAND') {
        usersData[chatId].brand = text;
        usersState[chatId] = 'AWAITING_NEEDS';
        const txt = isEn 
            ? "<b>Brand Architecture.</b>\n\nWhat is the core focus of your vision?" 
            : "<b>የብራንድ ትኩረት።</b>\n\nየእርስዎ ራዕይ የትኛው ላይ ያተኮረ ነው?";
        bot.sendMessage(chatId, txt, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "COMPANY BRAND", callback_data: 'need_company' }],
                    [{ text: "PERSONAL BRAND", callback_data: 'need_personal' }],
                    [{ text: "OTHER", callback_data: 'need_other' }]
                ]
            }
        });
    }
});

// Button (Callback) ሲነካ
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    bot.answerCallbackQuery(query.id).catch(() => {});

    const isEn = usersLang[chatId] === 'EN';

    // ቋንቋ መምረጥ
    if (data === 'lang_AM' || data === 'lang_EN') {
        usersLang[chatId] = data === 'lang_EN' ? 'EN' : 'AM';
        const isNowEn = usersLang[chatId] === 'EN';
        const msgTxt = isNowEn 
            ? "Explore the <b>GILD Ecosystem</b>. ✨\n\nHow may we elevate your vision today? Select an option below to begin your journey." 
            : "የ<b>GILD</b>ን አለም ይቃኙ። ✨\n\nዛሬ ራዕይዎን ለማሳካት በምን እንርዳዎት? ጉዞዎን ለመጀመር ከታች ካሉት አማራጮች አንዱን ይምረጡ።";
        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
        return;
    }

    // Currency Setting
    if (data === 'set_curr_usd' || data === 'set_curr_etb') {
        usersCurrency[chatId] = data === 'set_curr_usd' ? 'USD' : 'ETB';
        const txt = isEn ? `✅ Currency updated to <b>${usersCurrency[chatId]}</b>.` : `✅ መገበያያዎ ወደ <b>${usersCurrency[chatId]}</b> ተቀይሯል።`;
        
        const msgTxt = isEn 
            ? `${txt}\n\nExplore the <b>GILD Ecosystem</b>. ✨\nSelect an option below:` 
            : `${txt}\n\nየ<b>GILD</b>ን አለም ይቃኙ። ✨\nከታች ካሉት አማራጮች ይምረጡ፡`;

        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
        return;
    }

    if (data === 'main_menu') {
        usersState[chatId] = null;
        const msgTxt = isEn 
            ? "Explore the <b>GILD Ecosystem</b>. ✨\n\nHow may we elevate your vision today? Select an option below:" 
            : "የ<b>GILD</b>ን አለም ይቃኙ። ✨\n\nዛሬ ራዕይዎን ለማሳካት በምን እንርዳዎት? ከታች ይምረጡ፡";
        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
    }

    // ==== FORM ====
    if (data === 'fill_form' || data === 'edit_form') {
        if (!usersData[chatId]) usersData[chatId] = {};
        usersData[chatId].isComplete = false;
        usersState[chatId] = 'AWAITING_NAME';
        const txt = isEn 
            ? "<b>Exclusivity begins here.</b> ⚜️\n\nTo provide you with a personalized experience, please share your full name (e.g., Abebe Kebede):" 
            : "<b>ልዩነት ከዚህ ይጀምራል።</b> ⚜️\n\nእርሶን የሚመጥን አገልግሎት ለመስጠት እንዲቻል፣ እባክዎ ሙሉ ስምዎን ያስገቡ (ለምሳሌ፦ አበበ ከበደ)።";
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' });
    }

    if (data.startsWith('city_')) {
        usersData[chatId].address = data.split('_')[1];
        usersState[chatId] = 'AWAITING_BRAND';
        const txt = isEn 
            ? `<b>Location Confirmed.</b>\n\nPlease provide the official name of your Brand/Business:` 
            : `<b>አድራሻዎ ተረጋግጧል።</b>\n\nእባክዎ የብራንድዎን ወይም የድርጅትዎን ትክክለኛ ስም ከስር ያስገቡ፡`;
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' });
    }

    if (data === 'my_form') {
        const d = usersData[chatId];
        const text = isEn ? 
            `<b>Review Your Profile.</b>\n\nPlease confirm the details below before we proceed with your request.\n\n• <b>Name:</b> ${d.name}\n• <b>Phone:</b> ${d.phone}\n• <b>Location:</b> ${d.address}\n• <b>Brand:</b> ${d.brand}\n• <b>Focus:</b> ${d.needs}` : 
            `<b>መረጃዎን ያረጋግጡ።</b>\n\nጥያቄዎን ከማስተናገዳችን በፊት፣ እባክዎ ከታች ያሉትን መረጃዎች ትክክለኛነት ያረጋግጡ።\n\n• <b>ስም:</b> ${d.name}\n• <b>ስልክ:</b> ${d.phone}\n• <b>አድራሻ:</b> ${d.address}\n• <b>ብራንድ:</b> ${d.brand}\n• <b>ትኩረት:</b> ${d.needs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "✏️ EDIT PROFILE" : "✏️ መረጃ አስተካክል", callback_data: 'edit_form' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data.startsWith('need_')) {
        const needMap = { need_company: 'Company', need_personal: 'Personal Brand', need_other: 'Other' };
        usersData[chatId].needs = needMap[data];
        usersData[chatId].isComplete = true;
        usersState[chatId] = null;
        const txt = isEn 
            ? "⚜️ <b>Profile Registered Successfully.</b>\n\nReturning to the GILD Ecosystem." 
            : "⚜️ <b>መረጃዎ በክብር ተመዝግቧል።</b>\n\nወደ ዋናው ማውጫ እየተመለሱ ነው።";
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
    }

    // ==== SERVICE ====
    if (data === 'service') {
        const txt = isEn 
            ? "<b>Tailored Solutions.</b> 💼\n\nDiscover our bespoke service tiers designed to accelerate your growth and refine your presence." 
            : "<b>ልዩ የአገልግሎት ምርጫዎች።</b> 💼\n\nየንግድዎን እድገት የሚያፋጥኑ እና ጥራትዎን የሚገልጹ ልዩ ጥቅሎቻችንን እዚህ ያገኛሉ።";
        
        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "📦 ELITE PACKAGES" : "📦 የጥቅል አገልግሎቶች", callback_data: 'packages' }],
                    [{ text: isEn ? "👤 SINGLE SERVICES" : "👤 ነጠላ አገልግሎቶች", callback_data: 'single_services' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'packages') {
        const txt = isEn 
            ? "<b>Select Your Standard.</b>\n\nTo reveal the comprehensive offerings of each tier, please select a package below:" 
            : "<b>የሚመጥንዎን ደረጃ ይምረጡ።</b>\n\nዝርዝር ይዘታቸውን ለመመልከት ከታች ካሉት የጥቅል አገልግሎቶች አንዱን ይምረጡ፡";
        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (The Foundation)", callback_data: 'pkg_luster' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (Growth Accelerator)", callback_data: 'pkg_radiant' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (The Empire Builder)", callback_data: 'pkg_24k' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'service' }]
                ]
            }
        });
    }

    // PACKAGES DETAILS
    if (data === 'pkg_luster') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
<i>A foundational suite designed to prepare your business for the market with an undeniable premium presence and solid brand architecture.</i>

• <b>Brand Architecture:</b> Comprehensive visual identity setup including custom logo design, premium color palette, typography selection, and brand naming.
• <b>Digital Authority Setup:</b> High-end optimization and setup of Facebook, Instagram, and TikTok profiles to reflect absolute prestige.
• <b>Strategic Content Design:</b> 12 visually striking, high-quality graphic posts and 2 engaging short-form videos (Reels/Shorts) per month.
• <b>Corporate Stationery:</b> Elegant design suite for business cards, letterheads, and professional email signatures.
• <b>Community Engagement:</b> Proactive and professional management of audience interactions, comments, and direct messages (DMs).
• <b>Growth Consultation:</b> A dedicated monthly strategy session to review digital performance and align future objectives.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
<i>ቢዝነስዎን ውብ፣ ፕሮፌሽናል እና ተወዳዳሪ በሌለው የጥራት ገፅታ ለገበያ ለማቅረብ የተዘጋጀ መሰረታዊ ጥቅል።</i>

• <b>የብራንድ ውበት (Brand Architecture):</b> የሎጎ ዲዛይን፣ የከለር ምርጫ፣ የፅሁፍ ስታይል እና የስያሜ ስራን ያካተተ ሙሉ ማንነት፡፡
• <b>ዲጂታል ገፅታ (Digital Authority Setup):</b> የፌስቡክ፣ ኢንስታግራም እና ቲክቶክ ገፆችን የላቀ ክብር በሚያንፀባርቅ መልኩ ማዘጋጀት፡፡
• <b>ስትራቴጂካዊ ይዘቶች (Strategic Content Design):</b> በወር 12 ማራኪ ግራፊክስ ፖስቶች እና 2 አጫጭር ቪዲዮዎች (Reels/Shorts)፡፡
• <b>የድርጅት መታወቂያዎች (Corporate Stationery):</b> ለቢዝነስ ካርድ፣ ሌተርሄድ እና የኢሜል ፊርማ የሚሆኑ ውብ ዲዛይኖች፡፡
• <b>የደንበኞች ግንኙነት (Community Engagement):</b> የገፅዎን ተከታዮች አስተያየት እና መልዕክቶች (DMs) በፕሮፌሽናል ደረጃ ማስተዳደር፡፡
• <b>የእድገት ምክክር (Growth Consultation):</b> በየወሩ የቢዝነስዎን ዲጂታል አፈፃፀም የሚገመግም የስትራቴጂ ውይይት፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_lus_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_lus_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_lus_3' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_radiant') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗧𝗵𝗲 𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
<i>An aggressive growth accelerator engineered to convert visibility into measurable sales and establish dominant market prominence.</i>

• <b>Conversion Copywriting:</b> Psychological and persuasive content creation designed to turn spectators into loyal clients.
• <b>Advertising Mastery:</b> Management of 5 targeted ad campaigns engineered for maximum ROI and lead generation.
• <b>The GILD Landing Page:</b> A luxury, high-conversion single-page website designed to showcase and sell your primary offer.
• <b>Local Search Dominance:</b> Optimization of Google Maps and Search Engine Presence (SEO) to ensure you are the first choice.
• <b>Creative Dominance:</b> 20+ custom posts and stories per month, plus one professional product or service photoshoot session.
• <b>Performance Intelligence:</b> Comprehensive monthly reports detailing sales funnel performance and ad metrics.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗧𝗵𝗲 𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
<i>እይታን ወደ እውነተኛ ሽያጭ ለመቀየር እና በገበያው ውስጥ ጉልህ ስፍራን ለመያዝ የተነደፈ የሽያጭ ማሳደጊያ ስትራቴጂ፡፡</i>

• <b>አሳማኝ የፅሁፍ ጥበብ (Conversion Copywriting):</b> ተመልካችን በስነ-ልቦናዊ መንገድ አሳምኖ ወደ ታማኝ ደንበኛ የሚቀይር ይዘት፡፡
• <b>የማስታወቂያ ልህቀት (Advertising Mastery):</b> ከፍተኛ ትርፍ (ROI) እና ሽያጭ ለማምጣት የታለሙ 5 ማስታወቂያዎችን ማስተዳደር፡፡
• <b>የ GILD ላንዲንግ ፔጅ (Landing Page):</b> ዋና ምርትዎን/አገልግሎትዎን ለመሸጥ የተነደፈ ውብ እና ከፍተኛ ሽያጭ የሚያመጣ ባለ 1-ገፅ ዌብሳይት፡፡
• <b>በአካባቢ ፍለጋ የበላይነት (Local Search):</b> በ Google Maps እና የፍለጋ ሞተሮች (SEO) ላይ ቀዳሚ ተመራጭ እንዲሆኑ ማድረግ፡፡
• <b>የፈጠራ የበላይነት (Creative Dominance):</b> በወር 20+ ልዩ ፖስቶች እና ስቶሪዎች፣ እንዲሁም 1 ፕሮፌሽናል የፎቶ/ቪዲዮ ሹት (Photoshoot)፡፡
• <b>የአፈፃፀም ሪፖርት (Performance Intelligence):</b> የሽያጭ ሂደቱን እና የማስታወቂያውን ውጤት በዝርዝር የሚያሳይ ወርሃዊ ሪፖርት፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_rad_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_rad_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_rad_3' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_24k') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
<i>The ultimate 360-degree VIP experience designed to transform your brand into a market-leading empire.</i>

• <b>Omnichannel Mastery:</b> Daily high-impact posting and full management across all major social media platforms.
• <b>Cinematic Storytelling:</b> 4 commercial-grade, cinematic brand videos that define your industry authority.
• <b>AI-Powered 24/7 Support:</b> Development of a smart AI bot for Telegram/Messenger to automate inquiries and sales leads.
• <b>Sales Ecosystem:</b> Full sales funnel construction, Pixel integration, and advanced retargeting strategies.
• <b>SOP Development:</b> Creation of detailed Standard Operating Procedures for your internal workflow, ensuring business continuity.
• <b>Digital PR & Authority:</b> Strategic placements and mentions to build high-level brand prestige.
• <b>VIP Concierge:</b> 24/7 direct access and priority support for all urgent business needs.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
<i>ብራንድዎን የገበያው መሪ (Market Leader) እና ኢምፓየር ለማድረግ የተዘጋጀ የላቀ የ 360 ዲግሪ VIP አገልግሎት፡፡</i>

• <b>የሁሉም አውታሮች የበላይነት (Omnichannel Mastery):</b> በሁሉም የሶሻል ሚዲያዎች ላይ በየቀኑ ከፍተኛ ተፅዕኖ ፈጣሪ ፖስቶችን ማስተዳደር፡፡
• <b>ሲኒማቲክ ትረካ (Cinematic Storytelling):</b> የኢንዱስትሪውን የበላይነትዎን የሚያሳዩ 4 ለቴሌቪዥን/ማስታወቂያ የሚመጥኑ ሲኒማቲክ ቪዲዮዎች፡፡
• <b>የ AI የ24/7 ድጋፍ (AI Bot):</b> ጥያቄዎችን እና ሽያጮችን በራሱ የሚያስተናግድ ዘመናዊ AI ቦት (Telegram/Messenger) ማበልፀግ፡፡
• <b>የሽያጭ ስነ-ምህዳር (Sales Ecosystem):</b> የተሟላ የሽያጭ ማጥመጃ (Funnel)፣ Pixel እና የላቀ የ Retargeting ስትራቴጂዎች፡፡
• <b>የስራ ሂደት (SOP) ማበልፀግ:</b> እርስዎ ዘወትር ሳይኖሩም ስራው ያለችግር እንዲቀጥል የሚያስችል የውስጥ የስራ አፈፃፀም መመሪያዎችን ማዘጋጀት፡፡
• <b>ዲጂታል PR እና ዝና:</b> የብራንድዎን ከፍተኛ ክብር ለመገንባት ስትራቴጂካዊ የሆኑ የሚዲያ ሽፋን ስራዎች፡፡
• <b>VIP ልዩ ረዳት:</b> ለማንኛውም አጣዳፊ የቢዝነስ ጉዳዮች ቅድሚያ የሚሰጠው የ24/7 ቀጥታ ግንኙነት፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_24k_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_24k_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_24k_3' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    // PRICES AND DURATIONS
    const packageInfo = {
        'dur_lus_1': { price: 20000, name: 'GILD Luster', months: '1' },
        'dur_lus_2': { price: 35000, name: 'GILD Luster', months: '2' },
        'dur_lus_3': { price: 50000, name: 'GILD Luster', months: '3' },
        'dur_rad_1': { price: 35000, name: 'GILD Radiant', months: '1' },
        'dur_rad_2': { price: 65000, name: 'GILD Radiant', months: '2' },
        'dur_rad_3': { price: 90000, name: 'GILD Radiant', months: '3' },
        'dur_24k_1': { price: 70000, name: 'GILD 24K', months: '1' },
        'dur_24k_2': { price: 130000, name: 'GILD 24K', months: '2' },
        'dur_24k_3': { price: 205000, name: 'GILD 24K', months: '3' }
    };

    if (packageInfo[data]) {
        const info = packageInfo[data];
        const formattedPrice = getPrice(info.price, null, chatId);
        const backBtn = data.includes('lus') ? 'pkg_luster' : (data.includes('rad') ? 'pkg_radiant' : 'pkg_24k');
        
        const successText = isEn 
            ? `⚜️ <b>Premium Selection Confirmed.</b>\n\nYou have chosen <b>[ ${info.name} ]</b>.\nDuration: <b>${info.months} Month(s)</b>\n\n<b>Investment:</b> ${formattedPrice}` 
            : `⚜️ <b>የጥራት ምርጫዎ ተረጋግጧል።</b>\n\nየመረጡት ጥቅል፦ <b>[ ${info.name} ]</b>\nየአገልግሎት ጊዜ፦ <b>${info.months} ወር</b>\n\n<b>ኢንቨስትመንት (ዋጋ):</b> ${formattedPrice}`;

        bot.editMessageText(successText, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "💳 PROCEED TO PAYMENT" : "💳 ወደ ክፍያ", callback_data: 'pay_action' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: backBtn }]
                ]
            }
        });
    }

    // SINGLE SERVICES
    if (data === 'single_services') {
        const text = isEn ? 
`<b>Single Services</b> 💎

• <b>Full Brand Identity:</b> ${getPrice(7000, 10000, chatId)}
• <b>Landing Page Website:</b> ${getPrice(10000, 15000, chatId)}
• <b>Full Business Website:</b> ${getPrice(30000, 60000, chatId)}+
• <b>Smart Telegram Bot:</b> ${getPrice(15000, 25000, chatId)}
• <b>LOGO Only:</b> ${getPrice(5000, null, chatId)}
• <b>SEO Only:</b> ${getPrice(3000, null, chatId)}
• <b>Strategy Consulting:</b> ${getPrice(4000, null, chatId)}
• <b>Business Card Design:</b> ${getPrice(2000, null, chatId)}

<i>To commission a service, tap the corresponding command below:</i>
/Brand (Full Identity)
/LandingPage
/Website
/Bot
/Logo
/SEO
/Strategy
/BusinessCard` : 
`<b>ነጠላ አገልግሎቶች (Single Services)</b> 💎

• <b>ሙሉ የብራንድ ግንባታ:</b> ${getPrice(7000, 10000, chatId)}
• <b>ላንዲንግ ፔጅ ዌብሳይት:</b> ${getPrice(10000, 15000, chatId)}
• <b>ሙሉ የቢዝነስ ዌብሳይት:</b> ${getPrice(30000, 60000, chatId)}+
• <b>ዘመናዊ AI ቴሌግራም ቦት:</b> ${getPrice(15000, 25000, chatId)}
• <b>የሎጎ ዲዛይን ብቻ:</b> ${getPrice(5000, null, chatId)}
• <b>SEO ማስተካከል:</b> ${getPrice(3000, null, chatId)}
• <b>የስትራቴጂ ምክር:</b> ${getPrice(4000, null, chatId)}
• <b>የቢዝነስ ካርድ ዲዛይን:</b> ${getPrice(2000, null, chatId)}

<i>አገልግሎት ለማዘዝ ከታች ያሉትን ሊንኮች ይንኩ፡</i>
/Brand (ለሙሉ ማንነት)
/LandingPage
/Website
/Bot
/Logo
/SEO
/Strategy
/BusinessCard`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'service' }]] }
        });
    }

    if (data === 'pay_action') {
        const txt = isEn 
            ? "⚠️ <b>Secure Payment Gateway.</b>\n\nPlease contact our dedicated concierge to finalize your investment: @Farisman72" 
            : "⚠️ <b>ደህንነቱ የተጠበቀ ክፍያ።</b>\n\nክፍያዎን ለማጠናቀቅ እባክዎ ልዩ ረዳታችንን ያነጋግሩ: @Farisman72";
        bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
    }

    // ==== MORE MENU (THE GILD LEGACY) ====
    if (data === 'more') {
        const txt = isEn 
            ? "<b>The GILD Legacy.</b> 🏛️\n\nDive deeper into our story, vision, and the infrastructure that powers our excellence." 
            : "<b>የGILD ማንነት።</b> 🏛️\n\nስለ ታሪካችን፣ ስለ ራዕያችን እና ስለ ስራዎቻችን ዝርዝር መረጃዎችን እዚህ ያገኛሉ።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "ABOUT US" : "ስለ እኛ", callback_data: 'about_us' }, { text: "FAQ", callback_data: 'faq' }],
                    [{ text: isEn ? "OUR STORY" : "ታሪካችን", callback_data: 'story' }, { text: isEn ? "VISION & MISSION" : "ራዕይ እና ተልዕኮ", callback_data: 'vision_mission' }],
                    [{ text: isEn ? "OUR PLATFORM" : "የእኛ ፕላትፎርም", callback_data: 'our_platform' }, { text: isEn ? "SUPPORT" : "ድጋፍ / እገዛ", callback_data: 'support' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'about_us') {
        const fullTextEn = "<b>The GILD Philosophy.</b> ⚜️\n\nGILD is more than an agency; it is a standard of digital excellence. We specialize in elevating brands to their highest potential through minimalist design and strategic precision.\n\n<b>GILD: The Golden Standard</b>\nAt GILD, we believe that every established business has a \"hidden gold\"—a core value that is often obscured by outdated branding and mediocre marketing. Our mission is to peel back those metallic layers and reveal the brilliant gold underneath.\n\nFor startups and visionaries starting from zero, we don't just \"reveal\"—we \"forge.\" We take your raw ideas and transform them into a 24K gold brand identity that commands respect from day one. We are not just a marketing agency; we are the master gilders of the digital age, ensuring your business shines with international quality.";
        
        const fullTextAm = "<b>የGILD ፍልስፍና።</b> ⚜️\n\nGILD ከአንድ ተራ ኤጀንሲ በላይ ነው፤ እርሱ የዲጂታል ልቀት መለኪያ ነው። እኛ ብራንዶችን በረቀቀ ጥበብ እና በስትራቴጂካዊ ጥራት ወደ ላቀ ደረጃ በማድረስ ላይ እንሰራለን።\n\n<b>GILD: ወርቃማው መለኪያ</b>\nበ GILD፣ እያንዳንዱ ትልቅ ቢዝነስ \"የተደበቀ ወርቅ\" እንዳለው እናምናለን—ይህም ጊዜው ባለፈበት ብራንዲንግ እና ተራ ማርኬቲንግ የተሸፈነ እሴት ነው። ተልዕኳችን እነዚህን ደብዛዛ ንብርብሮች ገፈን፣ ከስር ያለውን አንፀባራቂ ወርቅ ማውጣት ነው።\n\nከዜሮ ለሚነሱ አዳዲስ ቢዝነሶች እና ባለ ራዕዮች፣ እኛ ዝም ብለን \"አናወጣም\"—ይልቁንም \"እንቀርጻለን\" (We Forge)። ጥሬ ሀሳብዎን ወስደን ከመጀመሪያው ቀን ጀምሮ ክብርን ወደሚያስገኝ የ 24K ወርቅ ብራንድ ማንነት እንቀይረዋለን። እኛ ተራ የማርኬቲንግ ኤጀንሲ አይደለንም፤ የዲጂታል ዘመን የተዋጣለት አንጥረኞች ነን፤ ቢዝነስዎ በዓለም አቀፍ ደረጃ ጥራቱን ጠብቆ እንዲያንፀባርቅ እናደርጋለን።";

        bot.editMessageText(isEn ? fullTextEn : fullTextAm, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'faq') {
        const fullFaqEn = "<b>Clarity & Precision.</b>\nWe value your time. Find answers to our most common inquiries below:\n\n❓ <b>1. Does GILD only work with Ethiopian clients?</b>\n• No. While our heart is in Addis Ababa, our standards are international. We serve clients globally.\n\n❓ <b>2. Can you help a business starting from zero?</b>\n• Absolutely. We specialize in building strong foundations. We ensure your brand starts with a 24K identity.\n\n❓ <b>3. What is the \"Peeling\" concept in your logo?</b>\n• It represents our process of stripping away ineffective marketing layers to reveal the true value of a business.\n\n❓ <b>4. Do you offer consultation only?</b>\n• Yes. We provide high-level strategic consulting for brands that need direction before execution.\n\n❓ <b>5. Personal Branding: Who do you help?</b>\n• We build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity and a strategic voice.\n\n❓ <b>6. What makes GILD different from other agencies?</b>\n• Most agencies focus on \"posting.\" We focus on \"Gilding\"—a mix of luxury aesthetics, data-driven strategy, and 24/7 automation.\n\n❓ <b>7. How do we get started?</b>\n• It begins with filling out our Onboarding Form, followed by a discovery call.";

        const fullFaqAm = "<b>ግልፅነት እና ጥራት።</b>\nጊዜዎን እናከብራለን። በሚሰጧቸው አገልግሎቶች ዙሪያ በተደጋጋሚ የሚነሱ ጥያቄዎችን እና ምላሾችን ከታች አዘጋጅተናል፡\n\n❓ <b>1. GILD ከኢትዮጵያ ውጭ ካሉ ደንበኞች ጋር ይሰራል?</b>\n• አዎ። ምንም እንኳን ማዕከላችን አዲስ አበባ ቢሆንም፣ ደረጃችን ዓለም አቀፍ ነው።\n\n❓ <b>2. ከዜሮ ለሚነሳ ቢዝነስ ትረዳላችሁ?</b>\n• በእርግጠኝነት። የቢዝነስዎ መሰረት ጠንካራ ሆኖ የ 24K ወርቅ ማንነት እንዲኖረው እናደርጋለን።\n\n❓ <b>3. የሎጎው \"መገፈፍ (Peeling)\" ትርጉም ምንድነው?</b>\n• ውጤታማ ያልሆኑ ማርኬቲንጎችን ገፎ የድርጅትን እውነተኛ እሴት ማውጣት ማለት ነው።\n\n❓ <b>4. የማማከር (Consultation) አገልግሎት ብቻ ትሰጣላችሁ?</b>\n• አዎ። ከፍተኛ ደረጃ ያለው ስትራቴጂካዊ የማማከር ስራ እንሰራለን።\n\n❓ <b>5. በ Personal Branding ማንን ትረዳላችሁ?</b>\n• ፕሮፌሽናሎችን (ስራ አስኪያጆች፣ ዶክተሮች፣ አማካሪዎች) በዘርፋቸው ክብር ያለው ማንነት እንዲገነቡ እንረዳለን።\n\n❓ <b>6. GILDን ከሌሎች ኤጀንሲዎች ምን ይለየዋል?</b>\n• ሌሎች \"ፖስት\" ማድረግ ላይ ያተኩራሉ፤ እኛ በጥበብ ማርኬቲንግን፣ ዳታን፣ እና አውቶሜሽንን በማዋሃድ የላቀ ውጤት እናመጣለን።\n\n❓ <b>7. ስራ ለመጀመር ምን ማድረግ አለብኝ?</b>\n• በመጀመሪያ የመመዝገቢያ ፎርም ይሞላሉ፣ በመቀጠል አብረን ለመስራት የምክክር ውይይት (Call) እናደርጋለን።";

        bot.editMessageText(isEn ? fullFaqEn : fullFaqAm, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'story') {
        const storyEn = "<b>The Genesis of Excellence.</b> 📜\n\n<b>The Alchemy of Brands: Gild</b>\n\n<i>\"True art is seeing the gold hidden in ordinary things.\"</i>\n\nIn ancient times, <b>Alchemy</b> was a deeply guarded philosophy. The ultimate ambition of ancient alchemists was to transform ordinary metals into pure, radiant, and precious gold. This art was not just about changing the surface, but about drawing out the inner essence to reign supreme.\n\nIn today's digital landscape, your business faces the same reality. You might possess the full potential to become a premium brand, yet amidst the endless noise of ordinary advertising, your superior identity might be buried.\n\n<i>\"A jewel dropped in mud does not lose its value, but the mud must be peeled away for it to shine.\"</i>\n\nAt <b>GILD</b>, we consider ourselves modern-day alchemists. Our 'Alchemy' is the process of making your business stand out, command respect, and shine like gold:\n\n<b>1. The Peeling:</b> We strip away the ineffective, outdated layers that obscure your brand's beauty.\n<b>2. The Forging:</b> We forge a new, formidable brand identity guided by psychological strategy.\n<b>3. The Gilding:</b> Finally, we gild your brand, ensuring it commands supreme prestige.\n\n<b>GILD Marketing Agency</b>\n<i>Where Vision Meets Alchemy.</i> ✨";

        const storyAm = "<b>የስኬት መጀመሪያ።</b> 📜\n\n<b>የብራንዶች አልኬሚ (The Alchemy of Brands)</b>\n\n<i>\"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡\"</i>\n\nበጥንታዊው ዘመን፣ <b>አልኬሚ (Alchemy)</b> የሚባል እጅግ ምስጢራዊ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ትልቁ ምኞት፣ ተራ የሆኑትን ብረቶች እና ማዕድናት ወደ ንፁህ፣ አንፀባራቂ እና ውድ ወርቅነት መቀየር ነበር፡፡ ይህ ጥበብ የነገሮችን ላዩን ገፅታ ብቻ ሳይሆን፣ ውስጣዊ ማንነታቸውን አውጥቶ የማንገስ ሂደት ነው፡፡\n\nበዛሬው የዲጂታል ዓለም፣ የእርስዎ ቢዝነስም ይሄው እውነታ ይገጥመዋል፡፡ ምናልባት በድርጅትዎ ውስጥ ትልቅ 'Premium' ብራንድ የመሆን ሙሉ እምቅ አቅም ታምቆ ይገኛል፡፡ ነገር ግን በተለመዱ ማስታወቂያዎች ጋጋታ ውስጥ ያ የላቀ ማንነትዎ ተቀብሮ ሊሆን ይችላል፡፡\n\n<i>\"ዕንቁ በጭቃ ውስጥ ቢወድቅም እሴቱን አያጣም፤ ነገር ግን እንዲያበራ ጭቃው መገፈፍ አለበት፡፡\"</i>\n\nእኛ በ <b>GILD</b>፣ እራሳችንን እንደ ዘመኑ አልኬሚስቶች እንቆጥራለን፡፡ የእኛ 'አልኬሚ' የእርስዎን ቢዝነስ ከሌሎች ተለይቶ እንዲታይ፣ እንዲከበር እና እንደ ወርቅ እንዲያንፀባርቅ የማድረግ ሂደት ነው፦\n\n<b>1. መገፈፍ (The Peeling):</b> የቆዩ እና የብራንድዎን ውበት የሸፈኑ 'ብረታማ' ንብርብሮችን እንገፍፋለን፡፡\n<b>2. መቅረጽ (The Forging):</b> በስነ-ልቦናዊ ስትራቴጂ ጠንካራ የብራንድ ማንነት እንቀርጻለን፡፡\n<b>3. መለበጥ (The Gilding):</b> ብራንድዎ በገበያው ውስጥ የላቀ ክብር እንዲኖረው እናደርጋለን፡፡\n\n<b>GILD Marketing Agency</b>\n<i>Where Vision Meets Alchemy.</i> ✨";

        bot.editMessageText(isEn ? storyEn : storyAm, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'vision_mission') {
        const txt = isEn 
            ? "<b>Architecting the Future.</b> 🔭\n\nOur mission is to redefine market standards, while our vision looks toward a future where every partner brand stands as a symbol of luxury and success." 
            : "<b>የወደፊቱን መገንባት።</b> 🔭\n\nተልዕኳችን የገበያ መለኪያዎችን ዳግም መተርጎም ሲሆን፣ ራዕያችን ደግሞ እያንዳንዱ አጋር ብራንድ የልህቀት እና የስኬት ምልክት ሆኖ የሚታይበትን ቀን ማሳካት ነው።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "VISION" : "ራዕይ", callback_data: 'vision_btn' }, { text: isEn ? "MISSION" : "ተልዕኮ", callback_data: 'mission_btn' }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'vision_btn') {
        const textEn = "<b>Our Vision</b> 👁️\n\n\"To be the premier agency of choice in digital alchemy and psychological marketing, transforming businesses with hidden potential into globally recognized, influential, and premium brands.\"";
        const textAm = "<b>ራዕይ (Our Vision)</b> 👁️\n\n\"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።\"";
        
        bot.editMessageText(isEn ? textEn : textAm, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'vision_mission' }]] } 
        });
    }

    if (data === 'mission_btn') {
        const textEn = "<b>Our Mission</b> 🎯\n\n\"By deeply understanding the unique identity and value of our clients, we empower their untapped potential through creative artistry and scientific psychological strategy—gilding their brands. Every piece of content we create ensures the sustainable growth of our clients' prestige, credibility, and business success.\"\n\n<b>Our Core Values</b>\n• <b>Integrity:</b> We deliver results based on research, not empty promises.\n• <b>Excellence:</b> Work that reflects the absolute quality of a premium brand.\n• <b>Psychological Insight:</b> Integrating marketing with human psychology.\n• <b>Transformative:</b> Turning the ordinary into precious gold.";
        
        const textAm = "<b>ተልዕኮ (Our Mission)</b> 🎯\n\n\"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)። እያንዳንዱ የምንፈጥረው ይዘት የደንበኞቻችንን ክብር፣ ተአማኒነት እና የንግድ ስኬት በዘላቂነት እንዲያድግ ማድረግ፡፡\"\n\n<b>የተቋማችን እሴቶች (Our Core Values)</b>\n• <b>ተአማኒነት (Integrity):</b> የተጋነነ ባዶ ተስፋ ሳይሆን፣ ጥናት ላይ የተመሰረተ ውጤት፡፡\n• <b>የላቀ ጥራት (Excellence):</b> የ \"Premium\" ብራንድ መገለጫ የሆነ ጥራት፡፡\n• <b>ስነ-ልቦናዊ ግንዛቤ:</b> የሰውን ልጅ አእምሮ የሚገዛ ስነ-ልቦናዊ ሳይንስ ከማርኬቲንግ ጋር፡፡\n• <b>ለውጥ አምጪነት:</b> ተራውን ወደ ውድ ወርቅነት መቀየር፡፡";

        bot.editMessageText(isEn ? textEn : textAm, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'vision_mission' }]] } 
        });
    }

    if (data === 'our_platform') {
        const txt = isEn 
            ? "<b>Advanced Infrastructure.</b> 🌐\n\nExplore the sophisticated tools and digital frameworks we utilize to power your brand’s growth." 
            : "<b>ዘመናዊ መሠረተ-ልማት።</b> 🌐\n\nየብራንድዎን እድገት ለማፋጠን እና ደረጃውን የጠበቀ እንዲሆን የምንጠቀምባቸውን የዲጂታል አውታሮች እዚህ ያገኛሉ።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "FACEBOOK", url: "https://www.facebook.com/share/18Ph7UH2Xq/" }, { text: "TELEGRAM", url: "https://t.me/gild_agency" }],
                    [{ text: "TIKTOK", url: "https://www.tiktok.com/@gild.agency" }, { text: "INSTAGRAM", url: "https://www.instagram.com/gild_agency" }],
                    [{ text: "X / TWITTER", url: "https://x.com/Gild_Agency" }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'support') {
        const txt = isEn 
            ? "<b>Dedicated Concierge.</b> 🛎️\n\nExceptional service requires exceptional attention. Our dedicated support team is available to assist you." 
            : "<b>ልዩ የድጋፍ አገልግሎት።</b> 🛎️\n\nየላቀ አገልግሎት ልዩ ትኩረትን ይሻል። የእኛ የድጋፍ ቡድን ለማንኛውም አይነት ጥያቄ ዝግጁ ሆኖ ይጠብቅዎታል።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "TELEGRAM CONCIERGE", url: "https://t.me/Farisman72" }],
                    [{ text: isEn ? "🔙 BACK" : "🔙 ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }
});

function handleIndividualCommands(chatId, text) {
    const isEn = usersLang[chatId] === 'EN';
    let responseText = "";
    let priceText = "";

    switch(text.toLowerCase()) {
        case '/brand':
            responseText = isEn ? "<b>Full Brand Identity (Logo + Brand Book)</b>" : "<b>ሙሉ የብራንድ ግንባታ (Logo + Brand Book)</b>";
            priceText = getPrice(7000, 10000, chatId);
            break;
        case '/landingpage':
            responseText = isEn ? "<b>Landing Page Website (1 Page)</b>" : "<b>ላንዲንግ ፔጅ ዌብሳይት (ባለ 1 ገጽ)</b>";
            priceText = getPrice(10000, 15000, chatId);
            break;
        case '/website':
            responseText = isEn ? "<b>Full Business Website</b>" : "<b>ሙሉ የቢዝነስ ዌብሳይት (ባለብዙ ገጽ)</b>";
            priceText = getPrice(30000, 60000, chatId) + "+";
            break;
        case '/bot':
            responseText = isEn ? "<b>Smart Telegram Bot (AI Integrated)</b>" : "<b>ዘመናዊ የቴሌግራም ቦት ከ AI ጋር</b>";
            priceText = getPrice(15000, 25000, chatId);
            break;
        case '/logo':
            responseText = isEn ? "<b>LOGO Design Only</b>" : "<b>የ ሎጎ (LOGO) ዲዛይን ብቻ</b>";
            priceText = getPrice(5000, null, chatId);
            break;
        case '/seo':
            responseText = "<b>SEO (Search Engine Optimization)</b>";
            priceText = getPrice(3000, null, chatId);
            break;
        case '/strategy':
            responseText = isEn ? "<b>Strategy Consulting</b>" : "<b>የስትራቴጂ እና ማርኬቲንግ ምክር</b>";
            priceText = getPrice(4000, null, chatId);
            break;
        case '/businesscard':
            responseText = "<b>Business Card Design</b>";
            priceText = getPrice(2000, null, chatId);
            break;
        default:
            return; 
    }

    bot.sendMessage(chatId, `⚜️ ${responseText}\n\n<b>${isEn ? "Investment:" : "ኢንቨስትመንት (ዋጋ):"}</b> ${priceText}`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: isEn ? "💳 PROCEED TO PAYMENT" : "💳 ወደ ክፍያ", callback_data: 'pay_action' }]
            ]
        }
    });
}
