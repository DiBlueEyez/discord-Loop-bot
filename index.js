const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const axios = require('axios');

// ==========================================
// 1. ระบบ WEB SERVER & SELF-PING FOR RENDER
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running and awake 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// Self-Ping ยิงสะกิดตัวเองทุกๆ 30 วินาที
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
    setInterval(() => {
        axios.get(RENDER_URL)
            .then(() => console.log('Self-ping successful'))
            .catch(err => console.error('Self-ping error:', err.message));
    }, 30000);
}

// ==========================================
// 2. โค้ด Discord Bot
// ==========================================
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

    // วนลูปตรวจเช็กเวลาทุกๆ 10 วินาที
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
            return true;
        });
    }, 10000);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // ==========================================
    // ลูปสายไฟ (เริ่มต้นด้วย E หรือ e)
    // ==========================================
    const wireRegex = /^[Ee]([0-1]?[0-9]|2[0-3])[.:]([0-5][0-9])$/;
    const wireMatch = content.match(wireRegex);

    if (wireMatch) {
        let startH = parseInt(wireMatch[1]);
        let startM = parseInt(wireMatch[2]);

        // คำนวณช่วงเวลา (แปลงเวลาเป็นจำนวนนาทีรวมเพื่อเปรียบเทียบง่ายขึ้น)
        const totalStartMin = startH * 60 + startM;
        const dayShiftStart = 6 * 60;       // 06:00 (360 นาที)
        const dayShiftEnd = 17 * 60 + 59;   // 17:59 (1079 นาที)

        const isDayShift = totalStartMin >= dayShiftStart && totalStartMin <= dayShiftEnd;

        let loops = [];
        let curH = startH;
        let curM = startM;

        while (true) {
            // บวกเวลาไป 1 ชั่วโมง 35 นาที
            curH += 1;
            curM += 35;

            if (curM >= 60) {
                curH += 1;
                curM -= 60;
            }
            if (curH >= 24) {
                curH -= 24;
            }

            const curTotalMin = curH * 60 + curM;

            // ตรวจสอบขอบเขตเวลาช่วงกะ
            if (isDayShift) {
                // ช่วง 06:00 - 17:59
                if (curTotalMin < dayShiftStart || curTotalMin > dayShiftEnd) break;
            } else {
                // ช่วง 18:00 - 05:59 (ข้ามคืน)
                if (curTotalMin >= dayShiftStart && curTotalMin <= dayShiftEnd) break;
            }

            const formattedH = String(curH).padStart(2, '0');
            const formattedM = String(curM).padStart(2, '0');
            loops.push(`${formattedH}.${formattedM}`);
        }

        if (loops.length === 0) {
            message.channel.send(`⚠️ ไม่สามารถสร้างลูปสายไฟได้เนื่องจากเวลาที่ใส่ไม่อยู่ในเงื่อนไข หรือเกินช่วงเวลากะครับ`);
            return;
        }

        // ตั้งเตือนล่วงหน้า 5 นาที สำหรับลูปแรกสุดในรายการ
        const [firstH, firstM] = loops[0].split('.').map(Number);
        let alertH = firstH;
        let alertM = firstM - 5;

        if (alertM < 0) {
            alertM += 60;
            alertH -= 1;
            if (alertH < 0) alertH += 24;
        }

        scheduledAlerts.push({
            channel: message.channel,
            targetTimeString: loops[0],
            alertHour: alertH,
            alertMinute: alertM
        });

        const formattedAlertH = String(alertH).padStart(2, '0');
        const formattedAlertM = String(alertM).padStart(2, '0');

        // จัดรูปแบบข้อความแสดงรายการลูปสายไฟ
        let loopListText = loops.map((time, index) => `${index + 1}. ${time} น.`).join('\n');

        message.channel.send(
            `⚡ **รายการเวลาของลูปสายไฟถัดไป:**\n${loopListText}\n\n` +
            `🔔 **ตั้งเวลาเตือน:** บอทจะแจ้งเตือนตอน ${formattedAlertH}.${formattedAlertM} น. (ล่วงหน้า 5 นาทีสำหรับรอบแรก)`
        );
        return;
    }

    // ==========================================
    // ลูปน้ำมัน (คำสั่งเดิม)
    // ==========================================
    const oilRegex = /^([0-1]?[0-9]|2[0-3])[.:]([0-5][0-9])$/;
    const oilMatch = content.match(oilRegex);

    if (oilMatch) {
        let hours = parseInt(oilMatch[1]);
        let minutes = parseInt(oilMatch[2]);

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

        // 2. คำนวณเวลาแจ้งเตือนล่วงหน้า 5 นาที
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

        // ตอบกลับตั้งค่าลูปน้ำมันสำเร็จ
        message.channel.send(
            `⏰ **ลูปถัดไป (น้ำมัน):** ${targetTimeString} น.\n` +
            `🔔 **ตั้งเวลาเตือน:** บอทจะแจ้งเตือนตอน ${formattedAlertHours}.${formattedAlertMinutes} น. (ล่วงหน้า 5 นาที)`
        );
    }
});

client.login(process.env.DISCORD_TOKEN);
