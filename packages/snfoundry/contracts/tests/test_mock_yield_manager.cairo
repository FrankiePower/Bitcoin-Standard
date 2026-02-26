use contracts::interfaces::{IYieldManagerDispatcher, IYieldManagerDispatcherTrait};
use contracts::mock_wbtc::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
/// Tests for MockYieldManager contract
///
/// Test coverage:
/// - Deployment and initialization
/// - Vault-only deposit/withdraw restrictions
/// - Yield accrual calculations
/// - Fee distribution (70/30 split)
/// - Yield harvesting
/// - Admin configuration

use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp,
    start_cheat_caller_address, stop_cheat_block_timestamp, stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

// ============ Test Helpers ============

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn VAULT() -> ContractAddress {
    contract_address_const::<'VAULT'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn USER2() -> ContractAddress {
    contract_address_const::<'USER2'>()
}

fn TREASURY() -> ContractAddress {
    contract_address_const::<'TREASURY'>()
}

fn ZERO_ADDRESS() -> ContractAddress {
    contract_address_const::<0>()
}

/// 1 wBTC in satoshis (8 decimals)
const ONE_WBTC: u256 = 100000000; // 10^8

/// Seconds per year
const SECONDS_PER_YEAR: u256 = 31536000;

/// Default yield rate: 8% APY (800 basis points)
const DEFAULT_YIELD_RATE: u256 = 800;

/// Precision for calculations
const PRECISION: u256 = 10000;

fn deploy_yield_manager() -> (ContractAddress, IYieldManagerDispatcher, IERC20Dispatcher) {
    // Deploy MockWBTC first
    let wbtc_contract = declare("MockWBTC").unwrap().contract_class();
    let mut wbtc_calldata = array![];
    OWNER().serialize(ref wbtc_calldata);
    let (wbtc_address, _) = wbtc_contract.deploy(@wbtc_calldata).unwrap();
    let wbtc = IERC20Dispatcher { contract_address: wbtc_address };

    // Mint wBTC to vault for testing
    start_cheat_caller_address(wbtc_address, OWNER());
    let mock_wbtc = IMockWBTCDispatcher { contract_address: wbtc_address };
    mock_wbtc.mint(VAULT(), 100 * ONE_WBTC);
    stop_cheat_caller_address(wbtc_address);

    // Deploy MockYieldManager
    let contract = declare("MockYieldManager").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    VAULT().serialize(ref calldata);
    wbtc_address.serialize(ref calldata);
    TREASURY().serialize(ref calldata);
    let (contract_address, _) = contract.deploy(@calldata).unwrap();

    let yield_manager = IYieldManagerDispatcher { contract_address };

    (contract_address, yield_manager, wbtc)
}

/// Helper to approve and deposit from vault
fn approve_and_deposit_as_vault(
    ym_address: ContractAddress,
    yield_manager: IYieldManagerDispatcher,
    wbtc: IERC20Dispatcher,
    user: ContractAddress,
    amount: u256,
) {
    // Approve yield manager from vault
    start_cheat_caller_address(wbtc.contract_address, VAULT());
    wbtc.approve(ym_address, amount);
    stop_cheat_caller_address(wbtc.contract_address);

    // Deposit as vault
    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.deposit(user, amount);
    stop_cheat_caller_address(ym_address);
}

// ============ Deployment Tests ============

#[test]
fn test_deployment_with_defaults() {
    let (_, yield_manager, _) = deploy_yield_manager();

    assert(yield_manager.get_yield_rate() == DEFAULT_YIELD_RATE, 'Wrong default yield rate');

    let (user_share, protocol_share) = yield_manager.get_fee_config();
    assert(user_share == 7000, 'Wrong default user share');
    assert(protocol_share == 3000, 'Wrong default protocol share');

    assert(yield_manager.get_total_deposits() == 0, 'Should start with 0 deposits');
}

// ============ Deposit Tests ============

#[test]
fn test_vault_can_deposit() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    let deposit_amount = ONE_WBTC;
    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), deposit_amount);

    // Verify deposit tracked
    assert(yield_manager.get_user_deposit(USER1()) == deposit_amount, 'Wrong user deposit');
    assert(yield_manager.get_total_deposits() == deposit_amount, 'Wrong total deposits');

    // Verify wBTC transferred to yield manager
    assert(wbtc.balance_of(ym_address) == deposit_amount, 'wBTC not transferred');
}

#[test]
fn test_multiple_deposits_same_user() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), ONE_WBTC);
    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), 2 * ONE_WBTC);

    assert(yield_manager.get_user_deposit(USER1()) == 3 * ONE_WBTC, 'Wrong total deposit');
}

#[test]
fn test_multiple_users_deposits() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), ONE_WBTC);
    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER2(), 2 * ONE_WBTC);

    assert(yield_manager.get_user_deposit(USER1()) == ONE_WBTC, 'Wrong USER1 deposit');
    assert(yield_manager.get_user_deposit(USER2()) == 2 * ONE_WBTC, 'Wrong USER2 deposit');
    assert(yield_manager.get_total_deposits() == 3 * ONE_WBTC, 'Wrong total deposits');
}

#[test]
#[should_panic(expected: 'YieldMgr: caller is not vault')]
fn test_non_vault_cannot_deposit() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, USER1());
    yield_manager.deposit(USER1(), ONE_WBTC);
    stop_cheat_caller_address(ym_address);
}

#[test]
#[should_panic(expected: 'YieldMgr: zero amount')]
fn test_cannot_deposit_zero() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.deposit(USER1(), 0);
    stop_cheat_caller_address(ym_address);
}

#[test]
#[should_panic(expected: 'YieldMgr: zero address')]
fn test_cannot_deposit_to_zero_address() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.deposit(ZERO_ADDRESS(), ONE_WBTC);
    stop_cheat_caller_address(ym_address);
}

// ============ Withdrawal Tests ============

#[test]
fn test_vault_can_withdraw() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    // Deposit first
    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), 2 * ONE_WBTC);

    // Withdraw half
    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.withdraw(USER1(), ONE_WBTC);
    stop_cheat_caller_address(ym_address);

    assert(yield_manager.get_user_deposit(USER1()) == ONE_WBTC, 'Wrong remaining deposit');
    assert(yield_manager.get_total_deposits() == ONE_WBTC, 'Wrong total deposits');
    assert(wbtc.balance_of(ym_address) == ONE_WBTC, 'Wrong wBTC balance');
}

#[test]
#[should_panic(expected: 'YieldMgr: caller is not vault')]
fn test_non_vault_cannot_withdraw() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, USER1());
    yield_manager.withdraw(USER1(), ONE_WBTC);
    stop_cheat_caller_address(ym_address);
}

#[test]
#[should_panic(expected: 'YieldMgr: zero amount')]
fn test_cannot_withdraw_zero() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.withdraw(USER1(), 0);
    stop_cheat_caller_address(ym_address);
}

#[test]
#[should_panic(expected: 'YieldMgr: insufficient balance')]
fn test_cannot_withdraw_more_than_deposit() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), ONE_WBTC);

    start_cheat_caller_address(ym_address, VAULT());
    yield_manager.withdraw(USER1(), 2 * ONE_WBTC);
    stop_cheat_caller_address(ym_address);
}

// ============ Yield Accrual Tests ============

#[test]
fn test_yield_accrual_over_time() {
    let (ym_address, yield_manager, wbtc) = deploy_yield_manager();

    approve_and_deposit_as_vault(ym_address, yield_manager, wbtc, USER1(), ONE_WBTC);

    // Advance time by 1 year
    start_cheat_block_timestamp(ym_address, SECONDS_PER_YEAR.try_into().unwrap());

    // Harvest yield
    start_cheat_caller_address(ym_address, VAULT());
    let yield_amount = yield_manager.harvest_yield(USER1());
    stop_cheat_caller_address(ym_address);

    // Expected yield = 8% of 1 wBTC
    let expected_yield = ONE_WBTC * DEFAULT_YIELD_RATE / PRECISION;
    let expected_user = expected_yield * 7000 / PRECISION;

    assert(yield_amount == expected_user, 'Wrong yield amount');

    stop_cheat_block_timestamp(ym_address);
}

// ============ Admin Tests ============

#[test]
fn test_owner_can_set_yield_rate() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, OWNER());
    yield_manager.set_yield_rate(1200);
    stop_cheat_caller_address(ym_address);

    assert(yield_manager.get_yield_rate() == 1200, 'Yield rate not updated');
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_set_yield_rate() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, USER1());
    yield_manager.set_yield_rate(1200);
    stop_cheat_caller_address(ym_address);
}

#[test]
fn test_owner_can_set_fee_config() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, OWNER());
    yield_manager.set_fee_config(8000, 2000);
    stop_cheat_caller_address(ym_address);

    let (user_share, protocol_share) = yield_manager.get_fee_config();
    assert(user_share == 8000, 'User share not updated');
    assert(protocol_share == 2000, 'Protocol share not updated');
}

#[test]
#[should_panic(expected: 'YieldMgr: invalid fee config')]
fn test_invalid_fee_config_reverts() {
    let (ym_address, yield_manager, _) = deploy_yield_manager();

    start_cheat_caller_address(ym_address, OWNER());
    yield_manager.set_fee_config(6000, 3000); // Sum != 10000
    stop_cheat_caller_address(ym_address);
}
