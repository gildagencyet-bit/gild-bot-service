require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// የቦት ቶከን (ከ Render Environment Variable የሚነበብ)
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// የመረጃ ማጠራቀሚያ (ለጊዜው በሜሞሪ - ፎርም እና ቋንቋ ለማስታወስ)
const usersState = {};
const usersData = {};
const usersCurrency = {}; // 'ETB' ወይም 'USD'

const RATE = 160; // 1 USD = 160 ETB

// ዋጋን በምንዛሬ የሚያስተካክል ፈንክሽን
function formatPrice(etbAmount, chatId) {
    const curr = usersCurrency[chatId] || 'ETB';
    if (curr === 'USD') {
        return `$${(etbAmount / RATE).toFixed(2)}`;
    }
    return `${etbAmount.toLocaleString()} ETB`;
}

// ዋናው ሜኑ (Main Menu)
function getMainMenu(chatId) {
    const hasForm = usersData[chatId] && usersData[chatId].isComplete;
    const curr = usersCurrency[chatId] || 'ETB';
    
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: hasForm ? "📝 My Form" : "✍️ Form ይሙሉ", callback_data: hasForm ? 'my_form' : 'fill_form' }],
                [{ text: "💼 Service", callback_data: 'service' }],
                [{ text: `💱 Currency: ${curr} (Change)`, callback_data: 'toggle_currency' }],
                [{ text: "➕ More...", callback_data: 'more' }]
            ]
        }
    };
}

console.log("GILD Premium Bot is successfully running...");

// 1. /start ሲባል ቋንቋ ማስመረጥ
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    usersCurrency[chatId] = 'ETB'; // Default currency
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🇪🇹 አማርኛ", callback_data: 'lang_am' }, { text: "🇬🇧 English", callback_data: 'lang_en' }]
            ]
        }
    };
    bot.sendMessage(chatId, "Welcome to GILD Agency! \n\nእባክዎ ቋንቋ ይምረጡ / Please select your language:", options);
});

// 2. Button (Callback) ማስተናገጃ
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // ቋንቋ ሲመረጥ
    if (data === 'lang_am' || data === 'lang_en') {
        bot.editMessageText("እንኳን ወደ **GILD Marketing Agency** በደህና መጡ! \nከታች ካለው ሜኑ የሚፈልጉትን ይምረጡ፦", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: getMainMenu(chatId).reply_markup
        });
    }

    // ከረንሲ መቀየሪያ
    if (data === 'toggle_currency') {
        usersCurrency[chatId] = (usersCurrency[chatId] === 'ETB') ? 'USD' : 'ETB';
        bot.editMessageReplyMarkup(getMainMenu(chatId).reply_markup, {
            chat_id: chatId, message_id: messageId
        });
    }

    // ወደ ዋናው ሜኑ መመለሻ
    if (data === 'main_menu') {
        usersState[chatId] = null;
        bot.editMessageText("ዋና ማውጫ (Main Menu)፦", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId).reply_markup
        });
    }

    // ====== FORM LOGIC ======
    if (data === 'fill_form' || data === 'edit_form') {
        usersData[chatId] = { isComplete: false };
        usersState[chatId] = 'AWAITING_NAME';
        bot.editMessageText("📝 **ፎርም መሙላት ጀመሩ**\n\nእባክዎ ሙሉ ስምዎን ያስገቡ (ለምሳሌ፦ አበበ ከበደ)፦", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown'
        });
    }

    if (data === 'my_form') {
        const d = usersData[chatId];
        const text = `📝 **የእርስዎ ፎርም መረጃ**\n\n👤 ስም: ${d.name}\n📞 ስልክ: ${d.phone}\n📍 አድራሻ: ${d.address}\n🏢 ብራንድ ስም: ${d.brand}\n🎯 ፍላጎት: ${d.needs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✏️ Edit Form", callback_data: 'edit_form' }],
                    [{ text: "🔙 Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data.startsWith('need_')) {
        const needMap = { need_company: 'Company', need_personal: 'Personal Brand', need_other: 'Other' };
        usersData[chatId].needs = needMap[data];
        usersData[chatId].isComplete = true;
        usersState[chatId] = null;
        bot.editMessageText("✅ ፎርምዎ በተሳካ ሁኔታ ተመዝግቧል! እናመሰግናለን።", {
            chat_id: chatId, message_id: messageId, reply_markup: getMainMenu(chatId).reply_markup
        });
    }

    // ====== SERVICE MENU ======
    if (data === 'service') {
        bot.editMessageText("💼 **አገልግሎቶቻችን (Services)**\n\nየሚፈልጉትን ዘርፍ ይምረጡ፦", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📦 Packages", callback_data: 'packages' }],
                    [{ text: "👤 Individuals Service", callback_data: 'individuals' }],
                    [{ text: "🔙 Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'packages') {
        bot.editMessageText("📦 **GILD Packages**\n\nከታች ካሉት የቅንጦት ፓኬጆቻችን አንዱን ይምረጡ፦", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🥉 GILD Luster (The Foundation)", callback_data: 'pkg_luster' }],
                    [{ text: "🥈 GILD Radiant (Growth Accelerator)", callback_data: 'pkg_radiant' }],
                    [{ text: "🥇 GILD 24K (The Empire Builder)", callback_data: 'pkg_24k' }],
                    [{ text: "🔙 Back", callback_data: 'service' }]
                ]
            }
        });
    }

    // Package Details
    if (data === 'pkg_luster') {
        const text = `🥉 **GILD Luster (The Foundation)**\n\nA foundational suite designed to prepare your business for the market with an undeniable premium presence and solid brand architecture.\n\n• Brand Architecture: Custom logo, colors, typography.\n• Digital Authority: Premium FB, IG, TikTok setup.\n• Content: 12 posts + 2 short-form videos/month.\n• Corporate Stationery: Business cards, letterheads.\n• Community Engagement: Proactive DM/Comment management.\n• Growth Consultation: Monthly strategy session.\n\n**ዋጋ (Price):**\n1 ወር: ${formatPrice(20000, chatId)}\n2 ወር: ${formatPrice(35000, chatId)}\n3 ወር: ${formatPrice(50000, chatId)}`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "💳 Pay", callback_data: 'pay' }], [{ text: "🔙 Back", callback_data: 'packages' }]] }
        });
    }

    if (data === 'pkg_radiant') {
        const text = `🥈 **GILD Radiant (The Growth Accelerator)**\n\nAn aggressive growth accelerator engineered to convert visibility into measurable sales.\n\n• Includes Luster features.\n• Conversion Copywriting.\n• Advertising Mastery: 5 targeted ad campaigns.\n• GILD Landing Page: High-conversion single-page website.\n• Local Search Dominance (SEO).\n• Creative Dominance: 20+ posts/stories + 1 photoshoot.\n• Performance Intelligence Reports.\n\n**ዋጋ (Price):**\n1 ወር: ${formatPrice(35000, chatId)}\n2 ወር: ${formatPrice(65000, chatId)}\n3 ወር: ${formatPrice(90000, chatId)}`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "💳 Pay", callback_data: 'pay' }], [{ text: "🔙 Back", callback_data: 'packages' }]] }
        });
    }

    if (data === 'pkg_24k') {
        const text = `🥇 **GILD 24K (The Empire Builder)**\n\nThe ultimate 360-degree VIP experience designed to transform your brand into a market-leading empire.\n\n• Includes Radiant features.\n• Omnichannel Mastery: Daily high-impact posting.\n• Cinematic Storytelling: 4 commercial-grade videos.\n• AI-Powered 24/7 Support Bot.\n• Full Sales Ecosystem & Pixel integration.\n• SOP Development.\n• Digital PR & Authority.\n• VIP Concierge: 24/7 priority support.\n\n**ዋጋ (Price):**\n1 ወር: ${formatPrice(70000, chatId)}\n2 ወር: ${formatPrice(130000, chatId)}\n3 ወር: ${formatPrice(205000, chatId)}`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "💳 Pay", callback_data: 'pay' }], [{ text: "🔙 Back", callback_data: 'packages' }]] }
        });
    }

    if (data === 'individuals') {
        const text = `👤 **Individuals Service (ነጠላ አገልግሎቶች)**\n\n• Full Brand Identity: ${formatPrice(7000, chatId)} - ${formatPrice(10000, chatId)}\n• Landing Page (1 ገጽ): ${formatPrice(10000, chatId)} - ${formatPrice(15000, chatId)}\n• Full Business Website: ${formatPrice(30000, chatId)} - ${formatPrice(60000, chatId)}\n• Smart Telegram Bot: ${formatPrice(15000, chatId)} - ${formatPrice(25000, chatId)}\n• Logo Only: ${formatPrice(5000, chatId)}\n• SEO & Map Optimization: ${formatPrice(3000, chatId)}\n• Strategy & Consulting: ${formatPrice(4000, chatId)}\n• Business Card Design: ${formatPrice(2000, chatId)}\n\n*ለመግዛት ከታች ያሉትን ቁልፎች ይጫኑ፦*`;
        
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎨 Brand/Logo", callback_data: 'pay' }, { text: "💻 Website", callback_data: 'pay' }],
                    [{ text: "🤖 Smart Bot", callback_data: 'pay' }, { text: "📈 SEO/Consulting", callback_data: 'pay' }],
                    [{ text: "🔙 Back", callback_data: 'service' }]
                ]
            }
        });
    }

    if (data === 'pay') {
        bot.answerCallbackQuery(query.id, { text: "ክፍያ ለመፈፀም እባክዎ በቴሌግራም ያናግሩን!", show_alert: true });
    }

    // ====== MORE MENU ======
    if (data === 'more') {
        bot.editMessageText("➕ **ተጨማሪ መረጃዎች (More)**", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "ℹ️ About Us", callback_data: 'about_us' }, { text: "📞 Contact Us", callback_data: 'contact_us' }],
                    [{ text: "❓ FAQ", callback_data: 'faq' }, { text: "📖 Story", callback_data: 'story' }],
                    [{ text: "👁️ Vision & Mission", callback_data: 'vision_menu' }],
                    [{ text: "🌐 Our Platform & Support", callback_data: 'platform' }],
                    [{ text: "🔙 Back", callback_data: 'main_menu' }]
                ]
            }
        });
    }

    if (data === 'about_us') {
        const text = `**About GILD**\n\nAt GILD, we believe that every established business has a "hidden gold"—a core value that is often obscured by outdated branding and mediocre marketing.\n\nOur mission is to peel back those metallic layers and reveal the brilliant gold underneath. For startups and visionaries starting from zero, we don't just "reveal"—we "forge." We take your raw ideas and transform them into a 24K gold brand identity that commands respect from day one.\n\nWe are not just a marketing agency; we are the master gilders of the digital age, ensuring your business shines with international quality.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: 'more' }]] } });
    }

    if (data === 'faq') {
        const text = `**FAQ (Frequently Asked Questions)**\n\n❓ **Does GILD only work with Ethiopian clients?**\nNo. While our heart is in Addis Ababa, our standards are international. We serve clients globally.\n\n❓ **Can you help a business starting from zero?**\nAbsolutely. We specialize in building strong foundations.\n\n❓ **Do you offer consultation only?**\nYes. We provide high-level strategic consulting.\n\n❓ **Personal Branding: Who do you help?**\nWe build authorities. We help professionals (CEOs, Doctors, Consultants) establish a visual identity.\n\n❓ **What makes GILD different?**\nMost agencies focus on "posting." We focus on "Gilding"—a mix of luxury aesthetics, data-driven strategy, and automation.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: 'more' }]] } });
    }

    if (data === 'story') {
        const text = `**The Alchemy of Brands: Gild**\n\n"እውነተኛ ጥበብ ማለት በተራ ነገሮች ውስጥ የተደበቀውን ወርቅ ማየት መቻል ነው፡፡"\n\nበጥንታዊው ዘመን፣ አልኬሚ (Alchemy) የሚባል ምስጢራዊ ፍልስፍና ነበር፡፡ የጥንት አልኬሚስቶች ጥበብ ተራ የሆኑትን ብረቶች ወደ ንፁህ ወርቅነት መቀየር ነበር፡፡\n\nእኛ በ GILD፣ እራሳችንን እንደ ዘመኑ አልኬሚስቶች እንቆጥራለን፡፡ ስራችን ዝም ብሎ ዲዛይን ማድረግ አይደለም፡፡ የእኛ 'አልኬሚ' የእርስዎን ቢዝነስ ከሌሎች ተለይቶ እንዲታይ የማድረግ ሂደት ነው፡፡\n\n• **መገፈፍ (The Peeling):** የቆዩ ንብርብሮችን እንገፍፋለን፡፡\n• **መቅረጽ (The Forging):** ጠንካራ የብራንድ ማንነት እንቀርጻለን፡፡\n• **መለበጥ (The Gilding):** ብራንድዎ እንደ ወርቅ እንዲያንፀባርቅ እናደርጋለን፡፡\n\n**GILD Marketing Agency**\nWhere Vision Meets Alchemy.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: 'more' }]] } });
    }

    if (data === 'vision_menu') {
        bot.editMessageText("**GILD: Where Vision Meets Alchemy**\n\nየሚከተሉትን ይምረጡ፦", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "👁️ Vision (ራዕይ)", callback_data: 'vision_text' }],
                    [{ text: "🎯 Mission (ተልዕኮ)", callback_data: 'mission_text' }],
                    [{ text: "🔙 Back", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'vision_text') {
        const text = `👁️ **ራዕይ (Our Vision)**\n\n"የተደበቀ እምቅ አቅም ያላቸውን የንግድ ድርጅቶች ወደ ዓለም አቀፍ ደረጃ ወደሚታወቁ፣ ተፅዕኖ ፈጣሪ እና የቅንጦት (Premium) ብራንዶች በመቀየር፣ በዲጂታል አልኬሚ እና ስነ-ልቦናዊ ማርኬቲንግ ቀዳሚው ተመራጭ ኤጀንሲ መሆን።"`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: 'vision_menu' }]] } });
    }

    if (data === 'mission_text') {
        const text = `🎯 **ተልዕኮ (Our Mission)**\n\n"የደንበኞቻችንን ልዩ ማንነት እና እሴት በጥልቀት በመረዳት፣ ያላደገውን አቅማቸውን በፈጠራ ጥበብ እና በሳይንሳዊ ስነ-ልቦናዊ ስትራቴጂ በማብቃት፣ ብራንዳቸውን በወርቅ መለበጥ (Gilding)።"`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: 'vision_menu' }]] } });
    }

    if (data === 'contact_us') {
        bot.editMessageText("📞 **Contact Us**\n\nእባክዎ መገናኛ መንገድ ይምረጡ፦", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📧 Email", url: "mailto:contact@gildagency.com" }],
                    [{ text: "✈️ Telegram Admin", url: "https://t.me/YourAdminUsername" }],
                    [{ text: "🔙 Back", callback_data: 'more' }]
                ]
            }
        });
    }

    if (data === 'platform') {
        bot.answerCallbackQuery(query.id, { text: "ይህ ገጽ በቅርቡ ይከፈታል!", show_alert: true });
    }
});

// ====== TEXT MESSAGE HANDLER (ለፎርም መሙያ) ======
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Command ከሆነ ይለፈው
    if (!text || text.startsWith('/')) return;

    const state = usersState[chatId];

    if (state === 'AWAITING_NAME') {
        usersData[chatId].name = text;
        usersState[chatId] = 'AWAITING_PHONE';
        bot.sendMessage(chatId, "✅ ስም ተመዝግቧል።\n\n📞 እባክዎ ስልክ ቁጥርዎን ያስገቡ (ለምሳሌ፦ 0911...):");
    } 
    else if (state === 'AWAITING_PHONE') {
        usersData[chatId].phone = text;
        usersState[chatId] = 'AWAITING_ADDRESS';
        bot.sendMessage(chatId, "✅ ስልክ ተመዝግቧል።\n\n📍 እባክዎ አድራሻዎን ያስገቡ:");
    }
    else if (state === 'AWAITING_ADDRESS') {
        usersData[chatId].address = text;
        usersState[chatId] = 'AWAITING_BRAND';
        bot.sendMessage(chatId, "✅ አድራሻ ተመዝግቧል።\n\n🏢 እባክዎ የብራንድዎን/የድርጅትዎን ስም ያስገቡ:");
    }
    else if (state === 'AWAITING_BRAND') {
        usersData[chatId].brand = text;
        usersState[chatId] = 'AWAITING_NEEDS';
        
        bot.sendMessage(chatId, "✅ ብራንድ ስም ተመዝግቧል።\n\n🎯 በመጨረሻም፣ ምን ዓይነት አገልግሎት እንደሚፈልጉ ከታች ይምረጡ፦", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🏢 Company / ድርጅት", callback_data: 'need_company' }],
                    [{ text: "👤 Personal Brand / ግላዊ ብራንድ", callback_data: 'need_personal' }],
                    [{ text: "✨ Other / ሌላ", callback_data: 'need_other' }]
                ]
            }
        });
    }
});
