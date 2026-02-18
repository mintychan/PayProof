// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConfidentialERC20Wrapper} from "./ConfidentialERC20Wrapper.sol";

/// @title ConfidentialTokenFactory
/// @notice Factory contract that deploys ERC-7984 confidential wrappers for arbitrary ERC-20 tokens.
///         Each ERC-20 can have at most one wrapper deployed through this factory.
/// @dev Deployed wrappers are instances of ConfidentialERC20Wrapper which inherits SepoliaConfig,
///      ERC7984, and ERC7984ERC20Wrapper.
contract ConfidentialTokenFactory {
    /// @notice Emitted when a new confidential wrapper is deployed for an ERC-20 token.
    /// @param erc20 The address of the underlying ERC-20 token.
    /// @param wrapper The address of the newly deployed confidential wrapper.
    /// @param name The name of the wrapper token.
    /// @param symbol The symbol of the wrapper token.
    event WrapperDeployed(address indexed erc20, address indexed wrapper, string name, string symbol);

    /// @dev Thrown when attempting to deploy a wrapper for an ERC-20 that already has one.
    error WrapperAlreadyExists(address erc20, address existingWrapper);

    /// @dev Thrown when the zero address is provided as the ERC-20 token.
    error InvalidERC20Address();

    /// @notice Mapping from ERC-20 token address to its confidential wrapper address.
    mapping(address => address) private _wrappers;

    /// @notice Array of all deployed wrapper addresses for enumeration.
    address[] private _allWrappers;

    /// @notice Deploys a new ERC-7984 confidential wrapper for the given ERC-20 token.
    /// @dev Reverts if a wrapper already exists for the given ERC-20 or if the token address is zero.
    /// @param erc20Token The address of the ERC-20 token to wrap.
    /// @param name The name for the confidential wrapper token.
    /// @param symbol The symbol for the confidential wrapper token.
    /// @param uri The ERC-7984 contract metadata URI.
    /// @return wrapper The address of the newly deployed confidential wrapper.
    function deployWrapper(
        address erc20Token,
        string calldata name,
        string calldata symbol,
        string calldata uri
    ) external returns (address wrapper) {
        if (erc20Token == address(0)) revert InvalidERC20Address();
        if (_wrappers[erc20Token] != address(0)) {
            revert WrapperAlreadyExists(erc20Token, _wrappers[erc20Token]);
        }

        ConfidentialERC20Wrapper deployed = new ConfidentialERC20Wrapper(
            erc20Token,
            name,
            symbol,
            uri
        );

        wrapper = address(deployed);
        _wrappers[erc20Token] = wrapper;
        _allWrappers.push(wrapper);

        emit WrapperDeployed(erc20Token, wrapper, name, symbol);
    }

    /// @notice Returns the confidential wrapper address for the given ERC-20 token.
    /// @param erc20 The address of the ERC-20 token.
    /// @return The address of the wrapper, or address(0) if none exists.
    function getWrapper(address erc20) external view returns (address) {
        return _wrappers[erc20];
    }

    /// @notice Returns all deployed wrapper addresses.
    /// @return An array of all wrapper contract addresses.
    function getAllWrappers() external view returns (address[] memory) {
        return _allWrappers;
    }
}
