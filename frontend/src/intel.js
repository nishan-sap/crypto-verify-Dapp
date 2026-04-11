// ══════════════════════════════════════════════════════════════
// NSTCrypto — OSINT Intelligence Engine
// OFAC Sanctions · Known Entities · Risk Scoring · Pattern Detection
// Sources: OFAC SDN List (public), blockchain analytics public data
// ══════════════════════════════════════════════════════════════

// ── OFAC Sanctioned Addresses (public SDN list — crypto entries) ──
// Source: https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists
export const OFAC_SANCTIONS = {
  // ── Lazarus Group / DPRK (North Korea) ─────────────────────
  "0x098b716b8aaf21512996dc57eb0615e2383e2f96": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK state-sponsored hackers" },
  "0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK linked" },
  "0x3cffd56b47b7b41c56258d9c7731abadc360e073": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK linked" },
  "0x53b6936513e738f44fb50d2b9476730c0d3a5f4b": { entity:"Lazarus Group", program:"DPRK", date:"2022-05-06", note:"Tornado Cash related DPRK" },
  "0x7f367cc41522ce07553e823bf3be79a889debe1b": { entity:"Lazarus Group", program:"DPRK", date:"2020-03-02", note:"DPRK linked" },
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b": { entity:"Lazarus Group", program:"DPRK", date:"2020-03-02", note:"DPRK linked" },
  "0x901bb9583b24d97e995513c6778dc6888ab6870e": { entity:"Lazarus Group", program:"DPRK", date:"2020-03-02", note:"DPRK linked" },
  "0xa7e5d5a720f06526557c513402f2e6b5fa20b008": { entity:"Lazarus Group", program:"DPRK", date:"2020-03-02", note:"DPRK linked" },
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c": { entity:"Lazarus Group", program:"DPRK", date:"2022-04-14", note:"Axie Infinity hack - Ronin Bridge" },
  "0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a": { entity:"Lazarus Group", program:"DPRK", date:"2022-05-06", note:"Ronin Bridge exploit" },
  "0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107": { entity:"Lazarus Group", program:"DPRK", date:"2022-05-06", note:"Ronin Bridge exploit" },
  "0x72a5843cc08275c8171e582972aa4fda8c397b2a": { entity:"Lazarus Group", program:"DPRK", date:"2022-05-06", note:"Ronin Bridge exploit" },
  "0x7f268357a8c2552623316e2562d90e642bb538e5": { entity:"Lazarus Group", program:"DPRK", date:"2022-05-06", note:"DPRK linked" },
  // ── Tornado Cash (OFAC sanctioned Aug 2022) ─────────────────
  "0x722122df12d4e14e13ac3b6895a86e84145b6967": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash Router" },
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 0.1 ETH Pool" },
  "0xd96f2b1c14db8458374d9aca76e26c3950113463": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 1 ETH Pool" },
  "0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 10 ETH Pool" },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 100 ETH Pool" },
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 1000 ETH Pool" },
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 100k DAI Pool" },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 10 ETH Pool" },
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 1M DAI Pool" },
  "0x23773e65ed146a459667ad352c5abd8dcb4c4e73": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash USDC Pool" },
  "0x22aaa7720ddd5388a3c0a3333430953c68f1849b": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash 3pool" },
  "0x03893a7c7463ae47d46bc7f091665f1893656003": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash BSC Pool" },
  "0x2717c5e28cf931547b621a5dddb772ab6a35b701": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash BSC Pool" },
  "0x58e8dcc13be9780fc42e8723d8ead4cf46943df2": { entity:"Tornado Cash", program:"CYBER2", date:"2022-08-08", note:"Tornado Cash BSC Pool" },
  // ── Blender.io (OFAC May 2022) ───────────────────────────────
  "0x8589427373d6d84e98730d7795d8f6f8731fda16": { entity:"Blender.io", program:"CYBER2", date:"2022-05-06", note:"BTC mixer sanctioned by OFAC" },
  // ── Evil Corp / Dridex ───────────────────────────────────────
  "0xa4a947f97f4b9b1a30dae58aece093e15a66c6c4": { entity:"Evil Corp", program:"CYBER2", date:"2019-12-05", note:"Evil Corp EV laundering" },
  // ── Russia / Ukraine sanctions ───────────────────────────────
  "0x9f4cda013e354b8fc285bf4b9a60460cee7f7ea9": { entity:"Garantex", program:"RUSSIA-EO14024", date:"2022-04-05", note:"Russian exchange sanctioned" },
  // ── Bitcoin OFAC Addresses (Lazarus Group / DPRK) ────────────
  // Keys stored lowercase — scoreAddress lowercases all inputs before lookup
  // Original: 1FfmbHfnpaZjKFvyi1okTjJJusN455paPH
  "1ffmbhfnpazjkfvyi1oktjjjusn455paph": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK state-sponsored hackers — BTC" },
  // Original: 149w62rY42aZBox8fGcmqNsXUzSStKeq8C
  "149w62ry42azbox8fgcmqnsxuzsstkeq8c": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK linked — BTC" },
  // Original: 1AggqMfjpFALVpVKpEAE5XD4abA9r3wNAK
  "1aggqmfjpfalvpvkpeae5xd4aba9r3wnak": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK linked — BTC" },
  // Original: 1Pd5ioMJKNkYnBtUt2LW2YbFjBiFKHWzQd
  "1pd5iomjknkynbtut2lw2ybfjbifkhwzqd": { entity:"Lazarus Group", program:"DPRK", date:"2018-09-13", note:"DPRK linked — BTC" },
  // Original: 3KNtbWYGcjKdnVANvfmrWqE9NpyJ1JGiAB
  "3kntbwygcjkdnvanvfmrwqe9npyj1jgiab": { entity:"Lazarus Group", program:"DPRK", date:"2022-04-14", note:"Ronin Bridge exploit proceeds — BTC" },
  "bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6": { entity:"Lazarus Group", program:"DPRK", date:"2022-04-14", note:"Ronin Bridge exploit — BTC bech32" },
  // ── Hydra Market (Russia, OFAC Apr 2022) ─────────────────────
  "bc1qjh0akslml59uuczddqu2sd5sk76y77ksat7y4k": { entity:"Hydra Market", program:"RUSSIA-EO14024", date:"2022-04-05", note:"Russian darknet market — BTC" },
  // ── Tron OFAC Addresses (keys lowercased for lookup consistency) ─
  // Original: TFVWqhvFqjJAZtadMCFc7kfQa7TXHB3cJ5
  "tfvwqhvfqjjaztadmcfc7kfqa7txhb3cj5": { entity:"Garantex",    program:"RUSSIA-EO14024", date:"2022-04-05", note:"Russian exchange — TRX" },
  // Original: TYASr5UV6HEcXatwdFyfeys1ZB4b3at9aL
  "tyasr5uv6hecxatwdfyfeys1zb4b3at9al": { entity:"Lazarus Group", program:"DPRK",          date:"2022-05-06", note:"DPRK linked — TRX" },
  // ── Solana OFAC Addresses (key lowercased for lookup consistency) ─
  // Original: FTkSmGsJ3ZqDSHdcnY7ejN1pWV3oMLQbhJPbr5jXCBL
  "ftksmgsj3zqdshdcny7ejn1pwv3omlqbhjpbr5jxcbl": { entity:"Lazarus Group", program:"DPRK", date:"2022-04-14", note:"Ronin Bridge exploit — SOL" },
};

// ── Known Entities Database ────────────────────────────────────
// type: exchange | mixer | bridge | defi | nft | burn | contract | scam | government
export const KNOWN_ENTITIES = {
  // ── Major Exchanges (RISK=0, verified) ──────────────────────
  "0x3f5ce5fbfe3e9af3571dd833d26ba9b5c936f0be": { label:"Binance Hot Wallet 1",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xd551234ae421e3bcba99a0da6d736074f22192ff": { label:"Binance Hot Wallet 2",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x564286362092d8e7936f0549571a803b203aaced": { label:"Binance Hot Wallet 3",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x0681d8db095565fe8a346fa0277bffde9c0edbbf": { label:"Binance Hot Wallet 4",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xfe9e8709d3215310075d67e3ed32a380ccf451c8": { label:"Binance Hot Wallet 5",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67": { label:"Binance Hot Wallet 6",    type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": { label:"Binance Cold Wallet",     type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xf977814e90da44bfa03b6295a0616a897441acec": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x5a52e96bacdabb82fd05763e25335261b270efcb": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xa910f92acdaf488fa6ef02174fb86208ad7722ba": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x28c6c06298d514db089934071355e5743bf21d60": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x9696f59e4d72e237be84ffd425dcad154bf96976": { label:"Binance Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": { label:"Binance Hot Wallet",      type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xe0f0cfde7ee664943906f17f7f14342a76a1ef19": { label:"Binance Hot Wallet",      type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x515b8ad8a79ef6b3d88a48ee73a90c9cb5c0a4a8": { label:"Coinbase Hot Wallet",     type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x503828976d22510aad0201ac7ec88293211d23da": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x3cd751e6b0078be393132286c442345e5dc49699": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xd688aea8f7d450909ade10c47faa95707b0682d9": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x02466e547bfdab679fc49e96bbfc62b9747d997c": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x6b76f8b1e9e59913bfe758821887311ba1805cab": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xa64523ced8a5f43b79f1f0fe88d1ad28a13de7f9": { label:"Coinbase",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xf6874c88757a0e4b0f5c3e8c09c1b7a6e2e4b3d1": { label:"Kraken",                 type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": { label:"Kraken",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13": { label:"Kraken",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xe853c56864a2ebe4576a807d26fdc4a0ada51919": { label:"Kraken",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": { label:"Kraken",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xfa52274dd61e1643d2205169732f29114bc240b3": { label:"Kraken",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x53d284357ec70ce289d6d64134dfac8e511c8a3d": { label:"Kraken Cold Wallet",      type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x89e51fa8ca5d66cd220baed62ed01e8951aa7c40": { label:"Kraken Wallet",           type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xc6bed363b30df7f35b601a5547fe56cd31ec63da": { label:"Huobi",                   type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xadb2b42f6bd96f5c65920b9ac88619dce4166f94": { label:"Huobi",                   type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x1062a747393198f70f71ec65a582423dba7e5ab3": { label:"Huobi",                   type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xeee28d484628d41a82d01e21d12e2e78d69920da": { label:"Huobi",                   type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xab5c66752a9e8167967685f1450532fb96d5d24f": { label:"Huobi",                   type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x32598293906b5b17c27d657db3ad5e7f9a409079": { label:"OKX",                     type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": { label:"OKX Hot Wallet",          type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x236f9f97e0e62388479bf9e5ba4889e46b0273c3": { label:"Bitfinex",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f": { label:"Bitfinex",                type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0xd24400ae8bfebb18ca49be86258a3c749cf46853": { label:"Gemini",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x07ee55aa48bb72dcc6e9d78256648910de513eca": { label:"Gemini",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  "0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea": { label:"Gemini",                  type:"exchange", risk:0,   icon:"🏦", verified:true },
  // ── DEX / DeFi Protocols (RISK=0, legitimate) ────────────────
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { label:"Uniswap V2 Router",       type:"defi",     risk:0,   icon:"🦄", verified:true },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { label:"Uniswap V3 Router",       type:"defi",     risk:0,   icon:"🦄", verified:true },
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { label:"Uniswap V3 Router 2",     type:"defi",     risk:0,   icon:"🦄", verified:true },
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { label:"Uniswap (UNI Token)",     type:"defi",     risk:0,   icon:"🦄", verified:true },
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": { label:"SushiSwap Router",        type:"defi",     risk:0,   icon:"🍣", verified:true },
  "0x00000000219ab540356cbb839cbe05303d7705fa": { label:"ETH2 Deposit Contract",   type:"contract", risk:0,   icon:"📋", verified:true },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { label:"WETH Contract",           type:"contract", risk:0,   icon:"📋", verified:true },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { label:"USDC Token Contract",     type:"contract", risk:0,   icon:"💵", verified:true },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { label:"USDT Token Contract",     type:"contract", risk:0,   icon:"💵", verified:true },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { label:"DAI Token Contract",      type:"contract", risk:0,   icon:"💵", verified:true },
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD": { label:"Uniswap Universal Router",type:"defi",    risk:0,   icon:"🦄", verified:true },
  // ── Bridges ──────────────────────────────────────────────────
  "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": { label:"Optimism Bridge",         type:"bridge",   risk:0,   icon:"🌉", verified:true },
  "0x8eb8a3b98659cce290402893d0123abb75e3ab28": { label:"Avalanche Bridge",        type:"bridge",   risk:0,   icon:"🌉", verified:true },
  "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf": { label:"Polygon Bridge",          type:"bridge",   risk:0,   icon:"🌉", verified:true },
  "0xa3a7b6f88361f48403514059f1f16c8e78d60eec": { label:"Arbitrum Bridge",         type:"bridge",   risk:0,   icon:"🌉", verified:true },
  // ── Burn Addresses ───────────────────────────────────────────
  "0x0000000000000000000000000000000000000000": { label:"Null Address (Burn)",      type:"burn",     risk:0,   icon:"🔥", verified:true },
  "0x000000000000000000000000000000000000dead": { label:"Dead Address (Burn)",      type:"burn",     risk:0,   icon:"🔥", verified:true },
  // ── Mixers / High Risk ───────────────────────────────────────
  "0x722122df12d4e14e13ac3b6895a86e84145b6967": { label:"Tornado Cash Router",     type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": { label:"Tornado Cash 0.1 ETH",    type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0xd96f2b1c14db8458374d9aca76e26c3950113463": { label:"Tornado Cash 1 ETH",      type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d": { label:"Tornado Cash 10 ETH",     type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { label:"Tornado Cash 100 ETH",    type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { label:"Tornado Cash 1000 ETH",   type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": { label:"Tornado Cash 100k DAI",   type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730": { label:"Tornado Cash 1M DAI",     type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x23773e65ed146a459667ad352c5abd8dcb4c4e73": { label:"Tornado Cash USDC",       type:"mixer",    risk:95,  icon:"🌪️", verified:true },
  "0x22aaa7720ddd5388a3c0a3333430953c68f1849b": { label:"Tornado Cash 3pool",      type:"mixer",    risk:95,  icon:"🌪️", verified:true },
};

// ── Risk Level Config ─────────────────────────────────────────
export const RISK_CONFIG = {
  CRITICAL: { min:81, max:100, color:"#ef4444", bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.3)",  label:"CRITICAL",  icon:"🚫" },
  HIGH:     { min:61, max:80,  color:"#f97316", bg:"rgba(249,115,22,0.08)", border:"rgba(249,115,22,0.25)", label:"HIGH",     icon:"⚠️" },
  MEDIUM:   { min:41, max:60,  color:"#eab308", bg:"rgba(234,179,8,0.08)",  border:"rgba(234,179,8,0.22)",  label:"MEDIUM",   icon:"🔶" },
  LOW:      { min:21, max:40,  color:"#60a5fa", bg:"rgba(96,165,250,0.07)", border:"rgba(96,165,250,0.2)",  label:"LOW",      icon:"🔷" },
  SAFE:     { min:0,  max:20,  color:"#10b981", bg:"rgba(16,185,129,0.07)", border:"rgba(16,185,129,0.2)",  label:"SAFE",     icon:"✅" },
};

export function getRiskLevel(score) {
  if (score >= 81) return RISK_CONFIG.CRITICAL;
  if (score >= 61) return RISK_CONFIG.HIGH;
  if (score >= 41) return RISK_CONFIG.MEDIUM;
  if (score >= 21) return RISK_CONFIG.LOW;
  return RISK_CONFIG.SAFE;
}

// ── Pattern Detection ─────────────────────────────────────────
export function detectPatterns(txHistory) {
  if (!txHistory || txHistory.length === 0) return {};
  const sorted = [...txHistory].filter(t => t.timestamp).sort((a,b) => a.timestamp - b.timestamp);

  // Rapid movement: tx within <6 hours of each other
  let rapidMovement = false;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = sorted[i+1].timestamp - sorted[i].timestamp;
    if (diff < 6 * 3600 * 1000) { rapidMovement = true; break; }
  }

  // Structuring: 3+ transactions with round ETH amounts
  const roundNums = txHistory.filter(tx => {
    const v = parseFloat(tx.value);
    return v > 0 && (v % 1 === 0 || v % 0.5 === 0) && v >= 1;
  });
  const structuring = roundNums.length >= 3;

  // Smurfing: many small transactions summing to large amount
  const smallTxs = txHistory.filter(tx => {
    const v = parseFloat(tx.value);
    return v > 0 && v < 1;
  });
  const smurfing = smallTxs.length >= 5;

  // New wallet
  const oldest = sorted[0]?.timestamp;
  const newWallet = oldest && (Date.now() - oldest.getTime() < 30 * 24 * 3600 * 1000);

  // Dormant wallet (no activity 180+ days)
  const newest = sorted[sorted.length - 1]?.timestamp;
  const dormant = newest && (Date.now() - newest.getTime() > 180 * 24 * 3600 * 1000);

  // High frequency (10+ tx in same day)
  const dayGroups = {};
  txHistory.forEach(tx => {
    if (tx.timestamp) {
      const day = tx.timestamp.toDateString();
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    }
  });
  const highFrequency = Object.values(dayGroups).some(c => c >= 10);

  return { rapidMovement, structuring, smurfing, newWallet, dormant, highFrequency };
}

// ── Main Risk Scorer ──────────────────────────────────────────
export function scoreAddress(address, txHistory = []) {
  const addr = (address || "").toLowerCase().trim();
  const flags = [];
  let score = 0;

  // 1. OFAC Sanctions (CRITICAL — hard 100)
  const sanction = OFAC_SANCTIONS[addr];
  if (sanction) {
    return {
      score: 100,
      flags: [{ level:"CRITICAL", msg:`OFAC SANCTIONED: ${sanction.entity} — Program: ${sanction.program} (${sanction.date})`, icon:"🚫", detail:sanction.note }],
      entity: KNOWN_ENTITIES[addr] || { label:sanction.entity, type:"sanctioned", risk:100, icon:"🚫" },
    };
  }

  // 2. Known entity
  const entity = KNOWN_ENTITIES[addr];
  if (entity) {
    if (entity.risk >= 80) {
      score = Math.max(score, entity.risk);
      flags.push({ level:"HIGH", msg:`Known ${entity.type}: ${entity.label}`, icon:entity.icon });
    } else if (entity.risk === 0) {
      flags.push({ level:"SAFE", msg:`Verified ${entity.type}: ${entity.label}`, icon:entity.icon });
    }
  }

  // 3. Interactions with sanctioned / mixer addresses
  if (txHistory.length > 0) {
    const badCounterparties = new Map();
    txHistory.forEach(tx => {
      ["from","to"].forEach(field => {
        const cp = tx[field]?.toLowerCase();
        if (!cp || cp === addr) return;
        const s = OFAC_SANCTIONS[cp];
        const e = KNOWN_ENTITIES[cp];
        if (s) badCounterparties.set(cp, { name:s.entity, severity:"CRITICAL", icon:"🚫" });
        else if (e?.risk >= 80) badCounterparties.set(cp, { name:e.label, severity:e.type==="mixer"?"HIGH":"HIGH", icon:e.icon });
      });
    });

    if (badCounterparties.size > 0) {
      const mixerHits  = [...badCounterparties.values()].filter(b => b.severity === "HIGH" || b.severity === "CRITICAL");
      const sanctioned = [...badCounterparties.values()].filter(b => b.severity === "CRITICAL");
      if (sanctioned.length > 0) {
        score = Math.max(score, 85);
        flags.push({ level:"CRITICAL", msg:`Transacted with ${sanctioned.length} OFAC-sanctioned address(es): ${sanctioned.map(b=>b.name).join(", ")}`, icon:"🚫" });
      } else if (mixerHits.length > 0) {
        score = Math.max(score, 70 + Math.min(mixerHits.length * 3, 15));
        flags.push({ level:"HIGH", msg:`Interacted with ${mixerHits.length} high-risk address(es): ${mixerHits.map(b=>b.name).slice(0,3).join(", ")}`, icon:"⚠️" });
      }
    }

    // 4. Behavioral patterns
    const patterns = detectPatterns(txHistory);
    if (patterns.rapidMovement) {
      score = Math.max(score, Math.min(score + 18, 65));
      flags.push({ level:"MEDIUM", msg:"Rapid fund movement — transactions within 6 hours (potential layering)", icon:"⚡" });
    }
    if (patterns.structuring) {
      score = Math.max(score, Math.min(score + 12, 55));
      flags.push({ level:"MEDIUM", msg:"Structuring pattern — multiple round-number transactions detected", icon:"🔢" });
    }
    if (patterns.smurfing) {
      score = Math.max(score, Math.min(score + 15, 60));
      flags.push({ level:"MEDIUM", msg:"Potential smurfing — 5+ small sub-threshold transactions", icon:"🔹" });
    }
    if (patterns.highFrequency) {
      score = Math.max(score, Math.min(score + 10, 50));
      flags.push({ level:"LOW", msg:"High-frequency activity — 10+ transactions in a single day", icon:"📈" });
    }
    if (patterns.newWallet) flags.push({ level:"INFO", msg:"Wallet created less than 30 days ago", icon:"🆕" });
    if (patterns.dormant)   flags.push({ level:"INFO", msg:"Wallet dormant for 6+ months", icon:"💤" });
  }

  // No flags = clean
  if (flags.length === 0) {
    flags.push({ level:"SAFE", msg:"No risk indicators detected — address appears clean", icon:"✅" });
  }

  return { score, flags, entity: entity || null };
}

// ── OSINT API Functions ────────────────────────────────────────
const ft = (url, opts={}, ms=9000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, {...opts, signal:c.signal}).finally(() => clearTimeout(t));
};

export async function fetchBalance(chainUrl, address) {
  try {
    const r = await ft(`${chainUrl}?module=account&action=balance&address=${address}&tag=latest`);
    const d = await r.json();
    if (d.status === "1") return d.result;
    return null;
  } catch { return null; }
}

export async function fetchTokenTransfers(chainUrl, chainExplorer, chainColor, chainName, chainSymbol, address) {
  try {
    const r = await ft(`${chainUrl}?module=account&action=tokentx&address=${address}&sort=desc&page=1&offset=20`);
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    return d.result.slice(0, 20).map(tx => {
      const decimals = parseInt(tx.tokenDecimal) || 18;
      const rawVal   = parseInt(tx.value || "0");
      const value    = rawVal > 0 ? (rawVal / Math.pow(10, decimals)).toFixed(4) + " " + tx.tokenSymbol : "0 " + tx.tokenSymbol;
      return {
        hash: tx.hash,
        from: tx.from, to: tx.to,
        tokenName: tx.tokenName || "Unknown Token",
        tokenSymbol: tx.tokenSymbol || "?",
        tokenAddress: tx.contractAddress,
        value, rawValue: rawVal,
        timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000) : null,
        status: "Success",
        type: "Token Transfer",
        chain: chainName, chainColor,
        explorerUrl: chainExplorer + tx.hash,
      };
    });
  } catch { return []; }
}

export async function fetchCurrentPrice(symbol) {
  const coinMap = { ETH:"ethereum", BTC:"bitcoin", BNB:"binancecoin", SOL:"solana", TRX:"tron", POL:"matic-network", SepoliaETH:"ethereum" };
  const coinId = coinMap[symbol];
  if (!coinId) return null;
  try {
    const r = await ft(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {}, 6000);
    const d = await r.json();
    return d[coinId]?.usd || null;
  } catch { return null; }
}

// ── Report Export ──────────────────────────────────────────────
export function exportTxtReport({ address, chain, risk, stats, transactions, tokenTxs, generatedAt }) {
  const sep = "═".repeat(60);
  const line = "─".repeat(60);
  const rl = getRiskLevel(risk.score);
  const lines = [
    sep,
    "        NSTCRYPTO — BLOCKCHAIN INTELLIGENCE REPORT",
    sep,
    `Generated : ${generatedAt || new Date().toISOString()}`,
    `Address   : ${address}`,
    `Chain     : ${chain}`,
    `Tool      : NSTCrypto (nstcrypto — Nishan Sapkota)`,
    "",
    line,
    "  RISK ASSESSMENT",
    line,
    `  Risk Score : ${risk.score}/100  [${rl.label}]`,
    `  Entity     : ${risk.entity ? risk.entity.label : "Unknown / Unclassified"}`,
    "",
    "  Flags:",
    ...risk.flags.map(f => `    [${f.level.padEnd(8)}] ${f.icon}  ${f.msg}`),
    "",
    line,
    "  ADDRESS STATISTICS",
    line,
    `  Balance          : ${stats?.balance || "N/A"}`,
    `  USD Value        : ${stats?.usdValue || "N/A"}`,
    `  Total Txns       : ${stats?.txCount || transactions?.length || "N/A"}`,
    `  First Seen       : ${stats?.firstSeen || "N/A"}`,
    `  Last Active      : ${stats?.lastActive || "N/A"}`,
    `  Unique Partners  : ${stats?.uniqueCounterparties || "N/A"}`,
    "",
    line,
    `  NATIVE TRANSACTIONS (${transactions?.length || 0})`,
    line,
    ...(transactions||[]).map(tx =>
      `  ${(tx.timestamp?.toISOString()||"Unknown date").slice(0,19)}  |  ${(tx.from||"").slice(0,10)}… → ${(tx.to||"").slice(0,10)}…  |  ${tx.value||"?"}  |  ${tx.status||"?"}`
    ),
    "",
    line,
    `  TOKEN TRANSFERS (${tokenTxs?.length || 0})`,
    line,
    ...(tokenTxs||[]).map(tx =>
      `  ${(tx.timestamp?.toISOString()||"Unknown date").slice(0,19)}  |  ${(tx.from||"").slice(0,10)}… → ${(tx.to||"").slice(0,10)}…  |  ${tx.value||"?"}  |  ${tx.tokenName||"?"}`
    ),
    "",
    sep,
    "  DISCLAIMER: This report is generated from public blockchain",
    "  data. Verify all findings independently before legal action.",
    "  Data sources: Blockscout, CoinGecko (public APIs).",
    sep,
  ];
  const blob = new Blob([lines.join("\n")], { type:"text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `intel_${address.slice(0,10)}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Bitcoin balance (satoshis as string) ──────────────────────
export async function fetchBtcBalance(address) {
  try {
    const r = await ft(`https://blockstream.info/api/address/${address}`, {}, 9000);
    if (!r.ok) return null;
    const d = await r.json();
    const bal = (d.chain_stats?.funded_txo_sum || 0) - (d.chain_stats?.spent_txo_sum || 0);
    return bal.toString();
  } catch { return null; }
}

// ── Solana balance (lamports as string) ───────────────────────
const SOL_RPC_URLS = ["https://api.mainnet-beta.solana.com","https://rpc.ankr.com/solana","https://solana.public-rpc.com"];
export async function fetchSolBalance(address) {
  for (const url of SOL_RPC_URLS) {
    try {
      const r = await ft(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getBalance",params:[address]}) }, 11000);
      const d = await r.json();
      if (d.result?.value !== undefined) return String(d.result.value);
    } catch {}
  }
  return null;
}

// ── Tron balance (sun as string) ──────────────────────────────
export async function fetchTronBalance(address) {
  try {
    const r = await ft(`https://api.trongrid.io/v1/accounts/${address}`, { headers:{"TRON-PRO-API-KEY":""} }, 10000);
    if (!r.ok) return null;
    const d = await r.json();
    const bal = d.data?.[0]?.balance ?? 0;
    return String(bal);
  } catch { return null; }
}

export function exportCsv(transactions, address) {
  const rows = [
    ["Hash","From","To","Value","Token","Timestamp","Status","Chain","Type","ExplorerURL"],
    ...(transactions||[]).map(tx => [
      tx.hash||"", tx.from||"", tx.to||"",
      tx.value||"", tx.tokenSymbol||"ETH",
      tx.timestamp?.toISOString()||"",
      tx.status||"", tx.chain||"", tx.type||"",
      tx.explorerUrl||"",
    ])
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `txns_${address.slice(0,10)}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
