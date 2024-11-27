import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ExampleProject } from "../target/types/example_project";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("example_project", () => {

  anchor.setProvider(anchor.AnchorProvider.env());

  let program = anchor.workspace.ExampleProject as Program<ExampleProject>;

  afterEach(async () => {

    try {
      await program.methods
        .close()
        .accounts({
        })
        .rpc();

    } catch (err) {
      console.error("Failed to close account:", err);
    }
  })

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
  });

  it("Should crash when trying to initialize twice", async () => {

    const tx1 = await program.methods.initialize().rpc();

    try {
      const tx2 = await program.methods.initialize().rpc();
    } catch (err) {
      assert(JSON.stringify(err).includes("already in use"))
    }

  });

  describe('intialize global', () => {

    it('should NOT be callable by other users', async () => {
      const provider = anchor.AnchorProvider.local();
      anchor.setProvider(provider);

      const program = anchor.workspace.ExampleProject;
      const userPublicKey = provider.wallet.publicKey;

      // Setup First User

      const [userAccountPublicKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('user_account'), userPublicKey.toBuffer()],
        program.programId
      );

      const initAccount = await program.methods.initialize().accounts({
        userAccount: userAccountPublicKey,
        user: userPublicKey,
      }).rpc();

      // set up global account

      const [globalAccountPublicKey, globalBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('global_account')],
        program.programId
      );

      // Call global initialize and expect it to fail

      try {

        const initGlobalAccount = await program.methods.initializeGlobal().accounts({
          globalAccount: globalAccountPublicKey,
          user: userPublicKey,
        }).rpc();

        throw "Shouldn't get to here..."
      }
      catch (err) {
        assert(JSON.stringify(err).includes("Caller is not authorized"))
      }

    })

    it('should be callable by admin user with the hardcoded address', async () => {
      
      const provider = anchor.AnchorProvider.local();
      anchor.setProvider(provider);

      const program = anchor.workspace.ExampleProject;
      const userPublicKey = new PublicKey("4ndmLd7zdcvXz9T3VrNeQaX6Tz3jGhmB93UZwqcMLen8");

      // Setup First User

      const [userAccountPublicKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('user_account'), userPublicKey.toBuffer()],
        program.programId
      );

      const initAccount = await program.methods.initialize().accounts({
        userAccount: userAccountPublicKey,
        user: userPublicKey,
      }).rpc();

      // set up global account

      const [globalAccountPublicKey, globalBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('global_account')],
        program.programId
      );

      // call initializeGlobal

      const initGlobalAccount = await program.methods.initializeGlobal().accounts({
        globalAccount: globalAccountPublicKey,
        user: userPublicKey,
      }).signers([userPublicKey]).rpc();

    })

  })

  describe('incrementing counters', () => {
    const provider = anchor.AnchorProvider.local();
    anchor.setProvider(provider);

    const program = anchor.workspace.ExampleProject;
    const userPublicKey = provider.wallet.publicKey;

    const secondUserKeypair = anchor.web3.Keypair.generate();
    const secondUserPublicKey = secondUserKeypair.publicKey;

    xit('increments personal counter AND global counter', async () => {

      // Setup First User

      const [userAccountPublicKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('user_account'), userPublicKey.toBuffer()],
        program.programId
      );

      const initAccount = await program.methods.initialize().accounts({
        userAccount: userAccountPublicKey,
        user: userPublicKey,
      }).rpc();

      // Setup Second User (and fund with some Sol so they can call some transactions)

      const [secondUserAccountPublicKey, secondUserBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('user_account'), secondUserPublicKey.toBuffer()],
        program.programId
      );

      const airdropTx = await provider.connection.requestAirdrop(
        secondUserKeypair.publicKey,
        2_000_000
      );

      await provider.connection.confirmTransaction(airdropTx);

      const initAccountSecond = await program.methods.initialize().accounts({
        userAccount: secondUserAccountPublicKey,
        user: secondUserPublicKey,
      }).signers([secondUserKeypair]).rpc();

      // Setup global Account

      const [globalAccountPublicKey, globalBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('global_account')],
        program.programId
      );

      const initGlobalAccount = await program.methods.initializeGlobal().accounts({
        globalAccount: globalAccountPublicKey,
        user: userPublicKey,
      }).rpc();

      // First Increment Call

      const tx1 = await program.methods.increment().accounts({
        userAccount: userAccountPublicKey,
        // globalAccount: globalAccountPublicKey, // will work if you pass in but not necessary apparently
        user: userPublicKey,
      }).rpc();

      const userAccountAfterFirst = await program.account.userAccount.fetch(userAccountPublicKey);
      assert(userAccountAfterFirst.personalCounter.toNumber() === 1)

      const globalAccountAfterFirst = await program.account.globalAccount.fetch(globalAccountPublicKey);
      assert.strictEqual(globalAccountAfterFirst.globalCounter.toNumber(), 1, "Global counter should be 1");

      // Second Increment Call

      const tx2 = await program.methods.increment().accounts({
        userAccount: secondUserAccountPublicKey,
        user: secondUserPublicKey,
      }).signers([secondUserKeypair]).rpc();

      // Assert first user, second user, and global counts are correct
      const user1AccountAfterSecond = await program.account.userAccount.fetch(userAccountPublicKey);
      assert(user1AccountAfterSecond.personalCounter.toNumber() === 1)

      const user2AccountAfterSecond = await program.account.userAccount.fetch(secondUserAccountPublicKey);
      assert(user2AccountAfterSecond.personalCounter.toNumber() === 1)

      const globalAccountAfterSecond = await program.account.globalAccount.fetch(globalAccountPublicKey);
      assert.strictEqual(globalAccountAfterSecond.globalCounter.toNumber(), 2, "Global counter should be 2");

    });

  });

});
