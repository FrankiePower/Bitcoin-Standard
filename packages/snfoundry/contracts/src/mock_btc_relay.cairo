/// Mock BTC Relay for Testing
///
/// A simplified mock implementation of the Bitcoin relay interface.
/// For testnet only — always returns the configured verification result.
/// In production, use the real Atomiq BTC relay.

// ================================================================================================
// INTERFACE
// ================================================================================================

#[starknet::interface]
pub trait IMockBtcRelay<TContractState> {
    fn submit_block_header(ref self: TContractState, header: Span<felt252>);
    fn get_latest_block_height(self: @TContractState) -> u64;
    fn verify_tx_inclusion(
        self: @TContractState,
        tx_hash: u256,
        block_height: u64,
        merkle_proof: Span<u256>,
        tx_index: u32,
    ) -> bool;
    fn get_required_confirmations(self: @TContractState) -> u64;
    fn set_block_height(ref self: TContractState, height: u64);
    fn set_required_confirmations(ref self: TContractState, confirmations: u64);
    fn set_verification_result(ref self: TContractState, result: bool);
}

#[starknet::contract]
pub mod MockBtcRelay {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IMockBtcRelay;

    // ================================================================================================
    // CONSTANTS
    // ================================================================================================

    const DEFAULT_BLOCK_HEIGHT: u64 = 850000;
    const DEFAULT_CONFIRMATIONS: u64 = 3;

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        block_height: u64,
        required_confirmations: u64,
        /// Controls verify_tx_inclusion return value (set false for negative test cases)
        verification_result: bool,
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.block_height.write(DEFAULT_BLOCK_HEIGHT);
        self.required_confirmations.write(DEFAULT_CONFIRMATIONS);
        self.verification_result.write(true);
    }

    // ================================================================================================
    // IMOCKBTCRELAY IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl MockBtcRelayImpl of IMockBtcRelay<ContractState> {
        fn submit_block_header(ref self: ContractState, header: Span<felt252>) {
            self.block_height.write(self.block_height.read() + 1);
        }

        fn get_latest_block_height(self: @ContractState) -> u64 {
            self.block_height.read()
        }

        fn verify_tx_inclusion(
            self: @ContractState,
            tx_hash: u256,
            block_height: u64,
            merkle_proof: Span<u256>,
            tx_index: u32,
        ) -> bool {
            self.verification_result.read()
        }

        fn get_required_confirmations(self: @ContractState) -> u64 {
            self.required_confirmations.read()
        }

        fn set_block_height(ref self: ContractState, height: u64) {
            self.block_height.write(height);
        }

        fn set_required_confirmations(ref self: ContractState, confirmations: u64) {
            self.required_confirmations.write(confirmations);
        }

        fn set_verification_result(ref self: ContractState, result: bool) {
            self.verification_result.write(result);
        }
    }
}
