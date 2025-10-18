export const INCOME_ORACLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "contract EncryptedPayroll",
        "name": "_payroll",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidLookback",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lookbackDays",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "meetsHandle",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "tierHandle",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      }
    ],
    "name": "Attested",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "internalType": "externalEuint128",
        "name": "encThreshold",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "thresholdProof",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "lookbackDays",
        "type": "uint256"
      }
    ],
    "name": "attestMonthlyIncome",
    "outputs": [
      {
        "components": [
          {
            "internalType": "euint8",
            "name": "meetsFlag",
            "type": "uint256"
          },
          {
            "internalType": "euint8",
            "name": "tier",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "attestationId",
            "type": "bytes32"
          }
        ],
        "internalType": "struct IncomeOracle.EncryptedAttestation",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "payroll",
    "outputs": [
      {
        "internalType": "contract EncryptedPayroll",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
