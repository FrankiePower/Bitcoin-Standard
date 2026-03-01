/// BTS Savings Factory
///
/// Registry contract that tracks all deployed BTSSavingsVault instances.
/// Provides a single entry point for the frontend to discover all savings vaults,
/// query their configuration, and fetch aggregate protocol stats.
///
/// Usage:
///   1. Deploy a BTSSavingsVault for each asset (wBTC, BTSUSD, STRK)
///   2. Call register_vault() on this factory with each vault address
///   3. Frontend queries get_all_vaults() to discover them

#[starknet::contract]
pub mod BTSSavingsFactory {
    use contracts::savings::interfaces::{
        IBTSSavingsFactory, IBTSSavingsVaultDispatcher, IBTSSavingsVaultDispatcherTrait, VaultInfo,
    };
    use core::num::traits::Zero;
    use openzeppelin_access::ownable::OwnableComponent;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess, Vec,
        VecTrait, MutableVecTrait,
    };
    use starknet::ContractAddress;

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        /// Ordered list of all vault addresses.
        vault_list: Vec<ContractAddress>,
        /// Vault address → VaultInfo
        vault_info: Map<ContractAddress, VaultInfo>,
        /// Asset address → vault address (one vault per asset)
        asset_to_vault: Map<ContractAddress, ContractAddress>,
        /// Total number of registered vaults.
        vault_count: u256,
    }

    // ================================================================================================
    // EVENTS
    // ================================================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        VaultRegistered: VaultRegistered,
        VaultDeactivated: VaultDeactivated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultRegistered {
        #[key]
        pub vault: ContractAddress,
        #[key]
        pub asset: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultDeactivated {
        #[key]
        pub vault: ContractAddress,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    pub mod Errors {
        pub const ZERO_ADDRESS: felt252 = 'Factory: zero address';
        pub const VAULT_EXISTS: felt252 = 'Factory: asset vault exists';
        pub const VAULT_NOT_FOUND: felt252 = 'Factory: vault not found';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(!owner.is_zero(), Errors::ZERO_ADDRESS);
        self.ownable.initializer(owner);
        self.vault_count.write(0);
    }

    // ================================================================================================
    // IBTSSavingsFactory IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl BTSSavingsFactoryImpl of IBTSSavingsFactory<ContractState> {
        fn get_all_vaults(self: @ContractState) -> Array<ContractAddress> {
            let count = self.vault_count.read();
            let mut result: Array<ContractAddress> = ArrayTrait::new();
            let mut i: u256 = 0;
            loop {
                if i >= count {
                    break;
                }
                let vault_addr = self.vault_list.at(i.try_into().unwrap()).read();
                result.append(vault_addr);
                i += 1;
            };
            result
        }

        fn get_vault_for_asset(self: @ContractState, asset: ContractAddress) -> ContractAddress {
            self.asset_to_vault.entry(asset).read()
        }

        fn get_vault_count(self: @ContractState) -> u256 {
            self.vault_count.read()
        }

        fn get_vault_info(self: @ContractState, vault: ContractAddress) -> VaultInfo {
            self.vault_info.entry(vault).read()
        }

        fn register_vault(
            ref self: ContractState, vault: ContractAddress, asset: ContractAddress,
        ) {
            self.ownable.assert_only_owner();
            assert(!vault.is_zero(), Errors::ZERO_ADDRESS);
            assert(!asset.is_zero(), Errors::ZERO_ADDRESS);

            // Ensure no vault is already registered for this asset
            let existing = self.asset_to_vault.entry(asset).read();
            assert(existing.is_zero(), Errors::VAULT_EXISTS);

            // Read the current VSR from the vault itself
            let vault_dispatcher = IBTSSavingsVaultDispatcher { contract_address: vault };
            let vsr = vault_dispatcher.get_vsr();

            // Store VaultInfo
            let info = VaultInfo { vault_address: vault, asset, vsr, active: true };
            self.vault_info.entry(vault).write(info);
            self.asset_to_vault.entry(asset).write(vault);
            self.vault_list.push(vault);
            self.vault_count.write(self.vault_count.read() + 1);

            self.emit(VaultRegistered { vault, asset });
        }

        fn deactivate_vault(ref self: ContractState, vault: ContractAddress) {
            self.ownable.assert_only_owner();

            let mut info = self.vault_info.entry(vault).read();
            assert(!info.vault_address.is_zero(), Errors::VAULT_NOT_FOUND);

            info.active = false;
            self.vault_info.entry(vault).write(info);

            self.emit(VaultDeactivated { vault });
        }
    }
}
