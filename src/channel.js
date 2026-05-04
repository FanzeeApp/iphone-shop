const { InputFile } = require('grammy');
const { CHANNEL_ID } = require('./config');
const { getSettings } = require('./db');
const { buildCaption } = require('./formatter');

const TG_CAPTION_LIMIT = 1024;

/**
 * Publish a product post to the configured channel.
 *
 * @param {object} bot grammY bot instance
 * @param {object} product product fields (model, memory, ..., admin_fee)
 * @param {Array<{buffer: Buffer, filename: string}>} photos in-memory photos
 */
async function publishToChannel(bot, product, photos) {
  const settings = getSettings();
  const channelId = settings.channel_id || CHANNEL_ID;
  const fullCaption = buildCaption(product, settings);

  const items = (photos || []).filter((p) => p && p.buffer && p.buffer.length);
  if (items.length === 0) {
    throw new Error('Kamida bitta rasm yuklash shart.');
  }

  const splitNeeded = fullCaption.length > TG_CAPTION_LIMIT;
  const photoCaption = splitNeeded
    ? buildCaption(product, {
        ...settings,
        footer_text: '',
        tagline: '',
        address: '',
        address_full: '',
        phone1: '',
        phone2: '',
        phone3: '',
        working_hours: '',
        telegram_url: '',
        instagram_url: '',
      })
    : fullCaption;

  if (items.length === 1) {
    await bot.api.sendPhoto(channelId, new InputFile(items[0].buffer, items[0].filename), {
      caption: photoCaption,
      parse_mode: 'HTML',
    });
  } else {
    const media = items.slice(0, 10).map((item, i) => ({
      type: 'photo',
      media: new InputFile(item.buffer, item.filename),
      ...(i === 0 ? { caption: photoCaption, parse_mode: 'HTML' } : {}),
    }));
    await bot.api.sendMediaGroup(channelId, media);
  }

  if (splitNeeded) {
    const footerOnly = buildCaption({}, settings);
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

module.exports = { publishToChannel, notifyChannelAlive };
