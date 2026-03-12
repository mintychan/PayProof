// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ERC7984} from "../../lib/confidential/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "../../lib/confidential/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

interface IWETH9 is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/// @title ConfidentialETH
/// @notice Confidential wrapper around canonical WETH that mints ERC7984 tokens (cETH) backed 1:1 by ETH.
///         Employers can wrap ETH or WETH into confidential balances, which EncryptedPayroll consumes for funding
///         and settles back to recipients without revealing the nominal amounts on-chain.
contract ConfidentialETH is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    using SafeCast for uint256;

    IWETH9 public immutable weth;

    event NativeWrapped(address indexed payer, address indexed recipient, uint256 depositedWei, uint256 mintedUnits);

    error InvalidNativeAmount();

    /// @param wethAddress The address of the canonical WETH9 contract.
    /// @param contractURI The ERC-7984 contract metadata URI.
    constructor(address wethAddress, string memory contractURI)
        ERC7984("Confidential ETH", "cETH", contractURI)
        ERC7984ERC20Wrapper(IERC20(wethAddress))
    {
        weth = IWETH9(wethAddress);
    }

    /// @notice Accepts native ETH, converts it to WETH, and mints confidential ETH to `to`.
    /// @dev Amount must be a multiple of the wrapper `rate()` (1e12 wei when WETH has 18 decimals).
    ///      Any remainder below `rate()` is refunded to the sender.
    /// @param to The recipient address for the minted confidential ETH.
    /// @return minted The encrypted amount of cETH minted.
    function wrapNative(address to) external payable returns (euint64 minted) {
        if (to == address(0) || msg.value == 0) revert InvalidNativeAmount();

        uint256 usable = msg.value - (msg.value % rate());
        if (usable == 0) revert InvalidNativeAmount();

        // Convert ETH -> WETH and keep the liquidity in the wrapper treasury.
        weth.deposit{value: usable}();

        uint256 mintedUnits = usable / rate();
        if (mintedUnits > type(uint64).max) revert InvalidNativeAmount();

        minted = _mint(to, FHE.asEuint64(mintedUnits.toUint64()));

        uint256 refund = msg.value - usable;
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Native refund failed");
        }

        emit NativeWrapped(msg.sender, to, usable, mintedUnits);
    }

    /// @notice Allow receiving ETH from the canonical WETH contract.
    receive() external payable {}
}
