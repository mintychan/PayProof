// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ERC7984} from "../../lib/confidential/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "../../lib/confidential/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ConfidentialUSDC
/// @notice Confidential wrapper around ERC-20 USDC that mints ERC7984 tokens (cUSDC) backed 1:1 by USDC.
///         USDC has 6 decimals which matches the ERC7984 default max decimals, so the conversion rate is 1:1.
///         Users wrap USDC via the inherited `wrap(address to, uint256 amount)` function and unwrap via `unwrap()`.
/// @dev Inherits ERC7984ERC20Wrapper which provides `wrap()`, `unwrap()`, and ERC-1363 `onTransferReceived()`.
///      Unlike ConfidentialETH, there is no native-currency wrapping since USDC is ERC-20 only.
contract ConfidentialUSDC is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    /// @notice Emitted when USDC is wrapped into confidential tokens.
    event USDCWrapped(address indexed from, address indexed to, uint256 amount);

    /// @param usdcAddress The address of the ERC-20 USDC token on Sepolia.
    /// @param contractURI The ERC-7984 contract metadata URI.
    constructor(address usdcAddress, string memory contractURI)
        ERC7984("Confidential USDC", "cUSDC", contractURI)
        ERC7984ERC20Wrapper(IERC20(usdcAddress))
    {}

    /// @notice Wraps `amount` of USDC into confidential cUSDC tokens and sends them to `to`.
    /// @dev Overrides the inherited `wrap()` to emit a domain-specific event.
    ///      Caller must have approved this contract to spend at least `amount` USDC.
    /// @param to The recipient of the minted confidential tokens.
    /// @param amount The amount of USDC to wrap (in 6-decimal units).
    function wrap(address to, uint256 amount) public override {
        super.wrap(to, amount);
        emit USDCWrapped(msg.sender, to, amount);
    }
}
