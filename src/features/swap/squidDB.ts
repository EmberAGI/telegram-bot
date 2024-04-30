import { ChainData, RouteData, Squid, TokenData } from "@0xsquid/sdk";
import { FUSE } from "./index.js";
import Fuse from "fuse.js";
import z from "zod";
import { getAccountAddress, getSmartAccount } from "../../account/index.js";
import { ChainId } from "@biconomy/core-types";
import { parseUnits } from "viem";

export function getNetworkInformation(networkName: string, squid: Squid) {
  const fuse =
    FUSE ||
    new Fuse(squid.chains, {
      ignoreLocation: true,
      keys: ["networkName"],
    });
  // Find minimum value by reducing array
  return fuse.search(networkName)[0].item;
}

export async function getTokenInformation(
  chainId: string | number,
  tokenSearch: string,
  squid: Squid,
) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${tokenSearch}`,
  );
  if (!response.ok) return undefined;
  const coinsResponse: { coins: { id: string }[] } = await response.json();
  if (coinsResponse.coins.length === 0) return undefined;
  return squid.tokens.find(
    (v) => v.chainId === chainId && v.coingeckoId === coinsResponse.coins[0].id,
  );
}

export const RouteType = z.union([z.literal("buy"), z.literal("swap")]);
type RouteType = z.infer<typeof RouteType>;

export async function getRoute(
  type: RouteType,
  amount: string,
  fromNetwork: ChainData,
  fromToken: TokenData,
  toNetwork: ChainData,
  toToken: TokenData,
  slippage: number,
  squid: Squid,
  identifier: string,
): Promise<RouteData> {
  const account = await getSmartAccount(
    identifier,
    fromNetwork.chainId as ChainId,
    fromNetwork.rpc,
  );
  const receiverAccount = await getSmartAccount(
    identifier,
    toNetwork.chainId as ChainId,
    toNetwork.rpc,
  );
  if (type === "swap") {
    const fromAmount = parseUnits(amount, fromToken.decimals).toString();
    const { route } = await squid.getRoute({
      fromAmount,
      fromChain: fromNetwork.chainId,
      fromToken: fromToken.address,
      fromAddress: await getAccountAddress(account),
      toChain: toNetwork.chainId,
      toToken: toToken.address,
      toAddress: await getAccountAddress(receiverAccount),
      slippage: slippage,
    });
    return route;
  }

  const fromAmount = parseUnits(amount, toToken.decimals).toString();
  const { route: estimatedRoute } = await squid.getRoute({
    fromAmount,
    fromChain: toNetwork.chainId,
    fromToken: toToken.address,
    fromAddress: await getAccountAddress(receiverAccount),
    toChain: fromNetwork.chainId,
    toToken: fromToken.address,
    toAddress: await getAccountAddress(account),
    slippage: slippage,
  });
  const { route } = await squid.getRoute({
    fromAmount: estimatedRoute.estimate.toAmount,
    fromChain: fromNetwork.chainId,
    fromToken: fromToken.address,
    fromAddress: await getAccountAddress(account),
    toChain: toNetwork.chainId,
    toToken: toToken.address,
    toAddress: await getAccountAddress(receiverAccount),
    slippage: slippage,
  });
  return route;
}