import fs from 'fs';
const PROGRESS_FILE = 'progress.json';
import dotenv from 'dotenv';
dotenv.config();

import { Telegraf, Markup } from 'telegraf';
import fetch from 'node-fetch';

const bot = new Telegraf(process.env.BOT_TOKEN);

let allCards = [];
const CARDS_PER_PAGE = 10;

// Télécharge toutes les cartes Yu-Gi-Oh (une fois)
async function fetchAllCards() {
  const res = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
  const data = await res.json();
  allCards = data.data;
}

// Sauvegarde locale
function saveProgress(page) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ page }), 'utf-8');
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    try {
      return JSON.parse(data).page ?? 0;
    } catch {
      return 0;
    }
  }
  return 0;
}


// Formate les infos de la carte
function formatCardInfo(card) {
  return `🃏 *${card.name}*
*Type :* ${card.type}
*Race :* ${card.race}
*ATK/DEF :* ${card.atk ?? 'N/A'} / ${card.def ?? 'N/A'}
*Level :* ${card.level ?? 'N/A'}
*Description :* ${card.desc}`;
}

// Envoie une page de cartes (10 par page)
async function sendCardPage(ctx, page) {
  const start = page * CARDS_PER_PAGE;
  const end = start + CARDS_PER_PAGE;
  const cards = allCards.slice(start, end);

  saveProgress(page); // 🔒 Sauvegarde locale de la page

  for (const card of cards) {
    await ctx.replyWithPhoto(
      { url: card.card_images[0].image_url },
      {
        caption: formatCardInfo(card),
        parse_mode: 'Markdown'
      }
    );
  }

  await ctx.reply(
    `📄 Page ${page + 1}`,
    Markup.inlineKeyboard([
      ...(page > 0 ? [Markup.button.callback('⬅️ Précédent', `page_${page - 1}`)] : []),
      ...(end < allCards.length ? [Markup.button.callback('➡️ Suivant', `page_${page + 1}`)] : [])
    ])
  );
}

// Commande /all
bot.command('all', async (ctx) => {
  if (!allCards.length) {
    await ctx.reply("⏳ Chargement de toutes les cartes Yu-Gi-Oh...");
    await fetchAllCards();
  }
  
  const lastPage = loadProgress(); // 🔁 Reprise à la dernière page
  await sendCardPage(ctx, lastPage);
});

// Gestion des pages via les boutons
bot.on('callback_query', async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^page_(\d+)$/);
  if (!match) return;

  const page = parseInt(match[1]);
  await sendCardPage(ctx, page);
  await ctx.answerCbQuery();
});

bot.launch();
