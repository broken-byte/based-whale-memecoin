// contracts/BasedWhale.sol
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract BasedWhale is ERC20Capped, Ownable {
  // States for the contract
  enum TokenState {
    Default,
    Launched,
    LiquidityLocked,
    TaxRatesSetToZero,
    OwnershipRenounced
  }

  TokenState public tokenState;
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
  event BuyTaxed(
    address buyerAddress,
    uint256 amountOfTokens,
    uint256 taxAmount,
    uint256 timestamp
  );
  event SellTaxed(
    address sellerAddress,
    uint256 amountOfTokens,
    uint256 taxAmount,
    uint256 timestamp
  );
  event LiquidityLocked(
    address liquidityPairAddress,
    uint256 amountOfTokens,
    uint256 amountOfETH,
    uint256 amountOfLiquidityTokensBurned,
    uint256 timestamp
  );
  event OwnershipRenounced(address renouncerAddress, address nullAddressOwner, uint256 timestamp);

  modifier inState(TokenState state) {
    require(tokenState == state, "Function cannot be called in this state");
    _;
  }

  constructor(
    uint cap_,
    address _ownerMultiSig,
    address _marketingMultiSig,
    address _exchangeMultiSig1,
    address _exchangeMultiSig2
  )
    ERC20(TOKEN_NAME, TOKEN_TICKER_SYMBOL)
    ERC20Capped(cap_ * 10 ** uint256(decimals()))
    Ownable(_ownerMultiSig)
  {
    marketingMultiSig = _marketingMultiSig;
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
  ) external payable onlyOwner inState(TokenState.Launched) {
    uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
    uniswapV2PairAddress = IUniswapV2Factory(uniswapV2Router.factory()).createPair(
      address(this),
      uniswapV2Router.WETH()
    );

    // provision and approve 85% for liquidity pool
    uint256 liquidityPoolAllocation = (cap() * 85) / 100;
    _mint(address(this), liquidityPoolAllocation);
    _approve(address(this), _uniswapV2Router, liquidityPoolAllocation);

    uint256 liquidityTimeStamp = block.timestamp;
    // Add liquidity to the pool, burn the tokens and lock the liquidity.
    (uint amountToken, uint amountETH, ) = uniswapV2Router.addLiquidityETH{value: msg.value}(
      address(this), // BasedWhale Token Address
      liquidityPoolAllocation, // amountTokenDesired
      0, // amountTokenMin
      0, // amountETHMin
      BURN_ADDRESS, // Recipient of the liquidity tokens
      liquidityTimeStamp // deadline for this liquidity provision
    );

    IUniswapV2Pair uniswapV2Pair = IUniswapV2Pair(uniswapV2PairAddress);
    emit LiquidityLocked(
      uniswapV2PairAddress,
      amountToken,
      amountETH,
      uniswapV2Pair.balanceOf(BURN_ADDRESS),
      liquidityTimeStamp
    );

    tokenState = TokenState.LiquidityLocked;
  }

  function setTaxRatesToZero() external onlyOwner inState(TokenState.LiquidityLocked) {
    buyTaxRate = 0;
    sellTaxRate = 0;

    emit TaxRatesSetToZero(buyTaxRate, sellTaxRate, block.timestamp);

    tokenState = TokenState.TaxRatesSetToZero;
  }

  function renounceOwnership()
    public
    virtual
    override
    onlyOwner
    inState(TokenState.TaxRatesSetToZero)
  {
    emit OwnershipRenounced(msg.sender, owner(), block.timestamp);
    tokenState = TokenState.OwnershipRenounced;
    super.renounceOwnership();
  }

  // To receive ETH from uniswapV2Router when swapping
  receive() external payable {}

  // Override the _beforeTokenTransfer function to add a temporary tax on buys and sells.
  function _update(address from, address to, uint256 value) internal override {
    // No liquidity pool/no tax rates == no taxes.
    if (tokenState != TokenState.LiquidityLocked || tokenState == TokenState.TaxRatesSetToZero) {
      super._update(from, to, value);
      return;
    }

    uint256 taxAmount = 0;
    if (to == uniswapV2PairAddress) {
      // Selling tokens
      taxAmount = (value * sellTaxRate) / 1000;
      emit SellTaxed(from, value, taxAmount, block.timestamp);
    } else if (from == uniswapV2PairAddress) {
      // Buying tokens
      taxAmount = (value * buyTaxRate) / 1000;
      emit BuyTaxed(to, value, taxAmount, block.timestamp);
    }

    if (taxAmount > 0) {
      super._update(from, marketingMultiSig, taxAmount);
      value = value - taxAmount;
    }

    super._update(from, to, value);
  }
}
