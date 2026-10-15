// ═══ Parcis Config Configuration ═══
// Dynamically resolves between Arc Mainnet and Arc Testnet based on VITE_NETWORK in .env.
// Supports VITE_MAINNET_* and VITE_TESTNET_* environment variables.

// Determine active network: 'mainnet' or 'testnet'
const rawNetwork = (import.meta.env.VITE_NETWORK || '').toLowerCase();
export const isMainnet = rawNetwork === 'mainnet' || 
  (!rawNetwork && (
    import.meta.env.VITE_CHAIN_ID === '5042' || 
    (import.meta.env.VITE_RPC_URL && !import.meta.env.VITE_RPC_URL.includes('testnet'))
  ));

export const activeNetwork = isMainnet ? 'mainnet' : 'testnet';

/**
 * Resolves an environment variable dynamically based on active network:
 * Checks VITE_MAINNET_<KEY> (if mainnet) or VITE_TESTNET_<KEY> (if testnet),
 * falling back to VITE_<KEY>, then fallback value.
 */
export function getNetworkEnv(keySuffix, mainnetFallback, testnetFallback) {
  const mainVal = import.meta.env[`VITE_MAINNET_${keySuffix}`];
  const testVal = import.meta.env[`VITE_TESTNET_${keySuffix}`];
  const directVal = import.meta.env[`VITE_${keySuffix}`];

  if (isMainnet) {
    return mainVal || directVal || mainnetFallback;
  } else {
    return testVal || directVal || testnetFallback;
  }
}

export const CONFIG = {
  isMainnet,
  network: activeNetwork,
  chainId: parseInt(getNetworkEnv('CHAIN_ID', '5042', '5042002')),
  chainName: getNetworkEnv('CHAIN_NAME', 'Arc', 'Arc Testnet'),
  rpcUrl: getNetworkEnv('RPC_URL', 'https://rpc.mainnet.arc.io', 'https://arc-testnet.drpc.org'),
  explorerUrl: getNetworkEnv('EXPLORER', 'https://explorer.arc.io', 'https://testnet.arcscan.app'),
  usdcAddress: getNetworkEnv('USDC_ADDRESS', '0x3600000000000000000000000000000000000000', '0x3600000000000000000000000000000000000000'),

  linksContract: getNetworkEnv('LINKS_CONTRACT', '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0', '0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94'),
  safeContract: getNetworkEnv('ARCSAFE_CONTRACT', '0x7BD84F1EDA677c98217F590560E8C0577Efba809', '0x462b674d2feD79CD38e813eb5455e3DCf27D0077'),
  streamsContract: getNetworkEnv('STREAMS_CONTRACT', '0xe6775F130F61d9d2e3E93Dad2e6d971788D36557', '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d'),
  devRegistryContract: getNetworkEnv('DEV_REGISTRY_CONTRACT', '0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1', '0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670'),

  minArbiterStake: parseFloat(import.meta.env.VITE_MIN_ARBITER_STAKE || '10'),
  arbiterFeePercent: parseFloat(import.meta.env.VITE_ARBITER_FEE_PERCENT || '0.5'),
  platformFeePercent: parseFloat(import.meta.env.VITE_PLATFORM_FEE_PERCENT || '0.25'),
  feedbackGoogleForm: import.meta.env.VITE_FEEDBACK_GOOGLE_FORM || 'https://forms.gle/bkQ3ZeCxPo4m6g7N9',
  feedbackTelegram: import.meta.env.VITE_FEEDBACK_TELEGRAM || 'https://t.me/devabdullmajeed',
  premiumSlugFee: parseFloat(import.meta.env.VITE_PREMIUM_SLUG_FEE || '0.5'),
  adminRoutePath: (import.meta.env.VITE_ADMIN_ROUTE_PATH || 'parcis-ops-9842x').trim().replace(/^#?\/?/, ''),
  adminWallets: (import.meta.env.VITE_ADMIN_WALLETS || '')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0 && a !== '0xyour_admin_wallet_here'),
};

/** Check if a wallet address is in the admin whitelist from .env */
export function isAdminWallet(address) {
  if (!address) return false
  return CONFIG.adminWallets.includes(address.toLowerCase())
}
