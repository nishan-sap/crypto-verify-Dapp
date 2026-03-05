import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TransactionVerifierModule = buildModule("TransactionVerifierModule", (m) => {
  const verifier = m.contract("TransactionVerifier");
  return { verifier };
});

export default TransactionVerifierModule;