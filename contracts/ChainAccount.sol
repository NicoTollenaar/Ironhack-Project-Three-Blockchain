//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract ChainAccount is ERC20Burnable {

    address public bank;

    constructor() ERC20("ChainAccount-EUR", "EUR") {
        bank = msg.sender;
    }

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function moveFundsOnChain(address accountholder, uint amount) public {
        require(msg.sender == bank, "Only bank can transfer funds from off- to on-chain account");
        _mint(msg.sender, amount);
        transfer(accountholder, amount);
    }

    function moveFundsOffChain(uint amount) public {
        require(balanceOf(msg.sender) >= amount, "Retransfer amount greater than on chain balance");
        transfer(bank, amount);
    }

    function deleteInternalBalanceBank(uint amount) public {
        require(msg.sender == bank, "Only the bank can delete its own internal on-chain balance");
        require(balanceOf(bank) >= amount);
        _burn(bank, amount);
    }
}











