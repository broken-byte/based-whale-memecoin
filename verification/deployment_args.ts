const oneBillionCappedSupply = BigInt(1_000_000_000);
const initialOwnerAddress = "0x566bD9Df983BfEFf836A2C3b644553e6A80850Fa" // BrokenByte Engineering Deployer;
const marketingMultiSigAddress = "0x65D23D5956b2F7E519df94dffA21ff3b078e7FE0";
const exchangeMultiSigAddress1 = "0xeBa74571b3B7703580f908a6A9035EB930C4F37D";
const exchangeMultiSigAddress2 = "0x6ca7304B0871F36Cd3cDF429b928a57a939d86A1";
const uniswapV2RouterBaseAddress = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
const liquidityETHProvisionMainnet = "1.004";

const deploymentArgs = [
  oneBillionCappedSupply,
  initialOwnerAddress,
  marketingMultiSigAddress,
  exchangeMultiSigAddress1,
  exchangeMultiSigAddress2,
  uniswapV2RouterBaseAddress,
  liquidityETHProvisionMainnet,
];

export default deploymentArgs;