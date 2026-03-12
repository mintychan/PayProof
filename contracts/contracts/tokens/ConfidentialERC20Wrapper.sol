// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ERC7984} from "../../lib/confidential/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "../../lib/confidential/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ConfidentialERC20Wrapper
/// @notice Generic confidential wrapper for any ERC-20 token, deployed by ConfidentialTokenFactory.
///         Wraps an arbitrary ERC-20 into an ERC7984 confidential token. The conversion rate is
///         determined automatically by ERC7984ERC20Wrapper based on the underlying token's decimals.
/// @dev Minimal contract — only provides the constructor. All wrapping/unwrapping logic is inherited
///      from ERC7984ERC20Wrapper (wrap, unwrap, onTransferReceived).
contract ConfidentialERC20Wrapper is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    /// @param erc20Token The address of the ERC-20 token to wrap.
    /// @param name_ The name for the confidential wrapper token (e.g., "Confidential DAI").
    /// @param symbol_ The symbol for the confidential wrapper token (e.g., "cDAI").
    /// @param contractURI_ The ERC-7984 contract metadata URI.
    constructor(
        address erc20Token,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    )
        ERC7984(name_, symbol_, contractURI_)
        ERC7984ERC20Wrapper(IERC20(erc20Token))
    {}
}
