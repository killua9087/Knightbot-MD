// commands/getkey.js
const axios = require('axios');

async function getKeyCommand(sock, chatId, args) {
  if (!args[0]) {
    return sock.sendMessage(chatId, { text: '❗️ أرسل رابط الـ checkpoint بعد الأمر، مثال:\n/miftah https://...' });
  }
  const url = args[0];
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const text = res.data.toString();

    // نبحث عن أطول سلسلة حروف وأرقام
    const matches = text.match(/([A-Za-z0-9]{10,50})/g);
    if (!matches) {
      return sock.sendMessage(chatId, { text: '❌ لم أعثر على مفتاح ضمن الصفحة.' });
    }
    const key = matches.reduce((a, b) => a.length > b.length ? a : b);

    await sock.sendMessage(chatId, { text: `🔑 مفتاحك: ${key}` });
  } catch (e) {
    console.error(e);
    await sock.sendMessage(chatId, { text: '⚠️ خطأ أثناء جلب المفتاح. تأكد من الرابط وحاول مجدداً.' });
  }
}

module.exports = { getKeyCommand };