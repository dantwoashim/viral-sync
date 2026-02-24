use crate::errors::ViralSyncError;
use crate::state::merchant_config::GeoFence;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RedeemWithGeo<'info> {
    pub fence: Account<'info, GeoFence>,
    pub redeemer: Signer<'info>,
    /// CHECK: only required when signature payload is provided.
    pub attestation_server: UncheckedAccount<'info>,
}

pub fn redeem_with_geo(
    ctx: Context<RedeemWithGeo>,
    lat_micro: i32,
    lng_micro: i32,
    signature: Vec<u8>,
) -> Result<()> {
    let fence = &ctx.accounts.fence;
    require!(fence.is_active, ViralSyncError::TokensExpired);

    // Check if the user opted out with fallback permitted.
    if signature.is_empty() {
        require!(fence.allow_non_geo_redemption, ViralSyncError::TokensExpired);
        return Ok(());
    }

    require!(signature.len() == 64, ViralSyncError::InvalidSignature);
    require!(
        ctx.accounts.attestation_server.is_signer,
        ViralSyncError::InvalidAttestation
    );

    let attestation_key = ctx.accounts.attestation_server.key();
    let attestation_count = fence
        .attestation_server_count
        .min(fence.attestation_servers.len() as u8);
    let allowed = fence.attestation_servers[..attestation_count as usize].contains(&attestation_key);
    require!(allowed, ViralSyncError::InvalidAttestation);

    // Coarse geofence validation in-program: convert micro-degrees to meters.
    let lat_delta_micro = (lat_micro as i64)
        .saturating_sub(fence.lat_micro as i64)
        .unsigned_abs() as u128;
    let lng_delta_micro = (lng_micro as i64)
        .saturating_sub(fence.lng_micro as i64)
        .unsigned_abs() as u128;

    let lat_meters = lat_delta_micro
        .checked_mul(111_320)
        .ok_or(ViralSyncError::MathOverflow)?
        / 1_000_000;
    let lng_meters = lng_delta_micro
        .checked_mul(111_320)
        .ok_or(ViralSyncError::MathOverflow)?
        / 1_000_000;

    let dist_sq = lat_meters
        .checked_mul(lat_meters)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_add(
            lng_meters
                .checked_mul(lng_meters)
                .ok_or(ViralSyncError::MathOverflow)?,
        )
        .ok_or(ViralSyncError::MathOverflow)?;
    let radius_sq = (fence.radius_meters as u128)
        .checked_mul(fence.radius_meters as u128)
        .ok_or(ViralSyncError::MathOverflow)?;

    require!(dist_sq <= radius_sq, ViralSyncError::OutsideGeoFence);
    Ok(())
}
