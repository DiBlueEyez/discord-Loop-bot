const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ตัวแปรสำหรับเก็บรายการแจ้งเตือนที่กำลังรอเวลา
let scheduledAlerts = [];

client.on('ready', () => {
    console.log(`บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);

    // วนลูปตรวจเช็กเวลาทุกๆ 10 วินาที เพื่อดูว่าถึงเวลาแจ้งเตือนหรือยัง
    setInterval(() => {
        const now = new Date();

        // ดึงเวลาปัจจุบันในโซนประเทศไทย (UTC+7)
        const thaiTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
        const [currentHour, currentMinute] = thaiTimeStr.split(':').map(Number);

        // ตรวจสอบรายการแจ้งเตือนทั้งหมด
        scheduledAlerts = scheduledAlerts.filter(alert => {
            if (currentHour === alert.alertHour && currentMinute === alert.alertMinute) {
                // ส่งข้อความแจ้งเตือนเข้าห้องที่พิมพ์สั่งไว้
                alert.channel.send(`🔔 **แจ้งเตือน:** อีก 5 นาทีจะถึงเวลารอบถัดไปแล้ว! (${alert.targetTimeString} น.)`);
                return false; // ลบออกจากรายการเมื่อแจ้งเตือนแล้ว
            }
            return true; // เก็บรายการที่ยังไม่ถึงเวลาไว้ต่อไป
        });
    }, 10000); // เช็กทุก 10 วินาที
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Regex ตรวจจับรูปแบบเวลา เช่น 10.00 หรือ 10:00
    const timeRegex = /^([0-1]?[0-9]|2[0-3])[.:]([0-5][0-9])$/;
    const match = message.content.trim().match(timeRegex);

    if (match) {
        let hours = parseInt(match[1]);
        let minutes = parseInt(match[2]);

        // 1. คำนวณเวลาลูปถัดไป (+1 ชั่วโมง 30 นาที)
        let targetHours = hours + 1;
        let targetMinutes = minutes + 30;

        if (targetMinutes >= 60) {
            targetHours += 1;
            targetMinutes -= 60;
        }
        if (targetHours >= 24) {
            targetHours -= 24;
        }

        const formattedTargetHours = String(targetHours).padStart(2, '0');
        const formattedTargetMinutes = String(targetMinutes).padStart(2, '0');
        const targetTimeString = `${formattedTargetHours}.${formattedTargetMinutes}`;

        // 2. คำนวณเวลาแจ้งเตือนล่วงหน้า 5 นาที (ลบออก 5 นาทีจากเวลาเป้าหมาย)
        let alertHours = targetHours;
        let alertMinutes = targetMinutes - 5;

        if (alertMinutes < 0) {
            alertMinutes += 60;
            alertHours -= 1;
            if (alertHours < 0) {
                alertHours += 24;
            }
        }

        // บันทึกการแจ้งเตือนลงในรายการ
        scheduledAlerts.push({
            channel: message.channel,
            targetTimeString: targetTimeString,
            alertHour: alertHours,
            alertMinute: alertMinutes
        });

        const formattedAlertHours = String(alertHours).padStart(2, '0');
        const formattedAlertMinutes = String(alertMinutes).padStart(2, '0');

        // ตอบกลับตั้งค่าลูปสำเร็จ
        message.channel.send(
            `⏰ **ลูปถัดไป:** ${targetTimeString} น.\n` +
            `🔔 **ตั้งเวลาเตือน:** บอทจะแจ้งเตือนตอน ${formattedAlertHours}.${formattedAlertMinutes} น. (ล่วงหน้า 5 นาที)`
        );
    }
});

client.login(process.env.DISCORD_TOKEN);
