const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// กำหนดระยะเวลาลูปเควส (1 ชม. 30 นาที = 90 นาที)
const LOOP_MINUTES = 90;

client.on('ready', () => {
  console.log(`บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  // พิมพ์คำสั่ง เช่น !quest 09.00 หรือ !quest 09:00
  if (message.content.startsWith('!quest')) {
    const args = message.content.split(' ');
    const timeStr = args[1];

    if (!timeStr) {
      return message.reply('❌ กรุณาใส่เวลาด้วยครับ เช่น `!quest 09.00` หรือ `!quest 14:30`');
    }

    const cleanTime = timeStr.replace('.', ':');
    const [hours, minutes] = cleanTime.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
      return message.reply('❌ รูปแบบเวลาไม่ถูกต้อง กรุณาใส่ในช่วง 00.00 - 23.59');
    }

    // คำนวณเวลาถัดไป (+90 นาที)
    let nextDate = new Date();
    nextDate.setHours(hours, minutes + LOOP_MINUTES, 0);

    const nextHours = String(nextDate.getHours()).padStart(2, '0');
    const nextMins = String(nextDate.getMinutes()).padStart(2, '0');

    message.reply(`⏳ **รอบปัจจุบัน:** ${timeStr} น.\n🔄 **รอบถัดไป (+1 ชม. 30 นาที):** \`${nextHours}.${nextMins}\` น.`);
  }
});

// ดึง Token จากระบบ Cloud
client.login("MTU1NzIwNjg4NzEzNTU4MDI5Mg.G3AYJn.LcVdRn28AbPhYygdtevoud7LBbYZle8F4lgOfI");
