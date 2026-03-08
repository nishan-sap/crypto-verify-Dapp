@echo off
REM ═══════════════════════════════════════════════════════════
REM  CryptoVerify — Cleanup Script
REM  Deletes auto-generated files only. Safe to run anytime.
REM  Run from project root:
REM    cd "H:\bsc project\cn6035 blockchain"
REM    CLEANUP.cmd
REM ═══════════════════════════════════════════════════════════

cd /d "H:\bsc project\cn6035 blockchain"

echo Cleaning auto-generated build outputs...

REM ── Hardhat artifacts (auto-rebuilt by: npx hardhat compile)
if exist artifacts\ (
    rmdir /s /q artifacts
    echo   [DELETED] artifacts\
)

REM ── Hardhat cache (auto-rebuilt)
if exist cache\ (
    rmdir /s /q cache
    echo   [DELETED] cache\
)

REM ── Frontend dist build (auto-rebuilt by: npm run build)
if exist frontend\dist\ (
    rmdir /s /q frontend\dist
    echo   [DELETED] frontend\dist\
)

REM ── Indexer output (auto-created at runtime by: node backend/indexer.js)
if exist data\ (
    rmdir /s /q data
    echo   [DELETED] data\
)

echo.
echo Done. The following are KEPT (required for assignment):
echo   backend\          - Express server + routes + indexer
echo   contracts\        - TransactionVerifier.sol + ReentrancyAttacker.sol
echo   docs\             - deployment.md (installation manual)
echo   frontend\         - React app (App.jsx, main.jsx, index.css, etc.)
echo   scripts\          - deploy.js + seed_contract.js
echo   test\             - 15 unit tests + 10 integration tests
echo   .gitignore        - excludes secrets and build outputs
echo   .prettierrc.json  - code formatting config
echo   .solhint.json     - Solidity linting rules
echo   eslint.config.js  - JS linting config
echo   hardhat.config.js - Hardhat + Sepolia network config
echo   package.json      - all npm scripts
echo   README.md         - project documentation
echo   docs\deployment.md - installation manual

echo.
pause
