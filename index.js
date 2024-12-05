const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();

const SMSPool = require("./smspool");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

console.log("BOT Online");

// ! test bot here
bot.command("bom", (ctx) => {
    ctx.reply("Nhập URL cần bơm");
    bot.on("text", (ctx) => {
        console.log(ctx);
        ctx.reply(`you sent ${ctx.text}`);
    });
});

bot.command("sms", async (ctx) => {
    const smspool = new SMSPool(process.env.SMSPOOL_TOKEN);
    const [phonenumber, orderID] = await smspool.orderSMS({
        country: "US",
        service: "1227",
    });
    ctx.reply(`- order_id: ${orderID}\n- phone_number: +1 ${phonenumber}`);

    const smsCode = await smspool.waitForSmsCode(orderID);
    ctx.reply(`Code: ${smsCode}`);
});
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
