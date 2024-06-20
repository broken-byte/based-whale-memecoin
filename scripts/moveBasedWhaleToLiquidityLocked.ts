import { ethers } from "hardhat";
import {
  BasedWhale,
} from "../typechain-types";
async function main() {

  const contractAddress: string = "0x8367fCD4bf412eF69d851C1fc863278AdfA097c6";
  const basedWhale = await ethers.getContractAt("BasedWhale", contractAddress) as BasedWhale;
  const uniswapV2Router02: string = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"
  await basedWhale.moveStateToLiquidityLocked(uniswapV2Router02);
  const zeroAddress
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });