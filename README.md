# Based Whale

## Description

Based whale is the leading memecoin on Base. get based, become the $WHALE 🐋

![A blue whale with a cigar in it's mouth](./images/basedwhale.png)

## Token Design

WHALE is designed to conform to the current meta of memecoins, namely:

- **Marketing allocation**
  Memecoins are memes with a quantified hype counter (the price). For a memecoin to be successful, it must be fun. To ALOT of people. In other words, marketing. We will have a provisioned marketing multisig with an allocated 5% of the token supply at launch.
- **Buy/sell tax for the first 15 minutes of Launch**
  When a meme coin first launches, there are a legion of dedicated bots that are constantly scanning the chain for potential trade opportunities. In order to discourage these robo legions, we will launch with an initial *buy and sell tax of 15% and 30%, respectively,* for the first *15 minutes*. After that, we will zero out the tax rates. These initial taxes rates will go directly to the marketing multisig mentioned above.

- **Liquidity Pools**
  A liquidity pool is a collection of a pair of tokens which makes it possible to trade between the pair. (WHALE/ETH, for example). The point of liquidity pools are:
  - **Facilitate Trades:** Enable trading on a decentralized exchange (DEX).
  - **Reduce Slippage:** Ensure stable prices for large trades.
  - **Market Stability:** Provide constant token supply, reducing volatility.
  - **Automated Market Making (AMM):** Ensure continuous trading and price adjustments.
  - **Incentivize Participation:** Reward liquidity providers, attracting more liquidity.
  - **Support Token Listings:** Easier trading means we get listed on a wallets like coinbase wallet.
  - **Decentralization:** Reduce reliance on centralized exchanges.
  - **Enable Yield Farming:** Allow additional income for liquidity providers.

  At launch, this liquidity pool with be *locked forever* (i.e., "burn the liquidity") so that no one, not even the founding team, can rug the pool reserves.

- **Contract owner renounciation**
  Initially, the creators will own the token smart contract as a 3/3 multisig wallet. This allows us to:
  - Zero out the buy/sell tax rates after the first 15 minutes.
  - Provision the liquidity pool and burn the liquidity tokens.

  After these tasks are completed, *we will renounce ownership to the community.*

### TLDR; Based Whale will have

- **Capped/max supply**: 1 Billion WHALE
  - 5% to marketing ([Gnosis multisig wallet](basescan.org/1234))
  - 5% to an exchange wallet to provision leading exchanges with the coin for listings ([Gnosis multisig wallet](basescan.org/1234))
  - 5% to another exchange wallet to provision leading exchanges with the coin for listings ([Gnosis multisig wallet](basescan.org/1234))
  - 85% to a Uniswap liquidity pool (ETH/Based Whale pair)
- **Ownership renounced**: Initially owned by a [Gnosis multisig wallet](basescan.org/12345) to provision liquidity pool and zero out buy and sell tax rates after the first 15 minutes (to discourage bot traders)
- **85% supply provisioned liquidity pool at launch**
