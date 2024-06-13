// contracts/BasedWhale.sol
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract BasedWhale is ERC20Capped {
  // States for the contract
  enum TokenState {
    Launched,
    LiquidityLocked,
    TaxRatesSetToZero,
    OwnershipRenounced
  }

  TokenState public tokenState;
  address public owner;
  address public marketingMultiSig;
  address public exchangeMultiSig1;
  address public exchangeMultiSig2;
  // Represents 10% and 30% since Solidity does not support decimals.
  // Buy tax rate is 10% and sell tax rate is 30% at launch to prevent bots from pumping -> dumping.
  uint256 public buyTaxRate = 100;
  uint256 public sellTaxRate = 300;
  address public uniswapV2PairAddress;

  IUniswapV2Router02 public uniswapV2Router;

  string public constant TOKEN_NAME = "Based Whale";
  string public constant TOKEN_TICKER_SYMBOL = "WHALE";
  address public constant BURN_ADDRESS = 0x0000000000000000000000000000000000000000;

  event Launched(address launcherAddress, uint256 timestamp);
  event TaxRatesSetToZero(uint256 zeroedBuyTaxRate, uint256 zeroedSellTaxRate, uint256 timestamp);
  event LiquidityLocked(
    address liquidityPool,
    uint256 amountOfTokens,
    uint256 amountOfETH,
    uint256 amountOfLiquidityTokensBurned,
    uint256 timestamp
  );
  event OwnershipRenounced(address renouncerAddress, address nullAddressOwner, uint256 timestamp);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only the owner can call this function");
    _;
  }

  modifier inState(TokenState state) {
    require(tokenState == state, "Function cannot be called in this state");
    _;
  }

  constructor(
    uint cap_,
    address _marketing,
    address _exchangeMultiSig1,
    address _exchangeMultiSig2
  ) payable ERC20(TOKEN_NAME, TOKEN_TICKER_SYMBOL) ERC20Capped(cap_ * 10 ** uint256(decimals())) {
    owner = msg.sender;
    marketingMultiSig = _marketing;
    exchangeMultiSig1 = _exchangeMultiSig1;
    exchangeMultiSig2 = _exchangeMultiSig2;

    // Allocate 5% to marketing
    _mint(marketingMultiSig, (cap() * 5) / 100);

    // Allocate 5% to exchangeMultiSig1
    _mint(exchangeMultiSig1, (cap() * 5) / 100);

    // Allocate 5% to exchangeMultiSig2
    _mint(exchangeMultiSig2, (cap() * 5) / 100);

    emit Launched(msg.sender, block.timestamp);
    tokenState = TokenState.Launched;
  }

  function initializeUniswapLiquidity(
    address _uniswapV2Router
  ) external onlyOwner inState(TokenState.Launched) {
    uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
    uniswapV2PairAddress = IUniswapV2Factory(uniswapV2Router.factory()).createPair(
      address(this),
      uniswapV2Router.WETH()
    );

    // provision and approve 85% for liquidity pool
    uint256 liquidityPoolAllocation = (cap() * 85) / 100;
    _mint(address(this), liquidityPoolAllocation);
    _approve(address(this), _uniswapV2Router, liquidityPoolAllocation);

    // Add liquidity to the pool
    (uint amountToken, uint amountETH, uint amountOfLiquidityTokensBurned) = uniswapV2Router
      .addLiquidityETH{value: 1 ether}(
      address(this), // BasedWhale Token Address
      liquidityPoolAllocation, // amountTokenDesired
      0, // amountTokenMin
      0, // amountETHMin
      BURN_ADDRESS, // Recipient of the liquidity tokens
      block.timestamp // deadline for this liquidity provision
    );

    emit LiquidityLocked(
      uniswapV2PairAddress,
      amountToken,
      amountETH,
      amountOfLiquidityTokensBurned,
      block.timestamp
    );

    tokenState = TokenState.LiquidityLocked;
  }

  function setTaxRatesToZero() external onlyOwner inState(TokenState.LiquidityLocked) {
    buyTaxRate = 0;
    sellTaxRate = 0;
    tokenState = TokenState.TaxRatesSetToZero;
  }

  function renounceOwnership() external onlyOwner inState(TokenState.TaxRatesSetToZero) {
    owner = BURN_ADDRESS;
    emit OwnershipRenounced(msg.sender, owner, block.timestamp);
    tokenState = TokenState.OwnershipRenounced;
  }

  // To receive ETH from uniswapV2Router when swapping
  receive() external payable {}

  // Override the _beforeTokenTransfer function to add a temporary tax on buys and sells.
  function _update(address from, address to, uint256 value) internal override {
    // No liquidity pool, no taxes.
    if (tokenState != TokenState.LiquidityLocked) {
      super._update(from, to, value);
      return;
    }

    uint256 taxAmount = 0;
    if (to == uniswapV2PairAddress) {
      // Selling tokens
      taxAmount = (value * sellTaxRate) / 100;
    } else if (from == uniswapV2PairAddress) {
      // Buying tokens
      taxAmount = (value * buyTaxRate) / 100;
    }

    if (taxAmount > 0) {
      super._update(from, marketingMultiSig, taxAmount);
      value = value - taxAmount;
    }

    super._update(from, to, value);
  }
}
