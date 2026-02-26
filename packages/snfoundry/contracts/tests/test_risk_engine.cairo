use contracts::interfaces::{
    IBTSUSDTokenDispatcher, IBTSUSDTokenDispatcherTrait, IBTSUSDVaultDispatcher,
    IBTSUSDVaultDispatcherTrait, IMockOracleDispatcher, IMockOracleDispatcherTrait,
    IYieldManagerDispatcher, IYieldManagerDispatcherTrait,
};
use contracts::mock_wbtc::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
/// Tests for Risk Engine + Dual Oracle in BTSUSDVault

use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn TREASURY() -> ContractAddress {
    contract_address_const::<'TREASURY'>()
}

/// 1 wBTC in satoshis (8 decimals)
const ONE_WBTC: u256 = 100000000;

/// 1 BTSUSD (18 decimals)
const ONE_BTSUSD: u256 = 1000000000000000000;

fn deploy_system() -> (
    ContractAddress,
    IBTSUSDVaultDispatcher,
    IERC20Dispatcher,
    IMockOracleDispatcher,
    IMockOracleDispatcher,
) {
    // MockWBTC
    let wbtc_contract = declare("MockWBTC").unwrap().contract_class();
    let mut wbtc_calldata = array![];
    OWNER().serialize(ref wbtc_calldata);
    let (wbtc_address, _) = wbtc_contract.deploy(@wbtc_calldata).unwrap();
    let wbtc = IERC20Dispatcher { contract_address: wbtc_address };

    // MockOracle primary
    let oracle_contract = declare("MockOracle").unwrap().contract_class();
    let mut oracle_calldata = array![];
    OWNER().serialize(ref oracle_calldata);
    let (oracle_address, _) = oracle_contract.deploy(@oracle_calldata).unwrap();
    let oracle = IMockOracleDispatcher { contract_address: oracle_address };

    // MockOracle secondary
    let mut oracle2_calldata = array![];
    OWNER().serialize(ref oracle2_calldata);
    let (oracle2_address, _) = oracle_contract.deploy(@oracle2_calldata).unwrap();
    let oracle2 = IMockOracleDispatcher { contract_address: oracle2_address };

    // BTSUSDToken (temporary vault)
    let token_contract = declare("BTSUSDToken").unwrap().contract_class();
    let mut token_calldata = array![];
    OWNER().serialize(ref token_calldata);
    OWNER().serialize(ref token_calldata);
    let (token_address, _) = token_contract.deploy(@token_calldata).unwrap();
    let token = IBTSUSDTokenDispatcher { contract_address: token_address };

    // MockYieldManager (temporary vault)
    let ym_contract = declare("MockYieldManager").unwrap().contract_class();
    let mut ym_calldata = array![];
    OWNER().serialize(ref ym_calldata);
    OWNER().serialize(ref ym_calldata);
    wbtc_address.serialize(ref ym_calldata);
    TREASURY().serialize(ref ym_calldata);
    let (ym_address, _) = ym_contract.deploy(@ym_calldata).unwrap();
    let yield_manager = IYieldManagerDispatcher { contract_address: ym_address };

    // BTSUSDVault
    let vault_contract = declare("BTSUSDVault").unwrap().contract_class();
    let mut vault_calldata = array![];
    OWNER().serialize(ref vault_calldata);
    wbtc_address.serialize(ref vault_calldata);
    token_address.serialize(ref vault_calldata);
    oracle_address.serialize(ref vault_calldata);
    oracle2_address.serialize(ref vault_calldata);
    ym_address.serialize(ref vault_calldata);
    let (vault_address, _) = vault_contract.deploy(@vault_calldata).unwrap();
    let vault = IBTSUSDVaultDispatcher { contract_address: vault_address };

    // Wire vault addresses
    start_cheat_caller_address(token_address, OWNER());
    token.set_vault(vault_address);
    stop_cheat_caller_address(token_address);

    start_cheat_caller_address(ym_address, OWNER());
    yield_manager.set_vault(vault_address);
    stop_cheat_caller_address(ym_address);

    // Mint wBTC to user
    start_cheat_caller_address(wbtc_address, OWNER());
    let mock_wbtc = IMockWBTCDispatcher { contract_address: wbtc_address };
    mock_wbtc.mint(USER1(), 10 * ONE_WBTC);
    stop_cheat_caller_address(wbtc_address);

    (vault_address, vault, wbtc, oracle, oracle2)
}

fn approve_and_deposit(
    vault_address: ContractAddress,
    vault: IBTSUSDVaultDispatcher,
    wbtc: IERC20Dispatcher,
    user: ContractAddress,
    amount: u256,
) {
    start_cheat_caller_address(wbtc.contract_address, user);
    wbtc.approve(vault_address, amount);
    stop_cheat_caller_address(wbtc.contract_address);

    start_cheat_caller_address(vault_address, user);
    vault.deposit_collateral(amount);
    stop_cheat_caller_address(vault_address);
}

#[test]
#[should_panic(expected: 'Vault: oracle deviation')]
fn test_oracle_deviation_blocks_minting() {
    let (vault_address, vault, wbtc, oracle, oracle2) = deploy_system();

    // Set divergent prices (>5% deviation)
    start_cheat_caller_address(oracle.contract_address, OWNER());
    oracle.set_btc_price(6500000000000); // $65k
    stop_cheat_caller_address(oracle.contract_address);

    start_cheat_caller_address(oracle2.contract_address, OWNER());
    oracle2.set_btc_price(5000000000000); // $50k
    stop_cheat_caller_address(oracle2.contract_address);

    approve_and_deposit(vault_address, vault, wbtc, USER1(), ONE_WBTC);

    start_cheat_caller_address(vault_address, USER1());
    vault.mint_BTSUSD(1000 * ONE_BTSUSD);
    stop_cheat_caller_address(vault_address);
}

#[test]
#[should_panic(expected: 'Vault: exceeds max LTV')]
fn test_volatility_reduces_max_ltv() {
    let (vault_address, vault, wbtc, oracle, oracle2) = deploy_system();

    // Set initial price to $65k (both oracles)
    start_cheat_caller_address(oracle.contract_address, OWNER());
    oracle.set_btc_price(6500000000000);
    stop_cheat_caller_address(oracle.contract_address);

    start_cheat_caller_address(oracle2.contract_address, OWNER());
    oracle2.set_btc_price(6500000000000);
    stop_cheat_caller_address(oracle2.contract_address);

    approve_and_deposit(vault_address, vault, wbtc, USER1(), ONE_WBTC);

    // Mint a small amount to set last_price
    start_cheat_caller_address(vault_address, USER1());
    vault.mint_BTSUSD(10000 * ONE_BTSUSD);
    stop_cheat_caller_address(vault_address);

    // Drop price to $50k and tighten LTV
    start_cheat_caller_address(oracle.contract_address, OWNER());
    oracle.set_btc_price(5000000000000);
    stop_cheat_caller_address(oracle.contract_address);

    start_cheat_caller_address(oracle2.contract_address, OWNER());
    oracle2.set_btc_price(5000000000000);
    stop_cheat_caller_address(oracle2.contract_address);

    start_cheat_caller_address(vault_address, OWNER());
    vault.set_risk_params(6667, 500, 3000); // base 66.67%, penalty 30%
    stop_cheat_caller_address(vault_address);

    // This should exceed new max LTV
    start_cheat_caller_address(vault_address, USER1());
    vault.mint_BTSUSD(10000 * ONE_BTSUSD);
    stop_cheat_caller_address(vault_address);
}
