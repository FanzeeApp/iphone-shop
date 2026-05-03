const fs = require('fs');
const path = require('path');
const { InputFile } = require('grammy');
const { CHANNEL_ID } = require('./config');
const { getSettings } = require('./db');
const { buildCaption } = require('./formatter');

async function publishToChannel(bot, product, imageFiles) {
  const settings = getSettings();
  const channelId = settings.channel_id || CHANNEL_ID;
  const caption = buildCaption(product, settings);

  const files = (imageFiles || []).filter((f) => f && fs.existsSync(f));
  if (files.length === 0) {
    throw new Error('Kamida bitta rasm yuklash shart.');
  }

  if (files.length === 1) {
    await bot.api.sendPhoto(channelId, new InputFile(files[0]), { caption });
    return;
  }

  const media = files.slice(0, 10).map((file, i) => ({
    type: 'photo',
    media: new InputFile(file),
    ...(i === 0 ? { caption } : {}),
  }));
  await bot.api.sendMediaGroup(channelId, media);
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
