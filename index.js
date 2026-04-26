require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const usersState = {};
const usersData = {};
const usersCurrency = {}; 
const usersLang = {}; // ቋንቋ ለማስቀመጥ (AM ወይም EN)

const RATE = 160; 

// የጎንዮሽ Menu ለማስተካከል (bot ሲጀምር የሚታይ)
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

// ዋናው ሜኑ Button
function getMainMenu(chatId) {
    const isEn = usersLang[chatId] === 'EN';
    const hasForm = usersData[chatId] && usersData[chatId].isComplete;
    return {
        inline_keyboard: [
            [{ text: hasForm ? (isEn ? "My Form" : "የእኔ ፎርም") : (isEn ? "Fill Form" : "Form ይሙሉ"), callback_data: hasForm ? 'my_form' : 'fill_form' }],
            [{ text: isEn ? "Our Services" : "አገልግሎቶች (Service)", callback_data: 'service' }],
            [{ text: isEn ? "More details..." : "ተጨማሪ (More)....", callback_data: 'more' }]
        ]
    };
}

// ከስር የሚቀመጠው ቋሚ ሜኑ
const bottomMenu = {
    reply_markup: {
        keyboard: [[{ text: "🌐 Language / ቋንቋ" }, { text: "💱 Currency" }]],
        resize_keyboard: true,
        persistent: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    usersCurrency[chatId] = 'ETB'; 
    usersLang[chatId] = 'AM'; // Default Amharic
    bot.sendMessage(chatId, "እንኳን በደህና መጡ! / Welcome to GILD!", bottomMenu).then(() => {
        sendLanguageSelection(chatId);
    });
});

bot.onText(/\/language/, (msg) => sendLanguageSelection(msg.chat.id));
function sendLanguageSelection(chatId) {
    bot.sendMessage(chatId, "እባክዎ ቋንቋ ያስመርጡ / Please select a language:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🇪🇹 አማርኛ", callback_data: 'lang_AM' }, { text: "🇬🇧 English", callback_data: 'lang_EN' }]
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

    if (text === "🌐 Language / ቋንቋ") {
        sendLanguageSelection(chatId);
        return;
    }

    if (text === "💱 Currency" || text.toLowerCase() === '/currency') {
        const msgText = isEn ? "<b>Exchange rate: 1 USD = 160 ETB</b>\n\nPlease select currency:" : "<b>Exchange rate: 1 USD = 160 ETB</b>\n\nእባክዎ መገበያያ ይምረጡ:";
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
        const txt = isEn ? "⚠️ <b>Warning:</b> Please enter your phone number correctly below:\n(Type below)" : "⚠️ <b>ማሳሰቢያ:</b> እባክዎ ስልክ ቁጥርዎን እንዳይሳሳቱ በጥንቃቄ ከስር ይፃፉ፡";
        bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
    } 
    else if (state === 'AWAITING_PHONE') {
        usersData[chatId].phone = text;
        usersState[chatId] = 'AWAITING_ADDRESS';
        const txt = isEn ? "Please select your city / location:" : "እባክዎ የሚገኙበትን አድራሻ (ከተማ) ከስር ይምረጡ፡";
        bot.sendMessage(chatId, txt, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Addis Ababa", callback_data: 'city_Addis Ababa' }, { text: "Dire Dawa", callback_data: 'city_Dire Dawa' }],
                    [{ text: "Mekelle", callback_data: 'city_Mekelle' }, { text: "Gondar", callback_data: 'city_Gondar' }],
                    [{ text: "Bahir Dar", callback_data: 'city_Bahir Dar' }, { text: "Hawassa", callback_data: 'city_Hawassa' }],
                    [{ text: "Jimma", callback_data: 'city_Jimma' }, { text: "Dessie", callback_data: 'city_Dessie' }],
                    [{ text: "Jigjiga", callback_data: 'city_Jigjiga' }, { text: "Bishoftu", callback_data: 'city_Bishoftu' }],
                    [{ text: "Shashamane", callback_data: 'city_Shashamane' }, { text: "Arba Minch", callback_data: 'city_Arba Minch' }]
                ]
            }
        });
    }
    else if (state === 'AWAITING_BRAND') {
        usersData[chatId].brand = text;
        usersState[chatId] = 'AWAITING_NEEDS';
        const txt = isEn ? "What type of brand is it?" : "የቱ ላይ ትኩረት ማድረግ ይፈልጋሉ?";
        bot.sendMessage(chatId, txt, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Company Brand", callback_data: 'need_company' }],
                    [{ text: "Personal Brand", callback_data: 'need_personal' }],
                    [{ text: "Other", callback_data: 'need_other' }]
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

    // ይህ 코ድ Button ሲነካ Loading ሚለውን ያቆመዋል! (Very Important)
    bot.answerCallbackQuery(query.id).catch(() => {});

    const isEn = usersLang[chatId] === 'EN';

    // ቋንቋ መምረጥ
    if (data === 'lang_AM' || data === 'lang_EN') {
        usersLang[chatId] = data === 'lang_EN' ? 'EN' : 'AM';
        const msgTxt = data === 'lang_EN' ? "Language set to English. Please select from the menu below:" : "ቋንቋ ወደ አማርኛ ተቀይሯል። ከታች ካለው Menu ይምረጡ፡";
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
        bot.sendMessage(chatId, msgTxt, { reply_markup: getMainMenu(chatId) });
        return;
    }

    // Currency Setting
    if (data === 'set_curr_usd' || data === 'set_curr_etb') {
        usersCurrency[chatId] = data === 'set_curr_usd' ? 'USD' : 'ETB';
        const txt = isEn ? `Currency set to ${usersCurrency[chatId]}.` : `መገበያያ ወደ ${usersCurrency[chatId]} ተቀይሯል።`;
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
        bot.sendMessage(chatId, `${txt}\n\n<b>Main Menu:</b>`, { parse_mode: 'HTML', reply_markup: getMainMenu(chatId) });
        return;
    }

    if (data === 'main_menu') {
        usersState[chatId] = null;
        bot.editMessageText(isEn ? "Main Menu:" : "ዋና ማውጫ (Main Menu):", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId)
        });
    }

    // ==== FORM ====
    if (data === 'fill_form' || data === 'edit_form') {
        usersData[chatId] = { isComplete: false };
        usersState[chatId] = 'AWAITING_NAME';
        const txt = isEn ? "Please fill the form.\n\nType your FULL NAME below:" : "Form እንዲሞሉ ተጠይቀዋል።\n\nእባክዎ ሙሉ ስምዎን ከስር ይፃፉ (ለምሳሌ: Abebe Kebede):";
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId });
    }

    if (data.startsWith('city_')) {
        usersData[chatId].address = data.split('_')[1];
        usersState[chatId] = 'AWAITING_BRAND';
        const txt = isEn ? `Address saved: ${usersData[chatId].address}\n\nPlease type your Brand Name below:` : `አድራሻ ተመርጧል: ${usersData[chatId].address}\n\nእባክዎ የ Brand ስምዎን ከስር ይፃፉ:`;
        bot.editMessageText(txt, { chat_id: chatId, message_id: messageId });
    }

    if (data === 'my_form') {
        const d = usersData[chatId];
        const text = isEn ? 
            `Your Form Data:\n\nName: ${d.name}\nPhone: ${d.phone}\nAddress: ${d.address}\nBrand Name: ${d.brand}\nNeeds: ${d.needs}` : 
            `የሞሉት Form መረጃ:\n\nስም: ${d.name}\nስልክ: ${d.phone}\nአድራሻ: ${d.address}\nየብራንድ ስም: ${d.brand}\nፍላጎት: ${d.needs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "Edit Form" : "Form አስተካክል", callback_data: 'edit_form' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ ይመለሱ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data.startsWith('need_')) {
        const needMap = { need_company: 'Company', need_personal: 'Personal Brand', need_other: 'Other' };
        usersData[chatId].needs = needMap[data];
        usersData[chatId].isComplete = true;
        usersState[chatId] = null;
        const txt = isEn ? "✅ Successfully registered! Returning to main menu." : "✅ በተሳካ ሁኔታ ተመዝግቧል! ወደ ዋናው ገፅ ተመልሰዋል።";
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
        bot.sendMessage(chatId, txt, { reply_markup: getMainMenu(chatId) });
    }

    // ==== SERVICE ====
    if (data === 'service') {
        bot.editMessageText(isEn ? "Service Menu:" : "የአገልግሎት ዝርዝር:", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📦 Packages", callback_data: 'packages' }],
                    [{ text: isEn ? "👤 Individuals service" : "👤 ነጠላ አገልግሎቶች (Individuals)", callback_data: 'individuals' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'packages') {
        bot.editMessageText(isEn ? "Select a Package:" : "Package ይምረጡ:", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)", callback_data: 'pkg_luster' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)", callback_data: 'pkg_radiant' }],
                    [{ text: "𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)", callback_data: 'pkg_24k' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'service' }]
                ]
            }
        });
    }

    // PACKAGES DETAILS (Bilingual and in Brackets)
    if (data === 'pkg_luster') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
[ <i>A foundational suite designed to prepare your business for the market with an undeniable premium presence.</i> ]

[ <b>Brand Architecture:</b> Visual identity setup including logo, colors, and typography. ]
[ <b>Digital Authority:</b> Optimization of FB, IG, and TikTok profiles. ]
[ <b>Strategic Content:</b> 12 striking graphic posts and 2 short-form videos per month. ]
[ <b>Consultation:</b> Monthly strategy session to review performance. ]

Select Duration:` : 
`<b>𝗚𝗜𝗟𝗗 𝗟𝘂𝘀𝘁𝗲𝗿 (𝗧𝗵𝗲 𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)</b>
[ <i>ቢዝነስዎን ውብ እና ፕሮፌሽናል በሆነ መልኩ ለገበያ ለማቅረብ የተዘጋጀ መሰረታዊ ፓኬጅ፡፡</i> ]

[ <b>የብራንድ ውበት (Brand Architecture):</b> የሎጎ ዲዛይን፣ የከለር እና የፅሁፍ ስታይል ምርጫን ያካተተ ሙሉ ማንነት፡፡ ]
[ <b>ዲጂታል ገፅታ:</b> የፌስቡክ፣ ኢንስታግራም እና ቲክቶክ ገፆችን በሚያምር እና ጥራት ባለው መልኩ ማዘጋጀት፡፡ ]
[ <b>የፖስት ስራዎች:</b> በወር 12 እጅግ ማራኪ የሆኑ ፖስቶች እና 2 አጫጭር ቪዲዮዎች (Reels/Tiktok)፡፡ ]
[ <b>የእድገት ምክክር:</b> በየወሩ የቢዝነስዎን ዲጂታል ጉዞ የሚገመግም የስትራቴጂ ውይይት፡፡ ]

የአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 Month" : "ለ 1 ወር", callback_data: 'dur_lus_1' }, { text: isEn ? "2 Months" : "ለ 2 ወር", callback_data: 'dur_lus_2' }, { text: isEn ? "3 Months" : "ለ 3 ወር", callback_data: 'dur_lus_3' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_radiant') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
[ <i>An aggressive growth accelerator engineered to convert visibility into measurable sales.</i> ]

[ <b>Copywriting:</b> Psychological content creation designed to turn spectators into loyal clients. ]
[ <b>Advertising Mastery:</b> Management of 5 targeted ad campaigns for maximum ROI. ]
[ <b>Landing Page:</b> A luxury, high-conversion single-page website to sell your offer. ]
[ <b>Creative Dominance:</b> 20+ custom posts per month, plus one photoshoot session. ]

Select Duration:` : 
`<b>𝗚𝗜𝗟𝗗 𝗥𝗮𝗱𝗶𝗮𝗻𝘁 (𝗚𝗿𝗼𝘄𝘁𝗵 𝗔𝗰𝗰𝗲𝗹𝗲𝗿𝗮𝘁𝗼𝗿)</b>
[ <i>እይታን (Visibility) ወደ እውነተኛ ሽያጭ ለመቀየር የተሰራ ጠንካራ የሽያጭ ማሳደጊያ ስትራቴጂ፡፡</i> ]

[ <b>አሳማኝ ፅሁፎች (Copywriting):</b> አንባቢን ስነ-ልቦናዊ በሆነ መንገድ አሳምኖ ደንበኛ የሚያደርግ የፅሁፍ ጥበብ፡፡ ]
[ <b>ማስታወቂያ (Advertising Mastery):</b> ከፍተኛ ትርፍ (ROI) የሚያመጡ 5 የታለሙ የ Social Media ማስታወቂያዎች አስተዳደር፡፡ ]
[ <b>ላንዲንግ ፔጅ (Landing Page):</b> ዋና ምርትዎን/አገልግሎትዎን የሚሸጥ እጅግ ማራኪ ባለ 1-ገፅ ዌብሳይት፡፡ ]
[ <b>የይዘት የበላይነት:</b> በወር ከ 20 በላይ ፖስቶች እና አንድ ፕሮፌሽናል የፎቶ/ቪዲዮ ሹት ፕሮግራም፡፡ ]

የአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 Month" : "ለ 1 ወር", callback_data: 'dur_rad_1' }, { text: isEn ? "2 Months" : "ለ 2 ወር", callback_data: 'dur_rad_2' }, { text: isEn ? "3 Months" : "ለ 3 ወር", callback_data: 'dur_rad_3' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'packages' }]
                ]
            }
        });
    }

    if (data === 'pkg_24k') {
        const text = isEn ? 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
[ <i>The ultimate 360-degree VIP experience designed to transform your brand into a market leader.</i> ]

[ <b>Omnichannel Mastery:</b> Daily high-impact posting across all platforms. ]
[ <b>Cinematic Storytelling:</b> 4 commercial-grade, cinematic brand videos. ]
[ <b>AI Support:</b> Smart Telegram/Messenger AI bot to automate inquiries. ]
[ <b>Sales Ecosystem:</b> Full funnel construction and advanced retargeting. ]
[ <b>VIP Concierge:</b> 24/7 direct access and priority support. ]

Select Duration:` : 
`<b>𝗚𝗜𝗟𝗗 𝟮𝟰𝗞 (𝗧𝗵𝗲 𝗘𝗺𝗽𝗶𝗿𝗲 𝗕𝘂𝗶𝗹𝗱𝗲𝗿)</b>
[ <i>ብራንድዎን የገበያው መሪ (Market Leader) ለማድረግ የተዘጋጀ የላቀ የ VIP አገልግሎት፡፡</i> ]

[ <b>ሙሉ አስተዳደር:</b> በሁሉም የሶሻል ሚዲያ አማራጮች በየቀኑ ፖስት ማድረግ እና ማስተዳደር፡፡ ]
[ <b>ሲኒማቲክ ቪዲዮ:</b> ለቴሌቪዥን በሚመጥን ጥራት የተሰሩ 4 አጫጭር የብራንድ ቪዲዮዎች፡፡ ]
[ <b>የ AI ቦት:</b> የደንበኞችን ጥያቄ 24/7 በራሱ የሚመልስ ዘመናዊ AI Telegram ቦት፡፡ ]
[ <b>የሽያጭ ሲስተም (Sales Funnel):</b> ደንበኛን አሳድኖ የሚያመጣ የተሟላ የሽያጭ ማጥመጃ ስትራቴጂ፡፡ ]
[ <b>VIP ድጋፍ:</b> ቅድሚያ የሚሰጠው እና በማንኛውም ሰዓት (24/7) የቀጥታ ድጋፍ፡፡ ]

የአገልግሎት ጊዜ ይምረጡ:`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "1 Month" : "ለ 1 ወር", callback_data: 'dur_24k_1' }, { text: isEn ? "2 Months" : "ለ 2 ወር", callback_data: 'dur_24k_2' }, { text: isEn ? "3 Months" : "ለ 3 ወር", callback_data: 'dur_24k_3' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'packages' }]
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
            ? `🎉 <b>Congratulations!</b>\n\nYou have selected [ ${info.name} ]. You will receive the full service for ${info.months} month(s).\n\n<b>Total Price:</b> ${formattedPrice}` 
            : `🎉 <b>እንኳን ደስ አለዎት!</b>\n\nአሁን የመረጡት package [ ${info.name} ] ሙሉ አገልግሎቱን ለ ${info.months} ወር ያገኛሉ።\n\n<b>አጠቃላይ ዋጋ:</b> ${formattedPrice}`;

        bot.editMessageText(successText, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: isEn ? "💳 Pay Now" : "💳 ክፍያ ፈፅም", callback_data: 'pay_action' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: backBtn }]
                ]
            }
        });
    }

    // INDIVIDUAL SERVICES (With Command Examples)
    if (data === 'individuals') {
        const text = isEn ? 
`<b>Individual Services</b>

• Full Brand Identity (Logo + Brand Book): ${getPrice(7000, 10000, chatId)}
• Landing Page Website (1 Page): ${getPrice(10000, 15000, chatId)}
• Full Business Website: ${getPrice(30000, 60000, chatId)}+
• Smart Telegram Bot: ${getPrice(15000, 25000, chatId)}
• LOGO Only: ${getPrice(5000, null, chatId)}
• SEO Only: ${getPrice(3000, null, chatId)}
• Strategy Consulting: ${getPrice(4000, null, chatId)}
• BUSINESS CARD Design: ${getPrice(2000, null, chatId)}

<code>To purchase, tap or type the command below:
/Brand (For Full Identity)
/LandingPage
/Website
/Bot
/Logo
/SEO
/Strategy
/BusinessCard</code>` : 
`<b>ነጠላ አገልግሎቶች (Individuals)</b>

• Full Brand Identity (Logo + Brand Book): ${getPrice(7000, 10000, chatId)}
• Landing Page Website (1 ገጽ): ${getPrice(10000, 15000, chatId)}
• Full Business Website (ባለብዙ ገጽ): ${getPrice(30000, 60000, chatId)}+
• Smart Telegram Bot (AI Integrated): ${getPrice(15000, 25000, chatId)}
• LOGO ብቻውን: ${getPrice(5000, null, chatId)}
• SEO ብቻ: ${getPrice(3000, null, chatId)}
• Strategy ምክር ብቻ: ${getPrice(4000, null, chatId)}
• BUSINESS CARD Design: ${getPrice(2000, null, chatId)}

<code>መግዛት ምትፈልጉትን ነገር ከታች ባለው መልኩ / ብላችሁ ፃፉ ወይንም ይንኩት፡
/Brand (ለሙሉ Brand Identity)
/LandingPage
/Website
/Bot
/Logo
/SEO
/Strategy
/BusinessCard</code>`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'service' }]] }
        });
    }

    if (data === 'pay_action') {
        bot.sendMessage(chatId, isEn ? "Please contact our support to process the payment: @Farisman72" : "ክፍያ ለማካሄድ እባክዎ ያነጋግሩን: @Farisman72");
    }

    // ==== MORE MENU ====
    if (data === 'more') {
        bot.editMessageText(isEn ? "More Options:" : "ተጨማሪ ማውጫ (MORE..):", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "About us", callback_data: 'about_us' }, { text: "Contact us", callback_data: 'contact_us' }],
                    [{ text: "FAQ", callback_data: 'faq' }, { text: "Story", callback_data: 'story' }],
                    [{ text: "Vision & Mission", callback_data: 'vision_mission' }],
                    [{ text: "Our Platform", callback_data: 'our_platform' }, { text: "Support", callback_data: 'support' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'faq') {
        const text = isEn ? "FAQ: We serve clients globally. We build foundations for startups. We offer consulting, personal branding, and high-end aesthetics (Gilding)." : "ተደጋጋሚ ጥያቄዎች (FAQ): ኢትዮጵያ ውስጥ ብቻ ሳይሆን በአለም አቀፍ ደረጃ እንሰራለን። ከዜሮ ለሚነሱ ቢዝነሶችም ሆነ ለግለሰብ (Personal Brand) ጠንካራ መሰረት እንገነባለን።";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]] } });
    }

    if (data === 'about_us') {
        const text = isEn ? "At GILD, we believe every business has 'hidden gold'. We transform raw ideas into a 24K gold brand identity." : "ስለ እኛ (About Us): እኛ በ GILD እያንዳንዱ ቢዝነስ የተደበቀ ወርቅ እንዳለው እናምናለን። ያንን ወርቅ አውጥተን የ 24K ብራንድ ማንነት እንገነባለን።";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]] } });
    }

    if (data === 'story') {
        const text = isEn ? "GILD STORY\nThe Alchemy of Brands. Like ancient alchemists turning metals to gold, we turn ordinary businesses into premium brands." : "የ GILD ታሪክ (Story)\nእንደ ጥንት አልኬሚስቶች ብረትን ወደ ወርቅ እንደሚቀይሩት ሁሉ፣ እኛም ቢዝነስዎን ውድ እና ተፈላጊ ወደ ሆነ 'Premium' ብራንድ እንቀይረዋለን።";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]] } });
    }

    if (data === 'vision_mission') {
        bot.editMessageText(isEn ? "Vision & Mission" : "ራዕይ እና ተልዕኮ", {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Vision", callback_data: 'vision_btn' }, { text: "Mission", callback_data: 'mission_btn' }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'vision_btn') {
        const text = isEn ? "Our Vision: To be the leading agency transforming businesses into premium, influential global brands." : "ራዕይ (Our Vision): የተደበቀ አቅም ያላቸውን ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ እና የቅንጦት (Premium) ብራንዶች መቀየር።";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'vision_mission' }]] } });
    }

    if (data === 'mission_btn') {
        const text = isEn ? "Our Mission: To guild our clients' brands through strategic psychology and creative artistry." : "ተልዕኮ (Our Mission): የደንበኞቻችንን ልዩ ማንነት በፈጠራ ጥበብ በማብቃት ብራንዳቸውን በወርቅ መለበጥ (Gilding)።";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'vision_mission' }]] } });
    }

    if (data === 'contact_us') {
        bot.editMessageText("Contact us\nEmail :- gild.agency.et@gmail.com", {
            chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]] }
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
                    [{ text: "X / Twitter", url: "https://x.com/Gild_Agency" }],
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]
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
                    [{ text: isEn ? "Back" : "ወደ ኋላ", callback_data: 'more' }]
                ]
            }
        });
    }
});

// Individuals Command Receiver
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
            responseText = "<b>SEO ብቻ (Search Engine Optimization)</b>";
            priceText = getPrice(3000, null, chatId);
            break;
        case '/strategy':
            responseText = isEn ? "<b>Strategy Consulting Only</b>" : "<b>የስትራቴጂ እና ማርኬቲንግ ምክር ብቻ</b>";
            priceText = getPrice(4000, null, chatId);
            break;
        case '/businesscard':
            responseText = "<b>BUSINESS CARD Design</b>";
            priceText = getPrice(2000, null, chatId);
            break;
        default:
            return; 
    }

    bot.sendMessage(chatId, `${responseText}\n\n<b>${isEn ? "Price:" : "ዋጋ:"}</b> ${priceText}`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: isEn ? "💳 Pay Now" : "💳 ክፍያ ፈፅም", callback_data: 'pay_action' }]
            ]
        }
    });
}
