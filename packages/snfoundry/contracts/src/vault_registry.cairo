/// VaultRegistry Contract
///
/// Tracks the on-chain state of native Bitcoin OP_CAT vaults.
/// When a user deposits BTC into a Taproot vault on Bitcoin, they register
/// here by providing the txid and amount. CDPCore uses this as collateral
/// backing for BTCUSD debt.
///
/// txid is stored as felt252 (first 31 bytes of the 32-byte Bitcoin txid).
/// Collision probability is negligible for a hackathon demo; production would
/// use two felt252s (high/low) or a proper 256-bit hash.

#[starknet::contract]
pub mod VaultRegistry {
    use contracts::interfaces::{IVaultRegistry, VaultInfo, VaultState};
    use core::num::traits::Zero;
    use openzeppelin_access::ownable::OwnableComponent;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        /// Address authorized to register and update vaults (CDPCore).
        cdp_core: ContractAddress,
        /// txid (felt252) → vault owner
        vault_owner: Map<felt252, ContractAddress>,
        /// txid → BTC amount in satoshis
        vault_btc_amount: Map<felt252, u256>,
        /// txid → VaultState (0=Active, 1=Repaid, 2=Liquidated)
        vault_state: Map<felt252, u8>,
        /// txid → registration timestamp
        vault_registered_at: Map<felt252, u64>,
        /// total number of registered vaults
        total_vaults: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        VaultRegistered: VaultRegistered,
        VaultClosed: VaultClosed,
        VaultLiquidated: VaultLiquidated,
        CDPCoreUpdated: CDPCoreUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultRegistered {
        #[key]
        pub txid: felt252,
        #[key]
        pub owner: ContractAddress,
        pub btc_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultClosed {
        #[key]
        pub txid: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultLiquidated {
        #[key]
        pub txid: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CDPCoreUpdated {
        pub old_cdp_core: ContractAddress,
        pub new_cdp_core: ContractAddress,
    }

    pub mod Errors {
        pub const ONLY_CDP_CORE: felt252 = 'Registry: not cdp_core';
        pub const VAULT_EXISTS: felt252 = 'Registry: vault already exists';
        pub const VAULT_NOT_FOUND: felt252 = 'Registry: vault not found';
        pub const VAULT_NOT_ACTIVE: felt252 = 'Registry: vault not active';
        pub const ZERO_ADDRESS: felt252 = 'Registry: zero address';
        pub const ZERO_AMOUNT: felt252 = 'Registry: zero btc amount';
        pub const ZERO_TXID: felt252 = 'Registry: zero txid';
    }

    // VaultState constants
    const STATE_ACTIVE: u8 = 0;
    const STATE_REPAID: u8 = 1;
    const STATE_LIQUIDATED: u8 = 2;

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, cdp_core: ContractAddress) {
        self.ownable.initializer(owner);
        assert(!cdp_core.is_zero(), Errors::ZERO_ADDRESS);
        self.cdp_core.write(cdp_core);
    }

    #[abi(embed_v0)]
    impl VaultRegistryImpl of IVaultRegistry<ContractState> {
        /// Register a Bitcoin vault. Called by CDPCore when a user pastes their txid.
        /// `txid` is the first 31 bytes of the Bitcoin deposit txid as felt252.
        /// `owner` is the Starknet address that owns this position.
        /// `btc_amount` is the deposited amount in satoshis.
        fn register_vault(
            ref self: ContractState, txid: felt252, owner: ContractAddress, btc_amount: u256,
        ) {
            self._assert_only_cdp_core();
            assert(txid != 0, Errors::ZERO_TXID);
            assert(!owner.is_zero(), Errors::ZERO_ADDRESS);
            assert(btc_amount > 0, Errors::ZERO_AMOUNT);
            // Ensure this txid hasn't been registered already
            assert(self.vault_owner.read(txid).is_zero(), Errors::VAULT_EXISTS);

            self.vault_owner.write(txid, owner);
            self.vault_btc_amount.write(txid, btc_amount);
            self.vault_state.write(txid, STATE_ACTIVE);
            self.vault_registered_at.write(txid, get_block_timestamp());
            self.total_vaults.write(self.total_vaults.read() + 1);

            self.emit(VaultRegistered { txid, owner, btc_amount });
        }

        /// Mark vault as repaid (BTC returned to user). Only CDPCore.
        fn close_vault(ref self: ContractState, txid: felt252) {
            self._assert_only_cdp_core();
            self._assert_vault_active(txid);
            self.vault_state.write(txid, STATE_REPAID);
            self.emit(VaultClosed { txid });
        }

        /// Mark vault as liquidated (BTC sent to liquidation pool). Only CDPCore.
        fn liquidate_vault(ref self: ContractState, txid: felt252) {
            self._assert_only_cdp_core();
            self._assert_vault_active(txid);
            self.vault_state.write(txid, STATE_LIQUIDATED);
            self.emit(VaultLiquidated { txid });
        }

        fn get_vault(self: @ContractState, txid: felt252) -> VaultInfo {
            assert(!self.vault_owner.read(txid).is_zero(), Errors::VAULT_NOT_FOUND);
            VaultInfo {
                owner: self.vault_owner.read(txid),
                btc_amount: self.vault_btc_amount.read(txid),
                state: self._read_state(self.vault_state.read(txid)),
                registered_at: self.vault_registered_at.read(txid),
            }
        }

        fn is_active(self: @ContractState, txid: felt252) -> bool {
            !self.vault_owner.read(txid).is_zero() && self.vault_state.read(txid) == STATE_ACTIVE
        }

        fn get_owner(self: @ContractState, txid: felt252) -> ContractAddress {
            self.vault_owner.read(txid)
        }

        fn get_btc_amount(self: @ContractState, txid: felt252) -> u256 {
            self.vault_btc_amount.read(txid)
        }

        fn get_total_vaults(self: @ContractState) -> u64 {
            self.total_vaults.read()
        }

        fn set_cdp_core(ref self: ContractState, new_cdp_core: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!new_cdp_core.is_zero(), Errors::ZERO_ADDRESS);
            let old = self.cdp_core.read();
            self.cdp_core.write(new_cdp_core);
            self.emit(CDPCoreUpdated { old_cdp_core: old, new_cdp_core });
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_cdp_core(self: @ContractState) {
            assert(get_caller_address() == self.cdp_core.read(), Errors::ONLY_CDP_CORE);
        }

        fn _assert_vault_active(self: @ContractState, txid: felt252) {
            assert(!self.vault_owner.read(txid).is_zero(), Errors::VAULT_NOT_FOUND);
            assert(self.vault_state.read(txid) == STATE_ACTIVE, Errors::VAULT_NOT_ACTIVE);
        }

        fn _read_state(self: @ContractState, raw: u8) -> VaultState {
            if raw == STATE_REPAID {
                VaultState::Repaid
            } else if raw == STATE_LIQUIDATED {
                VaultState::Liquidated
            } else {
                VaultState::Active
            }
        }
    }
}
