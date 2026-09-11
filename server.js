// File: bot.js (Render 24/7 Hosting Ready)

const http = require('http');
const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// ক্রেডেনশিয়াল কনফিগারেশন (Environment Variable সাপোর্ট সহ)
const BOT_TOKEN = process.env.BOT_TOKEN || '8808381690:AAH0wNxbtraOhxP6q3v7mQuqfhCQHXX6EMM';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '6271611009';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dlxmzzvcpoysoouakadt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMDc0MSwiZXhwIjoyMDkzNzA2NzQxfQ.4NS9sJkAkM2x4p2CmhgmZ95N1XdamwnKpH98hRktOw8';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ১. ইউজার যখন অ্যাপ থেকে /start <deviceId> দিয়ে রিকোয়েস্ট পাঠাবে
bot.start(async (ctx) => {
    try {
        const textParts = (ctx.message.text || '').split(' ');
        const payload = textParts[1]; // deviceId
        const userId = ctx.from.id;
        const userFullName = escapeHtml(`${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim());
        const username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'নাই';

        if (!payload) {
            return ctx.reply("স্বাগতম! অ্যাপ থেকে আনলক রিকোয়েস্ট পাঠাতে অ্যাপের ভেতর থাকা সহায়তা বাটনে চাপ দিন।");
        }

        const deviceId = payload.trim().toLowerCase();

        // টেমপ্লেট ১: ইউজারের কাছে প্রথম মেসেজ
        const userWaitMsg = `📩 <b>আপনার আনলক অনুরোধটি গ্রহণ করা হয়েছে!</b>\n\n` +
            `অনুগ্রহ করে অ্যাডমিনের অ্যাপ্রুভালের জন্য অপেক্ষা করুন। অনুমোদন পাওয়া মাত্র ইউনিক কোডটি এই চ্যাটে চলে আসবে।`;
        
        await ctx.reply(userWaitMsg, { parse_mode: 'HTML' });

        // অ্যাডমিনকে ইনলাইন বাটনসহ নোটিফিকেশন পাঠানো
        const adminMsg = `🚨 <b>নতুন আনলক অনুরোধ এসেছে!</b>\n\n` +
            `👤 <b>ইউজার:</b> ${userFullName} (${username})\n` +
            `🆔 <b>ইউজার আইডি:</b> <code>${userId}</code>\n` +
            `📱 <b>Device ID:</b> <code>${deviceId}</code>\n\n` +
            `কত সময়ের জন্য অনুমোদন দিতে চান নির্বাচন করুন:`;

        const inlineKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('⏱️ ৫ মিনিট', `unlock_5_${deviceId}_${userId}`),
                Markup.button.callback('⏱️ ১০ মিনিট', `unlock_10_${deviceId}_${userId}`)
            ],
            [
                Markup.button.callback('♾️ পার্মানেন্ট', `unlock_perm_${deviceId}_${userId}`),
                Markup.button.callback('❌ বাতিল', `reject_${deviceId}_${userId}`)
            ]
        ]);

        await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg, {
            parse_mode: 'HTML',
            ...inlineKeyboard
        });

    } catch (err) {
        console.error("Start handler error:", err.message);
    }
});

// ২. ইনলাইন বাটন ক্লিকের অ্যাকশন হ্যান্ডলার
bot.action(/^(unlock_5|unlock_10|unlock_perm|reject)_([^_]+)_([^_]+)$/, async (ctx) => {
    try {
        const action = ctx.match[1];
        const deviceId = ctx.match[2];
        const targetUserId = ctx.match[3];

        if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
            return ctx.answerCbQuery("❌ শুধুমাত্র অ্যাডমিন এই বাটন চাপতে পারবেন!");
        }

        // রিজেক্ট হলে
        if (action === 'reject') {
            await ctx.editMessageText(`❌ <b>ডিভাইস:</b> <code>${deviceId}</code>-এর রিকোয়েস্ট বাতিল করা হয়েছে।`, { parse_mode: 'HTML' });
            try {
                await bot.telegram.sendMessage(targetUserId, "❌ দুঃখিত, আপনার আনলক রিকোয়েস্টটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।");
            } catch (e) {}
            return ctx.answerCbQuery("বাতিল করা হয়েছে");
        }

        let minutes = 5;
        let durationText = "৫ মিনিট";

        if (action === 'unlock_10') {
            minutes = 10;
            durationText = "১০ মিনিট";
        } else if (action === 'unlock_perm') {
            minutes = 52560000;
            durationText = "পার্মানেন্ট (স্থায়ী)";
        }

        // ইউনিক ৬ ডিজিটের ওয়ান-টাইম পাসকোড তৈরি
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Supabase ডাটাবেসে ওয়ান-টাইম কোড সেভ করা
        const { error } = await supabase.from('unlock_codes').insert({
            device_id: deviceId,
            code: randomCode,
            duration_minutes: minutes,
            is_used: false
        });

        if (error) {
            console.error("Supabase Save Error:", error);
            return ctx.answerCbQuery("ডাটাবেসে সমস্যা হয়েছে!");
        }

        // টেমপ্লেট ৩: অ্যাডমিনের স্ক্রিনে কনফার্মেশন
        const adminDeliveredMsg = `🔑 <b>Unique Unlock Code Generated</b>\n\n` +
            `🆔 <b>Device ID:</b> <code>${deviceId}</code>\n\n` +
            `🔑 <b>Code:</b> <code>${randomCode}</code>\n\n` +
            `⏱️ <b>Duration:</b> ${durationText}\n` +
            `📌 <b>Status:</b> Unused\n\n` +
            `✅ <b>DELIVERED TO USER (${durationText}ের)</b>`;

        await ctx.editMessageText(adminDeliveredMsg, { parse_mode: 'HTML' });

        // টেমপ্লেট ২: ইউজারের কাছে কোড পাঠানো
        const userCodeDeliveryMsg = `🔐 <b>Unlock Code</b>\n\n` +
            `আপনার Unlock Code:\n\n` +
            `<code>${randomCode}</code>\n\n` +
            `⏱️ এই কোডটি <b>${durationText}ের জন্য</b> ব্যবহারযোগ্য।\n` +
            `🔄 কোডটি শুধুমাত্র একবার ব্যবহার করা যাবে।\n` +
            `📱 এই কোডটি শুধুমাত্র আপনার নির্দিষ্ট ডিভাইসের জন্য কাজ করবে।\n\n` +
            `অ্যাপে ফিরে গিয়ে কোডটি ব্যবহার করুন।`;

        await bot.telegram.sendMessage(targetUserId, userCodeDeliveryMsg, { parse_mode: 'HTML' });
        await ctx.answerCbQuery("কোড তৈরি ও পাঠানো সম্পন্ন!");

    } catch (actionErr) {
        console.error("Action error:", actionErr);
    }
});

// ৩. Render-এর জন্য ডামি HTTP ওয়েব সার্ভার (Render যেন স্লিপে না যায়)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('FocusDurood Telegram Bot is Active & Running 24/7 on Render!');
});

server.listen(PORT, () => {
    console.log(`🌐 Web listener active on port: ${PORT}`);
});

// বট চালু করা
bot.launch().then(() => {
    console.log("🚀 Telegram Bot is running smoothly...");
});

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
});