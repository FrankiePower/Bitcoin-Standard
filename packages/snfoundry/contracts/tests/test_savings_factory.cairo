/// Tests for BTSSavingsFactory contract
///
/// Test coverage:
/// - Deployment and initialization
/// - Vault registration
/// - Vault deactivation
/// - Query functions (get_all_vaults, get_vault_for_asset, etc.)
/// - Access control

use contracts::mock_wbtc::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::savings::interfaces::{
    IBTSSavingsFactoryDispatcher, IBTSSavingsFactoryDispatcherTrait, IBTSSavingsVaultDispatcher,
    IBTSSavingsVaultDispatcherTrait, VaultInfo,
};
use core::num::traits::Zero;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp_global,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

// ============ Constants ============

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn ZERO_ADDRESS() -> ContractAddress {
    contract_address_const::<0>()
}

/// RAY = 1e27
const RAY: u256 = 1000000000000000000000000000;

/// ~4% APY VSR
const VSR_4_PERCENT: u256 = 1000000001243680656318820312;

/// Initial timestamp
const INITIAL_TIMESTAMP: u64 = 1000000;

// ============ Test Helpers ============

/// Deploy BTSSavingsFactory
fn deploy_factory(owner: ContractAddress) -> (ContractAddress, IBTSSavingsFactoryDispatcher) {
    let contract = declare("BTSSavingsFactory").unwrap().contract_class();
    let mut calldata = array![];
    owner.serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    (address, IBTSSavingsFactoryDispatcher { contract_address: address })
}

/// Deploy MockWBTC as underlying asset
fn deploy_mock_asset(name: felt252) -> ContractAddress {
    let contract = declare("MockWBTC").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    address
}

/// Deploy BTSSavingsVault
fn deploy_vault(
    owner: ContractAddress, asset: ContractAddress, name: ByteArray, symbol: ByteArray,
) -> (ContractAddress, IBTSSavingsVaultDispatcher) {
    let contract = declare("BTSSavingsVault").unwrap().contract_class();
    let mut calldata = array![];
    owner.serialize(ref calldata);
    asset.serialize(ref calldata);
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    VSR_4_PERCENT.serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    (address, IBTSSavingsVaultDispatcher { contract_address: address })
}

/// Deploy full system with factory and one vault
fn deploy_system() -> (
    ContractAddress, // factory address
    IBTSSavingsFactoryDispatcher, // factory dispatcher
    ContractAddress, // asset address
    ContractAddress, // vault address
    IBTSSavingsVaultDispatcher // vault dispatcher
) {
    start_cheat_block_timestamp_global(INITIAL_TIMESTAMP);

    let (factory_addr, factory) = deploy_factory(OWNER());
    let asset_addr = deploy_mock_asset('WBTC');
    let (vault_addr, vault) = deploy_vault(OWNER(), asset_addr, "Savings WBTC", "sWBTC");

    (factory_addr, factory, asset_addr, vault_addr, vault)
}

// ============ Deployment Tests ============

#[test]
fn test_factory_deployment() {
    let (_, factory, _, _, _) = deploy_system();

    assert(factory.get_vault_count() == 0, 'Should start with 0 vaults');

    let vaults = factory.get_all_vaults();
    assert(vaults.len() == 0, 'Should have empty vault list');
}

#[test]
#[should_panic(expected: 'Factory: zero address')]
fn test_cannot_deploy_with_zero_owner() {
    deploy_factory(ZERO_ADDRESS());
}

// ============ Vault Registration Tests ============

#[test]
fn test_register_vault() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    // Register vault
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, asset_addr);
    stop_cheat_caller_address(factory_addr);

    // Verify registration
    assert(factory.get_vault_count() == 1, 'Should have 1 vault');

    let vaults = factory.get_all_vaults();
    assert(vaults.len() == 1, 'Should have 1 vault in list');
    assert(*vaults.at(0) == vault_addr, 'Wrong vault address');

    let vault_for_asset = factory.get_vault_for_asset(asset_addr);
    assert(vault_for_asset == vault_addr, 'Wrong vault for asset');
}

#[test]
fn test_register_multiple_vaults() {
    let (factory_addr, factory, _, _, _) = deploy_system();

    // Deploy multiple assets and vaults
    let asset1 = deploy_mock_asset('WBTC');
    let asset2 = deploy_mock_asset('STRK');
    let asset3 = deploy_mock_asset('BTSUSD');

    let (vault1, _) = deploy_vault(OWNER(), asset1, "Savings WBTC", "sWBTC");
    let (vault2, _) = deploy_vault(OWNER(), asset2, "Savings STRK", "sSTRK");
    let (vault3, _) = deploy_vault(OWNER(), asset3, "Savings BTSUSD", "sBTSUSD");

    // Register all vaults
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault1, asset1);
    factory.register_vault(vault2, asset2);
    factory.register_vault(vault3, asset3);
    stop_cheat_caller_address(factory_addr);

    // Verify
    assert(factory.get_vault_count() == 3, 'Should have 3 vaults');

    let vaults = factory.get_all_vaults();
    assert(vaults.len() == 3, 'Should have 3 vaults in list');

    // Check each asset maps to correct vault
    assert(factory.get_vault_for_asset(asset1) == vault1, 'Wrong vault for asset1');
    assert(factory.get_vault_for_asset(asset2) == vault2, 'Wrong vault for asset2');
    assert(factory.get_vault_for_asset(asset3) == vault3, 'Wrong vault for asset3');
}

#[test]
fn test_get_vault_info() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    // Register vault
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, asset_addr);
    stop_cheat_caller_address(factory_addr);

    // Get vault info
    let info = factory.get_vault_info(vault_addr);

    assert(info.vault_address == vault_addr, 'Wrong vault address');
    assert(info.asset == asset_addr, 'Wrong asset');
    assert(info.vsr == VSR_4_PERCENT, 'Wrong VSR');
    assert(info.active == true, 'Should be active');
}

#[test]
#[should_panic(expected: 'Factory: zero address')]
fn test_cannot_register_zero_vault() {
    let (factory_addr, factory, asset_addr, _, _) = deploy_system();

    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(ZERO_ADDRESS(), asset_addr);
    stop_cheat_caller_address(factory_addr);
}

#[test]
#[should_panic(expected: 'Factory: zero address')]
fn test_cannot_register_zero_asset() {
    let (factory_addr, factory, _, vault_addr, _) = deploy_system();

    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, ZERO_ADDRESS());
    stop_cheat_caller_address(factory_addr);
}

#[test]
#[should_panic(expected: 'Factory: asset vault exists')]
fn test_cannot_register_duplicate_asset() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    // Register first vault
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, asset_addr);

    // Try to register another vault for same asset
    let (vault2, _) = deploy_vault(OWNER(), asset_addr, "Savings WBTC 2", "sWBTC2");
    factory.register_vault(vault2, asset_addr);
    stop_cheat_caller_address(factory_addr);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_register() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    start_cheat_caller_address(factory_addr, USER1());
    factory.register_vault(vault_addr, asset_addr);
    stop_cheat_caller_address(factory_addr);
}

// ============ Vault Deactivation Tests ============

#[test]
fn test_deactivate_vault() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    // Register vault
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, asset_addr);

    // Deactivate vault
    factory.deactivate_vault(vault_addr);
    stop_cheat_caller_address(factory_addr);

    // Verify deactivation
    let info = factory.get_vault_info(vault_addr);
    assert(info.active == false, 'Should be inactive');

    // Vault count should remain unchanged
    assert(factory.get_vault_count() == 1, 'Count should still be 1');
}

#[test]
#[should_panic(expected: 'Factory: vault not found')]
fn test_cannot_deactivate_unregistered_vault() {
    let (factory_addr, factory, _, _, _) = deploy_system();

    let fake_vault = contract_address_const::<'FAKE_VAULT'>();

    start_cheat_caller_address(factory_addr, OWNER());
    factory.deactivate_vault(fake_vault);
    stop_cheat_caller_address(factory_addr);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_deactivate() {
    let (factory_addr, factory, asset_addr, vault_addr, _) = deploy_system();

    // Register vault first
    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault_addr, asset_addr);
    stop_cheat_caller_address(factory_addr);

    // Try to deactivate as non-owner
    start_cheat_caller_address(factory_addr, USER1());
    factory.deactivate_vault(vault_addr);
    stop_cheat_caller_address(factory_addr);
}

// ============ Query Tests ============

#[test]
fn test_get_vault_for_unregistered_asset() {
    let (_, factory, _, _, _) = deploy_system();

    let unknown_asset = contract_address_const::<'UNKNOWN'>();
    let result = factory.get_vault_for_asset(unknown_asset);

    // Should return zero address for unregistered asset
    assert(result.is_zero(), 'Should return zero address');
}

#[test]
fn test_get_vault_info_for_unregistered_vault() {
    let (_, factory, _, _, _) = deploy_system();

    let unknown_vault = contract_address_const::<'UNKNOWN'>();
    let info = factory.get_vault_info(unknown_vault);

    // Should return default VaultInfo with zero address
    assert(info.vault_address.is_zero(), 'Should have zero vault address');
    assert(info.asset.is_zero(), 'Should have zero asset');
    assert(info.vsr == 0, 'Should have zero vsr');
    assert(info.active == false, 'Should be inactive');
}

#[test]
fn test_get_all_vaults_order() {
    let (factory_addr, factory, _, _, _) = deploy_system();

    // Deploy and register multiple vaults
    let asset1 = deploy_mock_asset('WBTC');
    let asset2 = deploy_mock_asset('STRK');
    let asset3 = deploy_mock_asset('BTSUSD');

    let (vault1, _) = deploy_vault(OWNER(), asset1, "Savings WBTC", "sWBTC");
    let (vault2, _) = deploy_vault(OWNER(), asset2, "Savings STRK", "sSTRK");
    let (vault3, _) = deploy_vault(OWNER(), asset3, "Savings BTSUSD", "sBTSUSD");

    start_cheat_caller_address(factory_addr, OWNER());
    factory.register_vault(vault1, asset1);
    factory.register_vault(vault2, asset2);
    factory.register_vault(vault3, asset3);
    stop_cheat_caller_address(factory_addr);

    // Verify order (should be in registration order)
    let vaults = factory.get_all_vaults();
    assert(*vaults.at(0) == vault1, 'First should be vault1');
    assert(*vaults.at(1) == vault2, 'Second should be vault2');
    assert(*vaults.at(2) == vault3, 'Third should be vault3');
}
