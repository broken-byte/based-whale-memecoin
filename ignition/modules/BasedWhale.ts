import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const BasedWhaleModule = buildModule("BasedWhale", (m) => {
  const oneBillionCappedSupply = BigInt(1_000_000_000);
  const initialOwnerAddress = "0x55B554EFaDdB6a229A3785cc535779E54be5308c" // BrokenByte;
  const marketingMultiSigAddress = "0x65D23D5956b2F7E519df94dffA21ff3b078e7FE0";
  const exchangeMultiSigAddress1 = "0xeBa74571b3B7703580f908a6A9035EB930C4F37D";
  const exchangeMultiSigAddress2 = "0x6ca7304B0871F36Cd3cDF429b928a57a939d86A1";
  const uniswapV2RouterBaseAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

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
    [uniswapV2RouterBaseAddress],
    { value: ethers.parseEther("1.004") }
  );

  return { basedWhale };
});

export default BasedWhaleModule;
