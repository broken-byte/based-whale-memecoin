import { ethers } from "hardhat";
import { Signer } from 'ethers';
import { expect } from 'chai';
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  BasedWhale,
  IUniswapV2Router02,
  IUniswapV2Factory,
} from "../typechain-types";
import { LaunchedEvent } from '../typechain-types/contracts/BasedWhale';

describe("BasedWhale", function () {

  async function deployBasedWhaleFixture(): Promise<{
    accounts: Signer[];
    contract: BasedWhale;
  }> {
    const oneBillionCappedSupply = BigInt(1_000_000_000);
    const accounts = await ethers.getSigners();
    const owner = await accounts[0].getAddress();

    const marketingAddress = await accounts[1].getAddress();
    const exchangeAddress1 = await accounts[2].getAddress();
    const exchangeAddress2 = await accounts[3].getAddress();

    const contract = await ethers.deployContract(
      "BasedWhale",
      [
        oneBillionCappedSupply, // cap
        marketingAddress, // marketing
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

  describe("constructor", function () {
    it("should set the deployer as the owner", async function () {
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
      const uniswapV2Pair = await ethers.getContractAt("IUniswapV2Pair", uniswapWethTokenPairAddress);
      const { reserve0: reserveBasedWhale, reserve1: reserveETH } = await uniswapV2Pair.getReserves();
      expect(reserveBasedWhale).to.equal(liquidityAllocationInWei);
      expect(reserveETH).to.equal(ethers.parseEther("1"));
    });
  });
});
