// main.js
const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fs = require('fs');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

// New command import\ nconst { getKeyCommand } = require('./commands/getkey');

// Command imports
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand } = require('./commands/antilink');
const { Antilink } = require('./lib/antilink');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const { startHangman, guessLetter } = require('./commands/hangman');
const { startTrivia, answerTrivia } = require('./commands/trivia');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { lyricsCommand } = require('./commands/lyrics');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const welcomeCommand = require('./commands/welcome');
const goodbyeCommand = require('./commands/goodbye');
const githubCommand = require('./commands/github');
const { handleBadwordDetection } = require('./lib/antibadword');
const { handleChatbotResponse } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const { flirtCommand } = require('./commands/flirt');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const shipCommand = require('./commands/ship');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand } = require('./commands/autostatus');
const { simpCommand } = require('./commands/simp');
const { stupidCommand } = require('./commands/stupid');
const pairCommand = require('./commands/pair');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://chat.whatsapp.com/GMbpC4LY581FwCkFYM7dFn";
global.ytch = "Mr Unique Hacker";

// Forwarded context info
const channelInfo = {
  contextInfo: {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363161513685998@newsletter',
      newsletterName: 'KnightBot MD',
      serverMessageId: -1
    }
  }
};

async function handleMessages(sock, messageUpdate, printLog) {
  try {
    const { messages, type } = messageUpdate;
    if (type !== 'notify') return;

    const message = messages[0];
    if (!message?.message) return;

    const chatId = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    let userMessage = message.message.conversation?.trim()?.toLowerCase() ||
                      message.message.extendedTextMessage?.text?.trim()?.toLowerCase() || '';
    userMessage = userMessage.replace(/\.\s+/g, '.').trim();

    // Log usage
    if (userMessage.startsWith('.') || userMessage.startsWith('/')) {
      console.log(`Command by ${isGroup ? 'group' : 'private'}: ${userMessage}`);
    }

    // Banned check
    if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
      if (Math.random() < 0.1) {
        await sock.sendMessage(chatId, { text: '❌ You are banned.', ...channelInfo });
      }
      return;
    }

    // Game move
    if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
      await handleTicTacToeMove(sock, chatId, senderId, userMessage);
      return;
    }

    // Private auto-response
    if (!isGroup && ['hi','hello','bot','hlo','hey','bro'].includes(userMessage)) {
      await sock.sendMessage(chatId, { text: 'Hi! Use .menu for commands.', ...channelInfo });
      return;
    }

    if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

    // Badword in groups
    if (isGroup) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);

    // Non-command group messages
    if (!userMessage.startsWith('.') && !userMessage.startsWith('/')) {
      if (isGroup) {
        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
        await Antilink(message, sock);
        await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
      }
      return;
    }

    // Admin checks
    const adminCommands = ['.mute','.unmute','.ban','.unban','.promote','.demote','.kick','.tagall','.antilink'];
    let isSenderAdmin = false, isBotAdmin = false;
    if (isGroup && adminCommands.some(cmd => userMessage.startsWith(cmd))) {
      const status = await isAdmin(sock, chatId, senderId);
      isSenderAdmin = status.isSenderAdmin;
      isBotAdmin = status.isBotAdmin;
      if (!isBotAdmin) return sock.sendMessage(chatId, { text: 'Make me admin first.', ...channelInfo });
      if (!isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: 'Only admins.', ...channelInfo });
    }

    // Public mode check
    try {
      const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
      const sNum = senderId.split('@')[0];
      if (!data.isPublic && sNum !== settings.ownerNumber) return;
    } catch {}

    // Handle commands
    switch(true) {
      case userMessage === '.help' || userMessage === '.menu':
        await helpCommand(sock, chatId, global.channelLink);
        break;
      // ... all other existing command cases ...

      // GETKEY command
      case userMessage.startsWith('/مفتاح') || userMessage.startsWith('/key'): {
        const args = userMessage.split(/\s+/).slice(1);
        await getKeyCommand(sock, chatId, args);
        break;
      }

      default:
        // no match
    }

  } catch(err) {
    console.error('handleMessages error', err);
  }
}

module.exports = { handleMessages };

