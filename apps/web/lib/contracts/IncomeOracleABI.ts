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
    "inputs": [],
    "name": "UnauthorizedHookCaller",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "recipientAmountHandle",
        "type": "bytes32"
      }
    ],
    "name": "OutstandingRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "amountHandle",
        "type": "bytes32"
      }
    ],
    "name": "PaidAmountUpdated",
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
            "type": "bytes32"
          },
          {
            "internalType": "euint8",
            "name": "tier",
            "type": "bytes32"
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "encryptedOutstandingOnCancel",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "encryptedPaidAmount",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "lastCancellationTimestamp",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "lastPaymentTimestamp",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "recipientAmountHandle",
        "type": "bytes32"
      }
    ],
    "name": "onConfidentialLockupCancel",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "amountHandle",
        "type": "bytes32"
      }
    ],
    "name": "onConfidentialLockupWithdraw",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
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
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
] as const;
