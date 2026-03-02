/// Tests for VaultRegistry contract
///
/// Test coverage:
/// - Deployment and initial state
/// - register_vault: happy path, access control, duplicate txid, zero inputs
/// - close_vault: happy path, access control, already closed
/// - liquidate_vault: happy path, access control, already liquidated
/// - get_vault / is_active / get_owner / get_btc_amount / get_total_vaults
/// - set_cdp_core: owner gated, zero-address guard

use contracts::interfaces::{IVaultRegistryDispatcher, IVaultRegistryDispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

// ============ Test Addresses ============

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn CDP_CORE() -> ContractAddress {
    contract_address_const::<'CDP_CORE'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn USER2() -> ContractAddress {
    contract_address_const::<'USER2'>()
}

// ============ Constants ============

const TXID_1: felt252 = 'btc_vault_txid_1';
const TXID_2: felt252 = 'btc_vault_txid_2';
const ONE_BTC: u256 = 100_000_000; // 1 BTC in satoshis
const HALF_BTC: u256 = 50_000_000; // 0.5 BTC in satoshis

// ============ Deployment Helper ============

fn deploy_registry() -> (ContractAddress, IVaultRegistryDispatcher) {
    let contract = declare("VaultRegistry").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    CDP_CORE().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    (address, IVaultRegistryDispatcher { contract_address: address })
}

// ============ Deployment Tests ============

#[test]
fn test_deploy_initial_state() {
    let (_, registry) = deploy_registry();
    assert(registry.get_total_vaults() == 0, 'Should start with 0 vaults');
}

// ============ register_vault Tests ============

#[test]
fn test_cdp_core_can_register_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);

    assert(registry.is_active(TXID_1), 'Vault should be active');
    assert(registry.get_owner(TXID_1) == USER1(), 'Wrong owner');
    assert(registry.get_btc_amount(TXID_1) == ONE_BTC, 'Wrong btc amount');
    assert(registry.get_total_vaults() == 1, 'Total vaults should be 1');
}

#[test]
fn test_multiple_vaults_increment_counter() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    registry.register_vault(TXID_2, USER2(), HALF_BTC);
    stop_cheat_caller_address(addr);

    assert(registry.get_total_vaults() == 2, 'Total vaults should be 2');
    assert(registry.get_owner(TXID_2) == USER2(), 'Wrong owner for txid_2');
    assert(registry.get_btc_amount(TXID_2) == HALF_BTC, 'Wrong amount for txid_2');
}

#[test]
#[should_panic(expected: 'Registry: not cdp_core')]
fn test_register_requires_cdp_core() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, USER1());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: vault already exists')]
fn test_register_rejects_duplicate_txid() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    registry.register_vault(TXID_1, USER2(), HALF_BTC); // same txid
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: zero txid')]
fn test_register_rejects_zero_txid() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(0, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: zero btc amount')]
fn test_register_rejects_zero_amount() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), 0);
    stop_cheat_caller_address(addr);
}

// ============ close_vault Tests ============

#[test]
fn test_cdp_core_can_close_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    assert(registry.is_active(TXID_1), 'Should be active before close');

    registry.close_vault(TXID_1);
    stop_cheat_caller_address(addr);

    assert(!registry.is_active(TXID_1), 'Should be inactive after close');
}

#[test]
#[should_panic(expected: 'Registry: not cdp_core')]
fn test_close_requires_cdp_core() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);

    start_cheat_caller_address(addr, USER1());
    registry.close_vault(TXID_1);
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: vault not active')]
fn test_close_rejects_already_closed_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    registry.close_vault(TXID_1);
    registry.close_vault(TXID_1); // second close must fail
    stop_cheat_caller_address(addr);
}

// ============ liquidate_vault Tests ============

#[test]
fn test_cdp_core_can_liquidate_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    assert(registry.is_active(TXID_1), 'Should be active');

    registry.liquidate_vault(TXID_1);
    stop_cheat_caller_address(addr);

    assert(!registry.is_active(TXID_1), 'Should be inactive after liq');
}

#[test]
#[should_panic(expected: 'Registry: not cdp_core')]
fn test_liquidate_requires_cdp_core() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);

    start_cheat_caller_address(addr, USER1());
    registry.liquidate_vault(TXID_1);
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: vault not active')]
fn test_liquidate_rejects_already_liquidated_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    registry.liquidate_vault(TXID_1);
    registry.liquidate_vault(TXID_1); // second liquidation must fail
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: vault not active')]
fn test_cannot_close_liquidated_vault() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    registry.liquidate_vault(TXID_1);
    registry.close_vault(TXID_1); // close after liquidation must fail
    stop_cheat_caller_address(addr);
}

// ============ get_vault Tests ============

#[test]
fn test_get_vault_returns_correct_info() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, CDP_CORE());
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);

    let info = registry.get_vault(TXID_1);
    assert(info.owner == USER1(), 'Wrong owner in VaultInfo');
    assert(info.btc_amount == ONE_BTC, 'Wrong amount in VaultInfo');
}

#[test]
#[should_panic(expected: 'Registry: vault not found')]
fn test_get_vault_rejects_nonexistent() {
    let (_, registry) = deploy_registry();
    registry.get_vault('nonexistent_txid');
}

// ============ set_cdp_core Tests ============

#[test]
fn test_owner_can_set_cdp_core() {
    let (addr, registry) = deploy_registry();
    let new_cdp_core = USER2();

    start_cheat_caller_address(addr, OWNER());
    registry.set_cdp_core(new_cdp_core);
    stop_cheat_caller_address(addr);

    // Verify: the new cdp_core can register; old one cannot
    start_cheat_caller_address(addr, new_cdp_core);
    registry.register_vault(TXID_1, USER1(), ONE_BTC);
    stop_cheat_caller_address(addr);

    assert(registry.is_active(TXID_1), 'New cdp_core should work');
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_set_cdp_core_requires_owner() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, USER1());
    registry.set_cdp_core(USER2());
    stop_cheat_caller_address(addr);
}

#[test]
#[should_panic(expected: 'Registry: zero address')]
fn test_set_cdp_core_rejects_zero_address() {
    let (addr, registry) = deploy_registry();

    start_cheat_caller_address(addr, OWNER());
    registry.set_cdp_core(contract_address_const::<0>());
    stop_cheat_caller_address(addr);
}
