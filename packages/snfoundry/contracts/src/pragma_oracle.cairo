/// Pragma Oracle Adapter Contract
///
/// Implements the standard IPriceOracle interface for the CDP system
/// by bridging to Pragma's Oracle and Summary Stats contracts on Starknet.
#[starknet::contract]
pub mod PragmaOracle {
    use contracts::interfaces::IPriceOracle;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp};

    // --- Pragma Types ---
    #[derive(Serde, Drop, Copy)]
    pub enum DataType {
        SpotEntry: felt252,
        FutureEntry: (felt252, u64),
        GenericEntry: felt252,
    }

    #[derive(Serde, Drop, Copy)]
    pub enum AggregationMode {
        Median: (),
        Mean: (),
        ConversionRate: (),
        Error: (),
    }

    #[derive(Serde, Drop, Copy)]
    pub struct PragmaPricesResponse {
        pub price: u128,
        pub decimals: u32,
        pub last_updated_timestamp: u64,
        pub num_sources_aggregated: u32,
        pub expiration_timestamp: Option<u64>,
    }

    #[starknet::interface]
    trait IPragmaABI<TContractState> {
        fn get_data_median(self: @TContractState, data_type: DataType) -> PragmaPricesResponse;
    }

    #[starknet::interface]
    trait ISummaryStatsABI<TContractState> {
        fn calculate_volatility(
            self: @TContractState,
            data_type: DataType,
            start_tick: u64,
            end_tick: u64,
            num_samples: u64,
            aggregation_mode: AggregationMode,
        ) -> (u128, u32);
    }

    // --- Storage ---
    #[storage]
    struct Storage {
        pragma_oracle: ContractAddress,
        summary_stats: ContractAddress,
        btc_usd_pair_id: felt252,
        max_price_age: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        pragma_oracle: ContractAddress,
        summary_stats: ContractAddress,
        btc_usd_pair_id: felt252, // e.g. 18669995996566340 for BTC/USD
        max_price_age: u64 // e.g. 3600 (1 hour)
    ) {
        self.pragma_oracle.write(pragma_oracle);
        self.summary_stats.write(summary_stats);
        self.btc_usd_pair_id.write(btc_usd_pair_id);
        self.max_price_age.write(max_price_age);
    }

    #[abi(embed_v0)]
    impl PriceOracleImpl of IPriceOracle<ContractState> {
        fn get_btc_price(self: @ContractState) -> (u256, u64) {
            let dispatcher = IPragmaABIDispatcher { contract_address: self.pragma_oracle.read() };
            let pair_id = self.btc_usd_pair_id.read();
            let response = dispatcher.get_data_median(DataType::SpotEntry(pair_id));

            // Pragma price is u128, convert to u256 for our CDP engine
            (response.price.into(), response.last_updated_timestamp)
        }

        fn is_price_stale(self: @ContractState) -> bool {
            let dispatcher = IPragmaABIDispatcher { contract_address: self.pragma_oracle.read() };
            let pair_id = self.btc_usd_pair_id.read();
            let response = dispatcher.get_data_median(DataType::SpotEntry(pair_id));

            let max_age = self.max_price_age.read();
            let current_time = get_block_timestamp();

            current_time > response.last_updated_timestamp + max_age
        }

        fn get_max_price_age(self: @ContractState) -> u64 {
            self.max_price_age.read()
        }

        fn get_btc_volatility(self: @ContractState) -> u128 {
            let dispatcher = ISummaryStatsABIDispatcher {
                contract_address: self.summary_stats.read(),
            };
            let pair_id = self.btc_usd_pair_id.read();

            let current_time = get_block_timestamp();
            // Look back 1 week roughly
            let start_tick = if current_time > 604800 {
                current_time - 604800
            } else {
                0
            };

            let (volatility, _) = dispatcher
                .calculate_volatility(
                    DataType::SpotEntry(pair_id),
                    start_tick,
                    current_time,
                    200, // max samples allowed by Pragma
                    AggregationMode::Median(()),
                );

            volatility
        }
    }
}
