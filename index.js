const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();

const SMSPool = require("./smspool");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const smspool = new SMSPool(process.env.SMSPOOL_TOKEN);

// ! Telegraf Log
// bot.use(Telegraf.log());

// ! start
// bot.start(async (ctx) => {
//     ctx.reply(
//         "Choose an option:",
//         Markup.inlineKeyboard([
//             Markup.button.switchToCurrentChat("/sms", "/sms"),
//             Markup.button.switchToCurrentChat("/code", "/code"),
//         ])
//     );
// });

// ! test bot here
bot.command("eval", (ctx) => {
    // Extract the argument after /test
    if (ctx.update.message.from.username != "trangcongloc") return;
    const input = ctx.message.text.split(" ").slice(1).join(" "); // Everything after '/test'
    eval(input);
});

bot.command("test", (ctx) => {
    if (ctx.update.message.from.username != "trangcongloc") return;
    const input = ctx.message.text.split(" ").slice(1).join(" "); // Everything after '/test'
    ctx.replyWithMarkdownV2("test code `12341234`");
});

bot.command("sms", async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    if (
        !ctx.message.is_topic_message ||
        ctx.message.message_thread_id != 11751
    ) {
        const botReply = await ctx.reply(
            `@${ctx.update.message.from.username}\nChỉ dùng được lệnh trong topic *bot*`,
            { parse_mode: "Markdown" }
        );
        setTimeout(async () => {
            try {
                await ctx.deleteMessage(ctx.message.message_id);
                await ctx.deleteMessage(botReply.message_id);
            } catch (_err) {
                console.error("Err in sms Delete Messasge ", _err);
            }
        }, 7500);
        return;
    }

    console.log(
        `LOG | COMMAND | SMS from @${ctx.update.message.from.username}`
    );

    try {
        // Order SMS
        const [phonenumber, orderID] = await smspool.orderSMS({
            country: "US",
            service: "1227",
        });

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2500)); // 2.5-second delay
        // Send a message with order details
        const sentMsg = await ctx.reply(
            `@${ctx.update.message.from.username}\nOrder ID: \`${orderID}\`\nPhone Number: +1 \`${phonenumber}\`\nCode: ...⟳...`,
            { parse_mode: "Markdown" }
        );

        // Wait for the SMS code
        const smsCode = await smspool.waitForSmsCode(orderID);

        // Edit the previous message to include the received SMS code
        await ctx.telegram.editMessageText(
            ctx.chat.id, // Chat ID
            sentMsg.message_id, // Message ID to edit
            null, // Inline message ID (not used here)
            `@${ctx.update.message.from.username}\nOrder ID: \`${orderID}\`\nPhone Number: +1 \`${phonenumber}\`\nCode: \`${smsCode}\``,
            { parse_mode: "Markdown" }
        );
    } catch (error) {
        ctx.reply(
            "Error: " +
                error.message +
                "\nPlease use `/code orderID` to retrieve code",
            { parse_mode: "Markdown" }
        );
    }
});

bot.command("code", async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");

    if (
        !ctx.message.is_topic_message ||
        ctx.message.message_thread_id != 11751
    ) {
        const botReply = await ctx.reply(
            `@${ctx.update.message.from.username}\nChỉ dùng được lệnh trong topic *bot*`,
            { parse_mode: "Markdown" }
        );
        setTimeout(async () => {
            try {
                await ctx.deleteMessage(ctx.message.message_id);
                await ctx.deleteMessage(botReply.message_id);
            } catch (_err) {
                console.error("Err in sms Delete Messasge ", _err);
            }
        }, 7500);
        return;
    }

    const orderID = ctx.text.split(" ").slice(1);
    console.log(
        `LOG | COMMAND | CODE from @${ctx.update.message.from.username}`
    );
    try {
        // Simulate processing delay
        const sentMsg = await ctx.reply(
            `@${ctx.update.message.from.username}\nRetrieving Code for Order ID: \`${orderID}\`\nCode: ...⟳...`,
            { parse_mode: "Markdown" }
        );
        const smsCode = await smspool.waitForSmsCode(orderID);
        await new Promise((resolve) => setTimeout(resolve, 2500)); // 2.5-second delay
        // Edit the previous message to include the received SMS code
        await ctx.telegram.editMessageText(
            ctx.chat.id, // Chat ID
            sentMsg.message_id, // Message ID to edit
            null, // Inline message ID (not used here)
            `@${ctx.update.message.from.username}\nRetrieving Code for Order ID: \`${orderID}\`\nCode: \`${smsCode}\``,
            { parse_mode: "Markdown" }
        );
    } catch (error) {
        ctx.reply("Error: " + error.message);
    }
});

bot.launch({ dropPendingUpdates: true })
    .then(() => console.log("Bot statred with dropPendingUpdates"))
    .catch((_err) => console.error("Error occured: ", _err));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
