const fs = require('fs');
const { InputFile } = require('grammy');
const { CHANNEL_ID } = require('./config');
const { getSettings } = require('./db');
const { buildCaption } = require('./formatter');

const TG_CAPTION_LIMIT = 1024;

async function publishToChannel(bot, product, imageFiles) {
  const settings = getSettings();
  const channelId = settings.channel_id || CHANNEL_ID;
  const fullCaption = buildCaption(product, settings);

  const files = (imageFiles || []).filter((f) => f && fs.existsSync(f));
  if (files.length === 0) {
    throw new Error('Kamida bitta rasm yuklash shart.');
  }

  const splitNeeded = fullCaption.length > TG_CAPTION_LIMIT;
  const photoCaption = splitNeeded
    ? buildCaption(product, { ...settings, footer_text: '', address: '', phone1: '', phone2: '', telegram_url: '', instagram_url: '' })
    : fullCaption;

  if (files.length === 1) {
    await bot.api.sendPhoto(channelId, new InputFile(files[0]), {
      caption: photoCaption,
      parse_mode: 'HTML',
    });
  } else {
    const media = files.slice(0, 10).map((file, i) => ({
      type: 'photo',
      media: new InputFile(file),
      ...(i === 0 ? { caption: photoCaption, parse_mode: 'HTML' } : {}),
    }));
    await bot.api.sendMediaGroup(channelId, media);
  }

  if (splitNeeded) {
    const footerOnly = buildCaption(
      { /* no product fields */ },
      settings
    );
    if (footerOnly.trim()) {
      await bot.api.sendMessage(channelId, footerOnly, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    }
  }
}

async function notifyChannelAlive(bot) {
  const settings = getSettings();
  const channelId = settings.channel_id || CHANNEL_ID;
  await bot.api.sendMessage(channelId, '✅ Bot ishlayapti.');
}

function cleanupFiles(files) {
  for (const f of files || []) {
    try {
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    } catch (_) {}
  }
}

module.exports = { publishToChannel, notifyChannelAlive, cleanupFiles };
