import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const BasedWhaleModule = buildModule("BasedWhale", (m) => {
  const oneBillionCappedSupply = BigInt(1_000_000_000);
  const initialOwnerAddress = "0x566bD9Df983BfEFf836A2C3b644553e6A80850Fa" // BrokenByte Engineering Deployer;
  const marketingMultiSigAddress = "0x65D23D5956b2F7E519df94dffA21ff3b078e7FE0";
  const exchangeMultiSigAddress1 = "0xeBa74571b3B7703580f908a6A9035EB930C4F37D";
  const exchangeMultiSigAddress2 = "0x6ca7304B0871F36Cd3cDF429b928a57a939d86A1";
  const uniswapV2RouterBaseAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  const uniswapV2RouterBaseSepoliaAddress = "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602";
  const liquidityETHProvisionMainnet = "1.004";
  const liquidityETHProvisionTestnet = "0.025";

  const isTestnet: Boolean = true;
  const uniswapRouterAddressFinal = isTestnet ? uniswapV2RouterBaseSepoliaAddress : uniswapV2RouterBaseAddress;
  const liquidityETHProvisionFinal = isTestnet ? liquidityETHProvisionTestnet : liquidityETHProvisionMainnet;

  // 1. Deploy contract
  const basedWhale = m.contract(
    "BasedWhale",
    [
      oneBillionCappedSupply, // cap
      initialOwnerAddress, // owner
      marketingMultiSigAddress, // marketingMultiSig
      exchangeMultiSigAddress1, // exchangeMultiSig1
      exchangeMultiSigAddress2, // exchangeMultiSig2
    ],
  );

  // 2. Initialize Uniswap liquidity
  m.call(
    basedWhale,
    "initializeUniswapLiquidity",
    [uniswapRouterAddressFinal],
    { value: ethers.parseEther(liquidityETHProvisionFinal) }
  );

  return { basedWhale };
});

export default BasedWhaleModule;
