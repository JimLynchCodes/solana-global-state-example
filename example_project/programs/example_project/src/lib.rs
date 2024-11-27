use anchor_lang::prelude::*;

declare_id!("GQ61yFy7WV7oen2dWvUjpDAYPAxhuZcUZAShh8WScXu2");

#[program]
pub mod example_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        ctx.accounts.user_account.personal_counter = 0;
        Ok(())
    }

    // Initialize the global account (done only once by the deployer/admin)
    pub fn initialize_global(ctx: Context<InitializeGlobal>) -> Result<()> {
        msg!("Initializing global account");
        ctx.accounts.global_account.global_counter = 0;
        Ok(())
    }

    pub fn close(ctx: Context<CloseAccount>) -> Result<()> {
        msg!("Closing account for: {:?}", ctx.accounts.user_account);
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        msg!("Incrementing account: {:?}", ctx.accounts.user_account);
        ctx.accounts.user_account.personal_counter += 1;
        ctx.accounts.global_account.global_counter += 1;
        Ok(())
    }
}

#[account]
#[derive(Debug)]
pub struct UserAccount {
    pub personal_counter: u64,
}

#[account]
#[derive(Debug)]
pub struct GlobalAccount {
    pub global_counter: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 8,
        seeds = [b"user_account", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 8,
        seeds = [b"global_account"],
        bump
    )]
    pub global_account: Account<'info, GlobalAccount>,

    #[account(mut)]
    pub admin: Signer<'info>, // The program deployer/admin

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"user_account", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, seeds = [b"user_account", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>, // UserAccount to increment the counter
    #[account(mut, seeds = [b"global_account"], bump)]
    pub global_account: Account<'info, GlobalAccount>, // Global account
    pub user: Signer<'info>, // The user who is incrementing the counter
    pub system_program: Program<'info, System>, // The system program for the transaction
}
