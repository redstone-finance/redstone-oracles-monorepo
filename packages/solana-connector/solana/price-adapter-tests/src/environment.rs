use core::{cell::RefCell, time::Duration};

use litesvm::LiteSVM;
use redstone_testing::{self, env::PriceAdapterRunEnv, signer::ContractUpdateSigner as Actor};
use solana_clock::Clock;
use solana_instruction::{account_meta::AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_pubkey::Pubkey;
use solana_signature::Signature;
use solana_signer::Signer;
use solana_transaction::Transaction;

const PROGRAM_ID: &str = "rds8J7VKqLQgzDr7vS59dkQga3B1BotgFy8F7LSLC74";
const TRUSTED_UPDATER: &str = "f7a8654c99499d762eccafd584e8b16ab5119c162611f7c99f70d2d781fb3931";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

use borsh::{BorshDeserialize, BorshSerialize};

const WRITE_PRICE_DISCRIMINATOR: [u8; 8] = [16_u8, 186, 120, 224, 118, 178, 161, 152];
const UNIQUE_SIGNER_THRESHOLD_DISCRIMINATOR: [u8; 8] = [101, 24, 86, 157, 116, 46, 226, 31];

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PriceData {
    pub feed_id: [u8; 32],
    pub value: [u8; 32],
    pub timestamp: u64,
    pub write_timestamp: Option<u64>,
}

const PROGRAM_PATH: &str = "../target/deploy/redstone_solana_price_adapter.so";

struct DummyKeypair {
    pub_key: Pubkey,
    counter: RefCell<u8>,
}

impl Signer for DummyKeypair {
    fn try_pubkey(&self) -> Result<Pubkey, solana_signer::SignerError> {
        Ok(self.pub_key)
    }

    fn try_sign_message(&self, _: &[u8]) -> Result<Signature, solana_signer::SignerError> {
        let count = self.counter.take();
        self.counter.replace(count + 1);
        Ok([count; 64].into())
    }

    fn is_interactive(&self) -> bool {
        false
    }
}

pub struct Env {
    svm: LiteSVM,
    signer: Keypair,
    trusted_signer: DummyKeypair,
    program_id: Pubkey,
}

fn feed_seed(mut feed_id: Vec<u8>) -> Vec<u8> {
    feed_id.resize(32, 0);

    feed_id
}

fn price_seed() -> Vec<u8> {
    let mut bytes = "price".as_bytes().to_vec();
    bytes.resize(32, 0);

    bytes
}

fn trusted_keypair() -> DummyKeypair {
    DummyKeypair {
        pub_key: Pubkey::new_from_array(hex::decode(TRUSTED_UPDATER).unwrap().try_into().unwrap()),
        counter: RefCell::new(1),
    }
}

fn write_price_instruction_data(mut payload: Vec<u8>, feed_id: Vec<u8>) -> Vec<u8> {
    let mut data = WRITE_PRICE_DISCRIMINATOR.to_vec();

    data.append(&mut feed_seed(feed_id));
    data.extend_from_slice(&((payload.len()) as u32).to_le_bytes());
    data.append(&mut payload);

    data
}

fn initialize_svm() -> (LiteSVM, Keypair, Pubkey, DummyKeypair) {
    let mut svm = LiteSVM::new()
        .with_sigverify(false)
        .with_blockhash_check(false);

    let signer = Keypair::new();
    let trusted_keypair = trusted_keypair();
    let program_pubkey = PROGRAM_ID.parse().unwrap();

    svm.add_program_from_file(program_pubkey, PROGRAM_PATH)
        .unwrap();
    svm.airdrop(&signer.pubkey(), LAMPORTS_PER_SOL).unwrap();
    svm.airdrop(&trusted_keypair.pubkey(), LAMPORTS_PER_SOL)
        .unwrap();

    (svm, signer, program_pubkey, trusted_keypair)
}

impl Default for Env {
    fn default() -> Self {
        Self::new()
    }
}

impl Env {
    pub fn new() -> Self {
        let (svm, signer, program_id, trusted_signer) = initialize_svm();

        Self {
            svm,
            signer,
            program_id,
            trusted_signer,
        }
    }

    pub fn set_time(&mut self, timestamp_millis: u64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp = (timestamp_millis / 1_000) as i64;

        self.svm.set_sysvar(&clock);
    }

    fn advance_clock(&mut self, by_millis: u64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp += (by_millis / 1_000) as i64;

        self.svm.set_sysvar(&clock);
    }

    fn feed_address(&self, feed_id: Vec<u8>) -> Pubkey {
        Pubkey::find_program_address(&[&price_seed(), &feed_seed(feed_id)], &self.program_id).0
    }

    pub fn read_price_feed(&self, feed_id: Vec<u8>) -> PriceData {
        let account = self.svm.get_account(&self.feed_address(feed_id)).unwrap();

        PriceData::deserialize(&mut &account.data[8..]).unwrap()
    }

    pub fn write_price(&mut self, feed_id: Vec<u8>, payload: Vec<u8>, signer: Actor) {
        let instruction_data = write_price_instruction_data(payload, feed_id.clone());

        let signer: Box<dyn Signer> = match signer {
            Actor::Trusted => Box::new(&self.trusted_signer),
            Actor::Untrusted => Box::new(&self.signer),
        };

        let instruction = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(signer.pubkey(), true),
                AccountMeta::new(self.feed_address(feed_id), false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM.parse().unwrap(), false),
            ],
            data: instruction_data,
        };
        let tx = self.transaction(instruction, &signer);

        self.svm.send_transaction(tx).unwrap();
    }

    pub fn signer_count(&self) -> u8 {
        let instruction = Instruction {
            program_id: self.program_id,
            accounts: vec![],
            data: UNIQUE_SIGNER_THRESHOLD_DISCRIMINATOR.to_vec(),
        };

        let tx = self.transaction(instruction, &self.signer);

        self.svm
            .simulate_transaction(tx)
            .unwrap()
            .meta
            .return_data
            .data[0]
    }

    fn transaction(&self, instruction: Instruction, signer: &impl Signer) -> Transaction {
        Transaction::new(
            &[signer],
            Message::new(&[instruction], Some(&signer.pubkey())),
            self.svm.latest_blockhash(),
        )
    }
}

impl PriceAdapterRunEnv for Env {
    fn read_timestamp(&mut self, feed_id: Option<&str>) -> u64 {
        if let Some(feed_id) = feed_id {
            self.read_price_feed(feed_seed(feed_id.as_bytes().to_vec()))
                .timestamp
        } else {
            0
        }
    }

    fn read_prices(&mut self, feed_ids: Vec<Vec<u8>>) -> Vec<redstone_testing::redstone::Value> {
        let mut prices = vec![];

        for feed in feed_ids {
            prices.push(self.read_price_feed(feed).value.to_vec().into());
        }

        prices
    }

    fn process_payload(&mut self, payload: Vec<u8>, feed_ids: Vec<Vec<u8>>, signer: Actor) {
        for feed in feed_ids {
            self.write_price(feed.clone(), payload.clone(), signer);
        }
    }

    fn set_time_to(&mut self, to: Duration) {
        self.set_time(to.as_millis() as u64);
    }

    fn read_prices_and_timestamp(
        &mut self,
        feed_ids: Vec<Vec<u8>>,
    ) -> (Vec<redstone_testing::redstone::Value>, u64) {
        let mut prices = vec![];
        let mut timestamp = 0;
        for feed in feed_ids {
            let price_data = self.read_price_feed(feed.clone());

            prices.push(price_data.value.to_vec().into());
            timestamp = price_data.timestamp;
        }

        (prices, timestamp)
    }

    fn process_payload_get(
        &mut self,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        signer: Actor,
    ) -> (Vec<redstone_testing::redstone::Value>, u64) {
        self.process_payload(payload, feed_ids.clone(), signer);
        self.read_prices_and_timestamp(feed_ids)
    }

    fn increase_time_by(&mut self, by: Duration) {
        self.advance_clock(by.as_millis() as u64);
    }

    fn unique_signer_threshold(&self) -> u8 {
        self.signer_count()
    }
}
