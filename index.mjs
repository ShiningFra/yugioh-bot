import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// Remplace par ton token Telegram
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Bienvenue ! Envoie-moi le nom d’une carte Yu-Gi-Oh.');
});

bot.on('text', async (ctx) => {
  const cardName = ctx.message.text.trim();
  const apiURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`;

  try {
    const res = await fetch(apiURL);
    const data = await res.json();

    if (!data.data || !data.data.length) {
      await ctx.reply("❌ Carte non trouvée !");
      return;
    }

    const card = data.data[0];
    const imageUrl = card.card_images[0].image_url;

    // Téléchargement image
    const imageRes = await fetch(imageUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${card.name.replace(/[^\w\d]/g, '_')}.jpg`;
    const imagePath = path.join(__dirname, fileName);
    fs.writeFileSync(imagePath, buffer);

    // Infos à afficher
    const infoText = `🃏 *${card.name}*
*Type :* ${card.type}
*Race :* ${card.race}
*ATK/DEF :* ${card.atk ?? 'N/A'} / ${card.def ?? 'N/A'}
*Level :* ${card.level ?? 'N/A'}
*Description :* ${card.desc}`;

    await ctx.sendPhoto(
      { source: imagePath },
      { caption: infoText, parse_mode: 'Markdown' }
    );

    fs.unlinkSync(imagePath);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Erreur lors de la récupération.");
  }
});

bot.launch();
