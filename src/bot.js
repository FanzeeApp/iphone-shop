const { Bot, InlineKeyboard } = require('grammy');
const { BOT_TOKEN, WEB_APP_URL, OWNER_ID } = require('./config');
const { isAdmin, addAdmin } = require('./db');
const { notifyChannelAlive } = require('./channel');

const bot = new Bot(BOT_TOKEN);

function adminMenu() {
  return new InlineKeyboard()
    .webApp('📝 Yangi post yaratish', `${WEB_APP_URL}/`)
    .row()
    .webApp('⚙️ Sozlamalar', `${WEB_APP_URL}/?tab=settings`)
    .row()
    .webApp('👥 Adminlar', `${WEB_APP_URL}/?tab=admins`)
    .row()
    .text('✅ Bot ishlayaptimi?', 'check_alive');
}

bot.command('start', async (ctx) => {
  const uid = ctx.from?.id;
  if (!uid) return;

  if (!isAdmin(uid)) {
    await ctx.reply('👋 Salom! Bu yopiq bot. Faqat do‘kon adminlari foydalanishi mumkin.');
    return;
  }

  await ctx.reply(
    `👋 Salom, ${ctx.from.first_name || 'admin'}!\n\nQuyidagi tugmalardan foydalaning:`,
    { reply_markup: adminMenu() }
  );
});

bot.command('menu', async (ctx) => {
  if (!isAdmin(ctx.from?.id)) return;
  await ctx.reply('Menyu:', { reply_markup: adminMenu() });
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`Sizning Telegram ID: <code>${ctx.from.id}</code>`, { parse_mode: 'HTML' });
});

bot.command('addadmin', async (ctx) => {
  if (Number(ctx.from?.id) !== OWNER_ID) {
    await ctx.reply('❌ Faqat egasi yangi admin qo‘sha oladi.');
    return;
  }
  const arg = ctx.match?.trim();
  const id = Number(arg);
  if (!id) {
    await ctx.reply('Foydalanish: /addadmin <telegram_id>\nID ni /myid orqali olish mumkin.');
    return;
  }
  addAdmin({ telegram_id: id, username: null, full_name: null });
  await ctx.reply(`✅ Admin qo‘shildi: <code>${id}</code>`, { parse_mode: 'HTML' });
});

bot.callbackQuery('check_alive', async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: 'Ruxsat yo‘q', show_alert: true });
    return;
  }
  try {
    await notifyChannelAlive(bot);
    await ctx.answerCallbackQuery({ text: '✅ Kanalga yuborildi', show_alert: false });
  } catch (e) {
    await ctx.answerCallbackQuery({
      text: '❌ Yuborib bo‘lmadi: ' + (e.description || e.message),
      show_alert: true,
    });
  }
});

bot.catch((err) => {
  console.error('[bot]', err);
});

module.exports = { bot };
