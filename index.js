require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const usersState = {};
const usersData = {};
const usersCurrency = {}; 
const usersLang = {};

const RATE = 160; 

// የጎንዮሽ Menu ለማስተካከል (የቴሌግራም ዋና ሜኑ በተጠቃሚው ስክሪን ላይ እንዲወጣ)
bot.setMyCommands([
    { command: '/start', description: 'ዋና ገፅ / Main Menu' },
    { command: '/language', description: 'ቋንቋ ለመቀየር / Change Language' },
    { command: '/currency', description: 'መገበያያ ለመቀየር / Change Currency' },
    { command: '/individuals', description: 'የግል አገልግሎቶች / Individual Services' }
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
            [{ text: isEn ? "⚜️ SERVICES" : "⚜️ አገልግሎቶች", callback_data: 'service' }],
            [{ text: isEn ? "🏛️ THE GILD LEGACY" : "🏛️ የGILD ማንነት", callback_data: 'more' }]
        ]
    };
}

// /start Command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    usersCurrency[chatId] = 'ETB'; 
    usersLang[chatId] = 'AM'; // Default Amharic
    
    // የድሮውን ተራ ኪቦርድ ለማጥፋት
    bot.sendMessage(chatId, "...", { reply_markup: { remove_keyboard: true } }).then((m) => {
        bot.deleteMessage(chatId, m.message_id);
    });

    sendLanguageSelection(chatId);
});

bot.onText(/\/language/, (msg) => sendLanguageSelection(msg.chat.id));

function sendLanguageSelection(chatId) {
    const text = "Welcome to <b>GILD</b>. A standard of excellence in every interaction. Please select your preferred language to proceed.\n\n<b>GILD</b> እንኳን በደህና መጡ። የላቀ ጥራትን ከክብር ጋር ያጣመረ አገልግሎት። ለመቀጠል እባክዎ የሚመርጡትን ቋንቋ ይምረጡ።";
    
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
            ? "<b>Live Market Rates.</b>\nOur services are valued based on current global standards. Please choose your preferred currency.\n\n(Exchange rate: 1 USD = 160 ETB)" 
            : "<b>ወቅታዊ የገበያ ተመን።</b>\nአገልግሎቶቻችን ዓለም አቀፍ ደረጃን በጠበቀ ዋጋ የቀረቡ ናቸው። እባክዎ የሚከፍሉበትን ገንዘብ አይነት ይምረጡ።\n\n(የምንዛሬ ተመን: 1 USD = 160 ETB)";
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
            ? "<b>Contact Information.</b>\nPlease provide your direct phone number for our concierge to reach you:" 
            : "<b>የመገናኛ መረጃ።</b>\nልዩ ረዳታችን (Concierge) ሊያገኝዎ የሚችልበትን ትክክለኛ ስልክ ቁጥርዎን ያስገቡ፡";
        bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
    } 
    else if (state === 'AWAITING_PHONE') {
        usersData[chatId].phone = text;
        usersState[chatId] = 'AWAITING_ADDRESS';
        const txt = isEn 
            ? "<b>Location.</b>\nPlease select your primary city of operation:" 
            : "<b>አድራሻ።</b>\nእባክዎ የሚገኙበትን ከተማ ከስር ይምረጡ፡";
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
            ? "<b>Brand Architecture.</b>\nWhat is the core focus of your vision?" 
            : "<b>የብራንድ ትኩረት።</b>\nየእርስዎ ራዕይ የትኛው ላይ ያተኮረ ነው?";
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
            ? "Explore the <b>GILD Ecosystem</b>.\nHow may we elevate your vision today? Select an option below to begin your journey." 
            : "የ<b>GILD</b>ን አለም ይቃኙ።\nዛሬ ራዕይዎን ለማሳካት በምን እንርዳዎት? ጉዞዎን ለመጀመር ከታች ካሉት አማራጮች አንዱን ይምረጡ።";
        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
        return;
    }

    // Currency Setting
    if (data === 'set_curr_usd' || data === 'set_curr_etb') {
        usersCurrency[chatId] = data === 'set_curr_usd' ? 'USD' : 'ETB';
        const txt = isEn ? `Currency updated to <b>${usersCurrency[chatId]}</b>.` : `መገበያያዎ ወደ <b>${usersCurrency[chatId]}</b> ተቀይሯል።`;
        
        const msgTxt = isEn 
            ? `${txt}\n\nExplore the <b>GILD Ecosystem</b>.\nSelect an option below:` 
            : `${txt}\n\nየ<b>GILD</b>ን አለም ይቃኙ።\nከታች ካሉት አማራጮች ይምረጡ፡`;

        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
        return;
    }

    if (data === 'main_menu') {
        usersState[chatId] = null;
        const msgTxt = isEn 
            ? "Explore the <b>GILD Ecosystem</b>.\nHow may we elevate your vision today?" 
            : "የ<b>GILD</b>ን አለም ይቃኙ።\nዛሬ ራዕይዎን ለማሳካት በምን እንርዳዎት?";
        bot.editMessageText(msgTxt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
    }

    // ==== FORM ====
    if (data === 'fill_form' || data === 'edit_form') {
        usersData[chatId] = { isComplete: false };
        usersState[chatId] = 'AWAITING_NAME';
        const txt = isEn 
            ? "<b>Exclusivity begins here.</b>\nTo provide you with a personalized experience, please share your full name (e.g., Abebe Kebede):" 
            : "<b>ልዩነት ከዚህ ይጀምራል።</b>\nእርሶን የሚመጥን አገልግሎት ለመስጠት እንዲቻል፣ እባክዎ ሙሉ ስምዎን ያስገቡ (ለምሳሌ፦ አበበ ከበደ)።";
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' });
    }

    if (data.startsWith('city_')) {
        usersData[chatId].address = data.split('_')[1];
        usersState[chatId] = 'AWAITING_BRAND';
        const txt = isEn 
            ? `<b>Location Confirmed.</b>\nPlease provide the official name of your Brand/Business:` 
            : `<b>አድራሻዎ ተረጋግጧል።</b>\nእባክዎ የብራንድዎን ወይም የድርጅትዎን ትክክለኛ ስም ከስር ያስገቡ፡`;
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' });
    }

    if (data === 'my_form') {
        const d = usersData[chatId];
        const text = isEn ? 
            `<b>Review Your Profile.</b>\nPlease confirm the details below before we proceed with your request.\n\n<b>Name:</b> ${d.name}\n<b>Phone:</b> ${d.phone}\n<b>Location:</b> ${d.address}\n<b>Brand:</b> ${d.brand}\n<b>Focus:</b> ${d.needs}` : 
            `<b>መረጃዎን ያረጋግጡ።</b>\nጥያቄዎን ከማስተናገዳችን በፊት፣ እባክዎ ከታች ያሉትን መረጃዎች ትክክለኛነት ያረጋግጡ።\n\n<b>ስም:</b> ${d.name}\n<b>ስልክ:</b> ${d.phone}\n<b>አድራሻ:</b> ${d.address}\n<b>ብራንድ:</b> ${d.brand}\n<b>ትኩረት:</b> ${d.needs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "EDIT PROFILE" : "መረጃ አስተካክል", callback_data: 'edit_form' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'main_menu' }]
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
            ? "⚜️ <b>Profile Registered Successfully.</b>\nReturning to the GILD Ecosystem." 
            : "⚜️ <b>መረጃዎ በክብር ተመዝግቧል።</b>\nወደ ዋናው ማውጫ እየተመለሱ ነው።";
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
    }

    // ==== SERVICE ====
    if (data === 'service') {
        const txt = isEn 
            ? "<b>Tailored Solutions.</b>\nDiscover our bespoke service tiers designed to accelerate your growth and refine your presence." 
            : "<b>ልዩ የአገልግሎት ምርጫዎች።</b>\nየንግድዎን እድገት የሚያፋጥኑ እና ጥራትዎን የሚገልጹ ልዩ ጥቅሎቻችንን እዚህ ያገኛሉ።";
        
        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📦 PACKAGES", callback_data: 'packages' }],
                    [{ text: "👤 INDIVIDUAL SERVICES", callback_data: 'individuals' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'packages') {
        const txt = isEn ? "<b>Select a Service Tier:</b>" : "<b>የአገልግሎት ጥቅል ይምረጡ:</b>";
        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (The Foundation)", callback_data: 'pkg_luster' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (Growth Accelerator)", callback_data: 'pkg_radiant' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (The Empire Builder)", callback_data: 'pkg_24k' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'service' }]
                ]
            }
        });
    }

    // PACKAGES DETAILS
    if (data === 'pkg_luster') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
<i>A foundational suite designed to prepare your business for the market with an undeniable premium presence.</i>

• <b>Brand Architecture:</b> Visual identity setup including logo, colors, and typography.
• <b>Digital Authority:</b> Optimization of FB, IG, and TikTok profiles.
• <b>Strategic Content:</b> 12 striking graphic posts and 2 short-form videos per month.
• <b>Consultation:</b> Monthly strategy session to review performance.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
<i>ቢዝነስዎን ውብ እና ፕሮፌሽናል በሆነ መልኩ ለገበያ ለማቅረብ የተዘጋጀ መሰረታዊ ፓኬጅ፡፡</i>

• <b>የብራንድ ውበት:</b> የሎጎ ዲዛይን፣ የከለር እና የፅሁፍ ስታይል ምርጫን ያካተተ ሙሉ ማንነት፡፡
• <b>ዲጂታል ገፅታ:</b> የፌስቡክ፣ ኢንስታግራም እና ቲክቶክ ገፆችን ጥራት ባለው መልኩ ማዘጋጀት፡፡
• <b>የፖስት ስራዎች:</b> በወር 12 ማራኪ ፖስቶች እና 2 አጫጭር ቪዲዮዎች (Reels/Tiktok)፡፡
• <b>የእድገት ምክክር:</b> በየወሩ የቢዝነስዎን ዲጂታል ጉዞ የሚገመግም የስትራቴጂ ውይይት፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_lus_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_lus_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_lus_3' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_radiant') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
<i>An aggressive growth accelerator engineered to convert visibility into measurable sales.</i>

• <b>Copywriting:</b> Psychological content creation designed to turn spectators into loyal clients.
• <b>Advertising Mastery:</b> Management of 5 targeted ad campaigns for maximum ROI.
• <b>Landing Page:</b> A luxury, high-conversion single-page website to sell your offer.
• <b>Creative Dominance:</b> 20+ custom posts per month, plus one photoshoot session.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
<i>እይታን ወደ እውነተኛ ሽያጭ ለመቀየር የተሰራ ጠንካራ የሽያጭ ማሳደጊያ ስትራቴጂ፡፡</i>

• <b>አሳማኝ ፅሁፎች:</b> አንባቢን ስነ-ልቦናዊ በሆነ መንገድ አሳምኖ ደንበኛ የሚያደርግ የፅሁፍ ጥበብ፡፡
• <b>ማስታወቂያ አስተዳደር:</b> ከፍተኛ ትርፍ (ROI) የሚያመጡ 5 የታለሙ ማስታወቂያዎች፡፡
• <b>ላንዲንግ ፔጅ:</b> ዋና ምርትዎን የሚሸጥ እጅግ ማራኪ ባለ 1-ገፅ ዌብሳይት፡፡
• <b>የይዘት የበላይነት:</b> በወር ከ 20 በላይ ፖስቶች እና አንድ ፕሮፌሽናል የፎቶ/ቪዲዮ ሹት፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_rad_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_rad_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_rad_3' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_24k') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
<i>The ultimate 360-degree VIP experience designed to transform your brand into a market leader.</i>

• <b>Omnichannel Mastery:</b> Daily high-impact posting across all platforms.
• <b>Cinematic Storytelling:</b> 4 commercial-grade, cinematic brand videos.
• <b>AI Support:</b> Smart Telegram/Messenger AI bot to automate inquiries.
• <b>Sales Ecosystem:</b> Full funnel construction and advanced retargeting.
• <b>VIP Concierge:</b> 24/7 direct access and priority support.

<b>Select Duration:</b>` : 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
<i>ብራንድዎን የገበያው መሪ (Market Leader) ለማድረግ የተዘጋጀ የላቀ የ VIP አገልግሎት፡፡</i>

• <b>ሙሉ አስተዳደር:</b> በሁሉም የሶሻል ሚዲያ አማራጮች በየቀኑ ፖስት ማድረግ እና ማስተዳደር፡፡
• <b>ሲኒማቲክ ቪዲዮ:</b> ለቴሌቪዥን በሚመጥን ጥራት የተሰሩ 4 አጫጭር የብራንድ ቪዲዮዎች፡፡
• <b>የ AI ቦት:</b> የደንበኞችን ጥያቄ 24/7 በራሱ የሚመልስ ዘመናዊ AI Telegram ቦት፡፡
• <b>የሽያጭ ሲስተም:</b> ደንበኛን አሳድኖ የሚያመጣ የተሟላ የሽያጭ ማጥመጃ ስትራቴጂ፡፡
• <b>VIP ድጋፍ:</b> ቅድሚያ የሚሰጠው እና በማንኛውም ሰዓት (24/7) የቀጥታ ድጋፍ፡፡

<b>የአገልግሎት ጊዜ ይምረጡ:</b>`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 MONTH" : "1 ወር", callback_data: 'dur_24k_1' }, { text: isEn ? "2 MONTHS" : "2 ወር", callback_data: 'dur_24k_2' }, { text: isEn ? "3 MONTHS" : "3 ወር", callback_data: 'dur_24k_3' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    // PRICES AND DURATIONS (Premium Output)
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
        
        // Removed "እንኳን ደስ አሎት" - Premium presentation
        const successText = isEn 
            ? `⚜️ <b>Premium Selection Confirmed.</b>\n\nYou have chosen <b>[ ${info.name} ]</b>.\nDuration: <b>${info.months} Month(s)</b>\n\n<b>Investment:</b> ${formattedPrice}` 
            : `⚜️ <b>የጥራት ምርጫዎ ተረጋግጧል።</b>\n\nየመረጡት ጥቅል፦ <b>[ ${info.name} ]</b>\nየአገልግሎት ጊዜ፦ <b>${info.months} ወር</b>\n\n<b>ኢንቨስትመንት:</b> ${formattedPrice}`;

        bot.editMessageText(successText, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "💳 PROCEED TO PAYMENT" : "💳 ወደ ክፍያ", callback_data: 'pay_action' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: backBtn }]
                ]
            }
        });
    }

    if (data === 'individuals') {
        const text = isEn ? 
`<b>Individual Services</b>

• Full Brand Identity: ${getPrice(7000, 10000, chatId)}
• Landing Page Website: ${getPrice(10000, 15000, chatId)}
• Full Business Website: ${getPrice(30000, 60000, chatId)}+
• Smart Telegram Bot: ${getPrice(15000, 25000, chatId)}
• LOGO Only: ${getPrice(5000, null, chatId)}
• SEO Only: ${getPrice(3000, null, chatId)}
• Strategy Consulting: ${getPrice(4000, null, chatId)}
• Business Card Design: ${getPrice(2000, null, chatId)}

<i>To commission a service, tap the corresponding command:</i>
/Brand (Full Identity)
/LandingPage
/Website
/Bot
/Logo
/SEO
/Strategy
/BusinessCard` : 
`<b>ነጠላ አገልግሎቶች (Individual Services)</b>

• ሙሉ የብራንድ ግንባታ: ${getPrice(7000, 10000, chatId)}
• ላንዲንግ ፔጅ ዌብሳይት: ${getPrice(10000, 15000, chatId)}
• ሙሉ የቢዝነስ ዌብሳይት: ${getPrice(30000, 60000, chatId)}+
• ዘመናዊ AI ቴሌግራም ቦት: ${getPrice(15000, 25000, chatId)}
• የሎጎ ዲዛይን ብቻ: ${getPrice(5000, null, chatId)}
• SEO ማስተካከል: ${getPrice(3000, null, chatId)}
• የስትራቴጂ ምክር: ${getPrice(4000, null, chatId)}
• የቢዝነስ ካርድ ዲዛይን: ${getPrice(2000, null, chatId)}

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
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'service' }]] }
        });
    }

    if (data === 'pay_action') {
        const txt = isEn 
            ? "<b>Secure Payment Gateway.</b>\nPlease contact our dedicated concierge to finalize your investment: @Farisman72" 
            : "<b>ደህንነቱ የተጠበቀ ክፍያ።</b>\nክፍያዎን ለማጠናቀቅ እባክዎ ልዩ ረዳታችንን ያነጋግሩ: @Farisman72";
        bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
    }

    // ==== MORE MENU (THE GILD LEGACY) ====
    if (data === 'more') {
        const txt = isEn 
            ? "<b>The GILD Legacy.</b>\nDive deeper into our story, vision, and the infrastructure that powers our excellence." 
            : "<b>የGILD ማንነት።</b>\nስለ ታሪካችን፣ ስለ ራዕያችን እና ስለ ስራዎቻችን ዝርዝር መረጃዎችን እዚህ ያገኛሉ።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ABOUT US", callback_data: 'about_us' }, { text: "FAQ", callback_data: 'faq' }],
                    [{ text: "STORY", callback_data: 'story' }, { text: "VISION & MISSION", callback_data: 'vision_mission' }],
                    [{ text: "OUR PLATFORM", callback_data: 'our_platform' }, { text: "SUPPORT", callback_data: 'support' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'about_us') {
        const introEn = "<b>The GILD Philosophy.</b>\nGILD is more than an agency; it is a standard of digital excellence. We specialize in elevating brands to their highest potential through minimalist design and strategic precision. Discover what defines us.\n\n";
        const introAm = "<b>የGILD ፍልስፍና።</b>\nGILD ከአንድ ተራ ኤጀንሲ በላይ ነው፤ እርሱ የዲጂታል ልቀት መለኪያ ነው። እኛ ብራንዶችን በረቀቀ ጥበብ እና በስትራቴጂካዊ ጥራት ወደ ላቀ ደረጃ በማድረስ ላይ እንሰራለን። ማንነታችንን ከታች ይረዱ።\n\n";
        
        const fullText = `<b>GILD: The Golden Standard</b>\nAt GILD, we believe that every established business has a "hidden gold"—a core value that is often obscured by outdated branding and mediocre marketing. Our mission is to peel back those metallic layers and reveal the brilliant gold underneath. For startups and visionaries starting from zero, we don't just "reveal"—we "forge." We take your raw ideas and transform them into a 24K gold brand identity that commands respect from day one. We are not just a marketing agency; we are the master gilders of the digital age, ensuring your business shines with international quality.`;

        bot.editMessageText((isEn ? introEn : introAm) + fullText, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'faq') {
        const introEn = "<b>Clarity & Precision.</b>\nWe value your time. To ensure a seamless experience, we have curated answers to the most common inquiries regarding our elite services. Find your answers below.\n\n";
        const introAm = "<b>ግልፅነት እና ጥራት።</b>\nጊዜዎን እናከብራለን። ግልፅ የሆነ መረጃ እንዲኖርዎት በሚሰጧቸው አገልግሎቶች ዙሪያ በተደጋጋሚ የሚነሱ ጥያቄዎችን እና ምላሾችን እንደሚከተለው አዘጋጅተናል።\n\n";

        const fullFaq = `<b>1. Does GILD only work with Ethiopian clients?</b>
• No. While our heart is in Addis Ababa, our standards are international. We serve clients globally, bridging the gap between local insight and world-class execution.

<b>2. Can you help a business starting from zero?</b>
• Absolutely. We specialize in building strong foundations. We ensure that your brand starts with a 24K identity, saving you from expensive rebrands later.

<b>3. What is the "Peeling" concept in your logo?</b>
• It represents our process of stripping away ineffective marketing layers to reveal the true value of a business.

<b>4. Do you offer consultation only?</b>
• Yes. We provide high-level strategic consulting for brands that need direction before execution.

<b>5. Personal Branding: Who do you help?</b>
• We build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity and a strategic voice that commands respect.

<b>6. What makes GILD different from other agencies?</b>
• Most agencies focus on "posting." We focus on "Gilding"—a mix of luxury aesthetics, data-driven strategy, and 24/7 automation.

<b>7. How do we get started?</b>
• It begins with filling out our Onboarding Form, followed by a discovery call to align our visions.`;

        bot.editMessageText((isEn ? introEn : introAm) + fullFaq, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'story') {
        const introEn = "<b>The Genesis of Excellence.</b>\nEvery great brand starts with a vision. Journey through the evolution of GILD—from a bold idea to a leading force in luxury digital marketing.\n\n";
        const introAm = "<b>የስኬት መጀመሪያ።</b>\nእያንዳንዱ ትልቅ ብራንድ በአንድ ራዕይ ይጀምራል። GILD ከደፋር ሀሳብ ተነስቶ የቅንጡ ዲጂታል ማርኬቲንግ ግንባር ቀደም መሪ እስከሆነበት ድረስ ያለውን ጉዞ ይቃኙ።\n\n";

        const fullStory = `<b>The Alchemy of Brands: Gild</b>\n\n<i>"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡"</i>\n\nበጥንታዊው ዘመን፣ <b>አልኬሚ (Alchemy)</b> የሚባል እጅግ ምስጢራዊ እና ጥልቅ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ትልቁ ምኞት እና ጥበብ፣ ተራ የሆኑትን ብረቶች እና ማዕድናት ወደ ንፁህ፣ አንፀባራቂ እና ውድ ወርቅነት መቀየር ነበር፡፡ ይህ ጥበብ የነገሮችን ላዩን ገፅታ ብቻ ሳይሆን፣ ውስጣዊ ማንነታቸውን አውጥቶ የማንገስ ሂደት ነው፡፡\n\nበዛሬው የዲጂታል እና የሶሻል ሚዲያ ዓለም፣ የእርስዎ ቢዝነስም ይሄው እውነታ ይገጥመዋል፡፡ ምናልባት እጅግ ድንቅ የሆነ ምርት አልዎት፤ ወደር የማይገኝለት አገልግሎት ይሰጣሉ፤ ወይንም በድርጅትዎ ውስጥ ትልቅ 'Premium' ብራንድ የመሆን ሙሉ እምቅ አቅም ታምቆ ይገኛል፡፡ ነገር ግን፣ በሶሻል ሚዲያው ማለቂያ የሌለው ጫጫታ እና በተለመዱ፣ ርካሽ ማስታወቂያዎች ጋጋታ ውስጥ ያ የላቀ ማንነትዎ ተቀብሮ፣ ትኩረት አጥቶ እና ገና ሳይወጣ ቀርቶ ሊሆን ይችላል፡፡\n\n<i>"ዕንቁ በጭቃ ውስጥ ቢወድቅም እሴቱን አያጣም፤ ነገር ግን እንዲያበራ ጭቃው መገፈፍ አለበት፡፡"</i>\n\nእኛ በ <b>GILD</b>፣ እራሳችንን እንደ ዘመኑ አልኬሚስቶች እንቆጥራለን፡፡ ስራችን ዝም ብሎ ዲዛይን ማድረግ ወይም ፖስት መለጠፍ አይደለም፡፡ የእኛ 'አልኬሚ' (Alchemy) የእርስዎን ቢዝነስ ከሌሎች ተለይቶ እንዲታይ፣ እንዲከበር እና እንደ ወርቅ እንዲያንፀባርቅ የማድረግ ሂደት ነው፡፡\n\n<b>Gild</b> ማለት አንድን ነገር በወርቅ መለበጥ፣ ማስዋብ እና ውድ እንዲመስል ማድረግ ማለት ነው፡፡ እኛም የምናደርገው ይሄንን ነው፦\n\n1. <b>መገፈፍ (The Peeling):</b> ውጤታማ ያልሆኑ፣ የቆዩ እና የብራንድዎን ውበት የሸፈኑ 'ብረታማ' ንብርብሮችን እንገፍፋለን፡፡\n2. <b>መቅረጽ (The Forging):</b> በስነ-ልቦናዊ ስትራቴጂ እና በፈጠራ ጥበብ የታጀበ አዲስ እና ጠንካራ የብራንድ ማንነት እንቀርጻለን፡፡\n3. <b>መለበጥ (The Gilding):</b> በመጨረሻም ብራንድዎ በገበያው ውስጥ የላቀ ክብር እንዲኖረው እና እንደ ወርቅ አንፀባርቆ እንዲታይ እናደርጋለን፡፡\n\nየእርስዎ ቢዝነስ ተራ ብረት ሆኖ እንዲቀር አንፈቅድም፡፡ እኛ ጋር ሲመጡ፣ ቪዥንዎን ወደ ወርቅ እንቀይረዋለን፡፡\n\n<b>GILD Marketing Agency</b>\n<i>Where Vision Meets Alchemy.</i>`;

        bot.editMessageText((isEn ? introEn : introAm) + fullStory, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]] } 
        });
    }

    if (data === 'vision_mission') {
        const txt = isEn 
            ? "<b>Architecting the Future.</b>\nOur mission is to redefine market standards, while our vision looks toward a future where every partner brand stands as a symbol of luxury and success." 
            : "<b>የወደፊቱን መገንባት።</b>\nተልዕኳችን የገበያ መለኪያዎችን ዳግም መተርጎም ሲሆን፣ ራዕያችን ደግሞ እያንዳንዱ አጋር ብራንድ የልህቀት እና የስኬት ምልክት ሆኖ የሚታይበትን ቀን ማሳካት ነው።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "VISION", callback_data: 'vision_btn' }, { text: "MISSION", callback_data: 'mission_btn' }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'vision_btn') {
        const text = `<b>ራዕይ (Our Vision)</b>\n\n"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።"`;
        bot.editMessageText(text, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'vision_mission' }]] } 
        });
    }

    if (data === 'mission_btn') {
        const text = `<b>ተልዕኮ (Our Mission)</b>\n\n"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)። እያንዳንዱ የምንፈጥረው ይዘት እና የምንቀርጸው ማስታወቂያ የደንበኞቻችንን ክብር፣ ተአማኒነት እና የንግድ ስኬት በዘላቂነት እንዲያድግ ማድረግ፡፡"\n\n<b>የተቋማችን እሴቶች (Our Core Values)</b>\n• <b>ተአማኒነት (Integrity):</b> የተጋነነ ባዶ ተስፋ ሳይሆን፣ ጥናት ላይ የተመሰረተ ውጤት፡፡\n• <b>የላቀ ጥራት (Excellence):</b> የ "Premium" ብራንድ መገለጫ የሆነ ጥራት፡፡\n• <b>ስነ-ልቦናዊ ግንዛቤ:</b> የሰውን ልጅ አእምሮ የሚገዛ ስነ-ልቦናዊ ሳይንስ ከማርኬቲንግ ጋር፡፡\n• <b>ለውጥ አምጪነት:</b> ተራውን ወደ ውድ ወርቅነት መቀየር፡፡`;
        bot.editMessageText(text, { 
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML', 
            reply_markup: { inline_keyboard: [[{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'vision_mission' }]] } 
        });
    }

    if (data === 'our_platform') {
        const txt = isEn 
            ? "<b>Advanced Infrastructure.</b>\nExplore the sophisticated tools and digital frameworks we utilize to power your brand’s growth and maintain its elite positioning." 
            : "<b>ዘመናዊ መሠረተ-ልማት።</b>\nየብራንድዎን እድገት ለማፋጠን እና ደረጃውን የጠበቀ እንዲሆን የምንጠቀምባቸውን የተራቀቁ ዲጂታል መሳሪያዎች እና አሰራሮች እዚህ ያገኛሉ።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "FACEBOOK", url: "https://www.facebook.com/share/18Ph7UH2Xq/" }, { text: "TELEGRAM", url: "https://t.me/gild_agency" }],
                    [{ text: "TIKTOK", url: "https://www.tiktok.com/@gild.agency" }, { text: "INSTAGRAM", url: "https://www.instagram.com/gild_agency" }],
                    [{ text: "X / TWITTER", url: "https://x.com/Gild_Agency" }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'support') {
        const txt = isEn 
            ? "<b>Dedicated Concierge.</b>\nExceptional service requires exceptional attention. Our dedicated support team is available to assist you with any bespoke requirements or technical guidance you may need." 
            : "<b>ልዩ የድጋፍ አገልግሎት።</b>\nየላቀ አገልግሎት ልዩ ትኩረትን ይሻል። የእኛ የድጋፍ ቡድን ለማንኛውም አይነት ጥያቄ ወይም የቴክኒክ እገዛ ዝግጁ ሆኖ ይጠብቅዎታል።";

        bot.editMessageText(txt, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "TELEGRAM CONCIERGE", url: "https://t.me/Farisman72" }],
                    [{ text: isEn ? "BACK" : "ወደ ኋላ", callback_data: 'more' }]
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
