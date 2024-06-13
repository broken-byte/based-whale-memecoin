import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI: bigint = 1_000_000_000n;

const BasedWhaleModule = buildModule("BasedWhaleModule", (m) => {
  const oneBillionCappedSupply = BigInt(1_000_000_000);
  const marketingMultiSigAddress = "";
  const exchangeMultiSigAddress1 = "";
  const exchangeMultiSigAddress2 = "";

  const basedWhale = m.contract(
    "BasedWhale",
    [
      oneBillionCappedSupply, // cap
      marketingMultiSigAddress, // marketing
      exchangeMultiSigAddress1, // exchangeMultiSig1
      exchangeMultiSigAddress2, // exchangeMultiSig2
    ],
  );

  const uniswapV2RouterBaseAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

  m.call(basedWhale, "initializeUniswapLiquidity", [uniswapV2RouterBaseAddress]);

  return { basedWhale };
});

export default BasedWhaleModule;
