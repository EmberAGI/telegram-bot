import { Composer } from "grammy";
import { fundWallet, getEmberWalletAddress } from "../wallet/fund";
import {
  CODE_REDEEMED_SUCCESS,
  START_MESSAGE,
  SUCCESS_FUND_MESSAGE,
} from "./messages";
import { MyContext, sendFormattedMessage } from "./common";
import { isUserAdmin } from "../user";
import { createReferralCodes, redeemCode } from "../user/codes";
import { getCodeUrl } from "../frontendApi/common";
import { getPool } from "../../common/database";

export const commands = new Composer<MyContext>();

commands.command("start", async (ctx) => {
  if (!ctx.from) return;
  return await sendFormattedMessage(ctx, START_MESSAGE);
});

commands.command("emberWalletAddress", async (ctx) => {
  await ctx.reply(await getEmberWalletAddress());
});

commands.command("fund", async (ctx) => {
  if (!ctx.from || !ctx.from.username) return;
  let transactionUrl;
  try {
    transactionUrl = await fundWallet(
      ctx.from.id.toString(),
      ctx.from.username,
      ctx.match,
    );
  } catch (error) {
    return ctx.reply(`Failed funding wallet: ${error}`);
  }
  return await ctx.api.sendMessage(
    ctx.from.id,
    SUCCESS_FUND_MESSAGE(transactionUrl),
  );
});

commands.command("join", async (ctx) => {
  if (!ctx.from || !ctx.from.username) return;

  let codes;
  try {
    codes = await redeemCode(ctx.match, ctx.from.id, ctx.from.username);
  } catch (error) {
    console.log(error);
    return await ctx.reply("Code redemption failed");
  }

  return await ctx.reply(CODE_REDEEMED_SUCCESS(codes));
});

commands.command("createReferralUrl", async (ctx) => {
  if (!ctx.from) return;
  if (!(await isUserAdmin(ctx.from.id))) return;

  const numberOfUses = parseInt(ctx.match.trim());
  const accessCode = await createReferralCodes(
    numberOfUses,
    ctx.from.username || ctx.from.id.toString(),
    await getPool(),
  );
  if (accessCode.length < 1) return;
  return await ctx.reply(getCodeUrl(accessCode[0].identifier));
});
