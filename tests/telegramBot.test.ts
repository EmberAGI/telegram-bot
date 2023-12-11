import chai from 'chai';
import PreciseNumber from "../src/common/tokenMath.js";
import { formatForTelegram } from '../src/telegramBot.js';

chai.should();

describe("Telegram Bot", () => {
    it("should convert spoiler syntax from TG markdown to TG html", async () => {
        const replyMessage = `Please select token to send from your wallet ||send address|| to [recipient](tg://user?id=12345678) ||recipient address||`;
        const formattedMessage = await formatForTelegram(replyMessage);
        formattedMessage.should.be.a("string", "Please select token to send from your wallet <tg-spoiler>send address</tg-spoiler> to <a href=\"tg://user?id=12345678\">recipient</a> <tg-spoiler>recipient address</tg-spoiler>")
    });
});