// import { ethers } from "hardhat";
// import {
//   BasedWhale,
// } from "../typechain-types";

// task(
//   "set basedwhale to 'Liquidity Locked'",
//   "Sets the BasedWhale Token Contract to 'Liquidity Locked' state"
// )
// .addParam("contractAddress", "The contract address")
// .setAction(async (taskArgs: any) => {
//   const contractAddress: string = taskArgs.contractAddress;
//   const basedWhale = await ethers.getContractAt("BasedWhale", contractAddress) as BasedWhale;
//   const uniswapV2Router02: string = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"
//   await basedWhale.moveStateToLiquidityLocked(uniswapV2Router02);
// });