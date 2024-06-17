import { ethers } from "hardhat";
import { Signer } from 'ethers';
import { expect } from 'chai';
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { IERC20 } from "../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20";
import {
  BasedWhale,
  IUniswapV2Router02,
  IUniswapV2Factory,
  IUniswapV2Pair,
} from "../typechain-types";
import {
  LaunchedEvent,
  LiquidityLockedEvent,
  BuyTaxedEvent,
  SellTaxedEvent
} from '../typechain-types/contracts/BasedWhale';

describe("BasedWhale", function () {

  async function deployBasedWhaleFixture(): Promise<{
    accounts: Signer[];
    contract: BasedWhale;
  }> {
    const oneBillionCappedSupply = BigInt(1_000_000_000);
    const accounts = await ethers.getSigners();
    const ownerAddress = await accounts[0].getAddress();

    const marketingAddress = await accounts[1].getAddress();
    const exchangeAddress1 = await accounts[2].getAddress();
    const exchangeAddress2 = await accounts[3].getAddress();

    const contract = await ethers.deployContract(
      "BasedWhale",
      [
        oneBillionCappedSupply, // cap
        ownerAddress, // ownerMultiSig
        marketingAddress, // marketingMultiSig
        exchangeAddress1, // exchangeMultiSig1
        exchangeAddress2, // exchangeMultiSig2
      ],
      {
        value: ethers.parseEther("2") // Provision 2 Ether to the contract upon deployment
      }
    );

    await contract.waitForDeployment();

    return { accounts, contract };
  }

  async function isContractDeployed(address: string): Promise<boolean> {
    const bytecode = await ethers.provider.getCode(address);
    return bytecode !== '0x';
  }

  async function getFirstLaunchedEvent(
    contract: BasedWhale
  ): Promise<LaunchedEvent.LogDescription["args"]> {
    const launchedFilter = contract.filters.Launched(undefined, undefined);
    const launchedEvents = await contract.queryFilter(launchedFilter);
    if (launchedEvents.length > 0) {
      return launchedEvents[0].args as LaunchedEvent.LogDescription["args"];
    } else {
      throw new Error("No Launched events found");
    }
  }

  async function getFirstLiquidityLockedEvent(
    contract: BasedWhale
  ): Promise<LiquidityLockedEvent.LogDescription["args"]> {
    const liquidityLockedFilter = contract.filters.LiquidityLocked(undefined, undefined, undefined, undefined, undefined);
    const liquidityLockedEvents = await contract.queryFilter(liquidityLockedFilter);
    if (liquidityLockedEvents.length > 0) {
      return liquidityLockedEvents[0].args as LiquidityLockedEvent.LogDescription["args"];
    } else {
      throw new Error("No LiquidityLocked events found");
    }
  }

  async function getFirstBuyTaxEvent(
    contract: BasedWhale
  ): Promise<BuyTaxedEvent.LogDescription["args"]> {
    const buyTaxFilter = contract.filters.BuyTaxed(undefined, undefined, undefined, undefined);
    const buyTaxEvents = await contract.queryFilter(buyTaxFilter);
    if (buyTaxEvents.length > 0) {
      return buyTaxEvents[0].args as BuyTaxedEvent.LogDescription["args"];
    } else {
      throw new Error("No BuyTax events found");
    }
  }

  async function getFirstSellTaxEvent(
    contract: BasedWhale
  ): Promise<SellTaxedEvent.LogDescription["args"]> {
    const sellTaxFilter = contract.filters.SellTaxed(undefined, undefined, undefined, undefined);
    const sellTaxEvents = await contract.queryFilter(sellTaxFilter);
    if (sellTaxEvents.length > 0) {
      return sellTaxEvents[0].args as SellTaxedEvent.LogDescription["args"];
    } else {
      throw new Error("No SellTax events found");
    }
  }

  describe("constructor", function () {

    it("should deploy the contract successfully", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);

      expect(await isContractDeployed(await contract.getAddress())).to.be.true;
    });

    it("should have set the owner as the constructor ownerMultiSig address argument", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const ownerAddress = await accounts[0].getAddress();

      expect(await contract.owner()).to.equal(ownerAddress);
    });

    it("should be able to cap the supply to the constructor value (1 billion)", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const totalSupplyInWei = BigInt(1_000_000_000) * BigInt(10) ** await contract.decimals();

      expect(await contract.cap()).to.equal(totalSupplyInWei);
    });

    it("should set the marketing multisig address correctly", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const marketingAddress = await accounts[1].getAddress();

      expect(await contract.marketingMultiSig()).to.equal(marketingAddress);
    });

    it("should set the exchange multisig addresses correctly", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const exchangeAddress1 = await accounts[2].getAddress();
      const exchangeAddress2 = await accounts[3].getAddress();

      expect(await contract.exchangeMultiSig1()).to.equal(exchangeAddress1);
      expect(await contract.exchangeMultiSig2()).to.equal(exchangeAddress2);
    });

    it("should have allocated the correct amount of the total supply of tokens to the marketing address",
      async function () {
        const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
        const totalSupplyInWei = BigInt(1_000_000_000) * BigInt(10) ** await contract.decimals();
        const marketingAddress = await accounts[1].getAddress();
        // 5% allocated to marketing
        const marketingAllocationInWei = BigInt(totalSupplyInWei) * BigInt(5) / BigInt(100);

        expect(await contract.balanceOf(marketingAddress)).to.equal(marketingAllocationInWei);
      });

    it("should have allocated the correct amount of the total supply of tokens to the exchange multisig addresses",
      async function () {
        const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
        const totalSupplyInWei = BigInt(1_000_000_000) * BigInt(10) ** await contract.decimals();
        const exchangeAddress1 = await accounts[2].getAddress();
        const exchangeAddress2 = await accounts[3].getAddress();
        // 5% allocated to marketing
        const marketingAllocationInWei = BigInt(totalSupplyInWei) * BigInt(5) / BigInt(100);

        // 5% allocated to each exchange multisig.
        const exchange1AllocationInWei = BigInt(totalSupplyInWei) * BigInt(5) / BigInt(100);
        const exchange2AllocationInWei = BigInt(totalSupplyInWei) * BigInt(5) / BigInt(100);

        expect(await contract.balanceOf(exchangeAddress1)).to.equal(exchange1AllocationInWei);
        expect(await contract.balanceOf(exchangeAddress2)).to.equal(exchange2AllocationInWei);
      });

    it("should have set the initial buy and sell taxes at the contract level to 10% and 30%, respectively",
      async function () {
        const { contract } = await loadFixture(deployBasedWhaleFixture);

        // Solidity does not support floating point numbers, so the tax rates are expected to be set as 100 and 300
        expect(await contract.buyTaxRate()).to.equal(100);
        expect(await contract.sellTaxRate()).to.equal(300);
      });

    it("should have emitted a correct Launched event", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const launchedEvent = await getFirstLaunchedEvent(contract);
      const ownerAddress = await accounts[0].getAddress();

      expect(launchedEvent.launcherAddress).to.equal(ownerAddress);
    });
  });

  describe("initializeUniswapLiquidity", function () {

    it("should have set the uniswapV2RouterAddress correctly", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      expect(await contract.uniswapV2Router()).to.equal(uniswapRouterBaseAddress);
    });

    it("should have deployed the WETH/BasedWhale pair via the Uniswap Router", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      const uniswapWethTokenPairAddress = await contract.uniswapV2PairAddress();
      expect(await isContractDeployed(uniswapWethTokenPairAddress)).to.be.true;
    });

    it("should have prompted Uniswap Factory to successfully create the WETH/BasedWhale Pair", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const basedWhaleTokenAddress = await contract.getAddress();
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
      const uniswapFactoryBaseAddress: string = "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6";

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      const uniswapWethTokenPairAddress = await contract.uniswapV2PairAddress();
      const uniswapRouter = await ethers.getContractAt("IUniswapV2Router02", uniswapRouterBaseAddress) as IUniswapV2Router02;
      const uniswapFactory = await ethers.getContractAt("IUniswapV2Factory", uniswapFactoryBaseAddress) as IUniswapV2Factory;
      const wethAddress = await uniswapRouter.WETH();
      const pairAddress = await uniswapFactory.getPair(wethAddress, basedWhaleTokenAddress);
      expect(pairAddress).to.equal(uniswapWethTokenPairAddress);
    });

    it("should have set the correct liquidity reserves for the WETH/BasedWhale pair", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
      const totalSupplyInWei = BigInt(1_000_000_000) * BigInt(10) ** await contract.decimals();
      const liquidityAllocationInWei = BigInt(totalSupplyInWei) * BigInt(85) / BigInt(100);

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      const uniswapWethTokenPairAddress = await contract.uniswapV2PairAddress();
      const uniswapV2Pair = await ethers.getContractAt("IUniswapV2Pair", uniswapWethTokenPairAddress) as IUniswapV2Pair;
      const { reserve0: reserveBasedWhale, reserve1: reserveETH } = await uniswapV2Pair.getReserves();
      expect(reserveBasedWhale).to.equal(liquidityAllocationInWei);
      expect(reserveETH).to.equal(ethers.parseEther("1"));
    });

    it("should have burned the liquidity tokens for the WETH/BasedWhale pair (to the zero address)", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      const uniswapWethTokenPairAddress = await contract.uniswapV2PairAddress();
      const uniswapV2Pair = await ethers.getContractAt("IUniswapV2Pair", uniswapWethTokenPairAddress);
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      const totalSupply = await uniswapV2Pair.totalSupply();
      expect(await uniswapV2Pair.balanceOf(zeroAddress)).to.equal(totalSupply);
    });

    it("should have emitted a correct LiquidityLocked event", async function () {
      const { contract } = await loadFixture(deployBasedWhaleFixture);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);

      const liquidityLockedEvent = await getFirstLiquidityLockedEvent(contract);
      const uniswapWethTokenPairAddress = await contract.uniswapV2PairAddress();
      const uniswapV2Pair = await ethers.getContractAt("IUniswapV2Pair", uniswapWethTokenPairAddress);
      const { reserve0: reserveBasedWhale, reserve1: reserveETH } = await uniswapV2Pair.getReserves();
      const totalSupplyOfLiquidityTokens = await uniswapV2Pair.totalSupply();
      expect(liquidityLockedEvent.liquidityPairAddress).to.equal(uniswapWethTokenPairAddress);
      expect(liquidityLockedEvent.amountOfTokens).to.equal(reserveBasedWhale);
      expect(liquidityLockedEvent.amountOfETH).to.equal(reserveETH);
      expect(liquidityLockedEvent.amountOfLiquidityTokensBurned).to.equal(totalSupplyOfLiquidityTokens);
    });
  });

  describe("Uniswap Liquidity Pool", function () {

    /*
    What else do I need to test for my contract?

    1. I need to test whether the contract can be deployed successfully.
    2. I need to test whether zeroing out the tax rates works
    3. I need to test that you cannot zero out the tax rates if you are not the owner (basically do that for every onlyOwner function)
    4. I need to test that the uniswap pool taxes people correctly
    5. I need to test that the contract can be renounced correctly
    6. I need to test that once renounced, the contract cannot be interacted with via the onlyOwner functions
    7. I need to test that once the tax rates are zeroed out, that the uniswap pool does not tax people on buys and sells. 
    **/

    it("should have triggered the token contract to send 10% to the marking address on buys", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const buyer = await accounts[4].getAddress();
      const ethBeingUsedForPurchase: bigint = ethers.parseEther("0.25");
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
      const marketingAddress = await contract.marketingMultiSig();
      const marketingAddressBalanceBefore = await contract.balanceOf(marketingAddress);
      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);
      const uniswapV2Router =
        await ethers.getContractAt("IUniswapV2Router02", uniswapRouterBaseAddress) as IUniswapV2Router02;

      await uniswapV2Router.swapExactETHForTokens(
        0, // accept any amount of tokens
        [await uniswapV2Router.WETH(), await contract.getAddress()],
        buyer,
        Date.now(),
        { value: ethBeingUsedForPurchase }
      );

      const buyTaxEvent = await getFirstBuyTaxEvent(contract);
      const expectedTaxAmountFromEvent = buyTaxEvent.taxAmount; // 10% of the amount of tokens bought
      const marketingAddressBalanceAfter = await contract.balanceOf(marketingAddress);
      expect(marketingAddressBalanceAfter).to.equal(marketingAddressBalanceBefore + expectedTaxAmountFromEvent);
    });

    it("should have triggered the token contract to send the expected amount of tokens to the buyer minus the buy fee", 
      async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      const buyer = await accounts[4].getAddress();
      const ethBeingUsedForPurchase: bigint = ethers.parseEther("0.25");
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);
      const uniswapV2Router =
        await ethers.getContractAt("IUniswapV2Router02", uniswapRouterBaseAddress) as IUniswapV2Router02;

      await uniswapV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        0, // accept any amount of tokens
        [await uniswapV2Router.WETH(), await contract.getAddress()],
        buyer,
        Date.now(),
        { value: ethBeingUsedForPurchase }
      );

      const buyTaxEvent = await getFirstBuyTaxEvent(contract);
      const expectedAmountToReceive = buyTaxEvent.amountOfTokens - buyTaxEvent.taxAmount;
      const buyerBalance = await contract.balanceOf(buyer);
      expect(buyerBalance).to.equal(expectedAmountToReceive);
    });

    it("should have triggered the token contract to send 30% to the marking address on sells", async function () {
      const { accounts, contract } = await loadFixture(deployBasedWhaleFixture);
      // Exchange multisig 1 is the seller since it has 5% of the total supply allocated to it
      const exchangeAddress1AsSeller = await accounts[2].getAddress();
      const sellAmount = await contract.balanceOf(exchangeAddress1AsSeller) * BigInt(2) / BigInt(100);
      const uniswapRouterBaseAddress: string = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
      const marketingAddress = await contract.marketingMultiSig();
      const marketingAddressBalanceBefore = await contract.balanceOf(marketingAddress);
      await contract.initializeUniswapLiquidity(uniswapRouterBaseAddress);
      const uniswapV2Router =
        await ethers.getContractAt("IUniswapV2Router02", uniswapRouterBaseAddress) as IUniswapV2Router02;
      await contract.connect(accounts[2]).approve(uniswapRouterBaseAddress, sellAmount);

      await uniswapV2Router.connect(accounts[2]).swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmount, 
        0, // accept any amount of tokens
        [await contract.getAddress(), await uniswapV2Router.WETH()],
        exchangeAddress1AsSeller,
        Date.now()
      );

      const sellTaxEvent = await getFirstSellTaxEvent(contract);
      const expectedTaxAmountFromEvent = sellTaxEvent.taxAmount; // 30% of the amount of tokens sold
      const marketingAddressBalanceAfter = await contract.balanceOf(marketingAddress);
      expect(marketingAddressBalanceAfter).to.equal(marketingAddressBalanceBefore + expectedTaxAmountFromEvent);
    });
  });
});
