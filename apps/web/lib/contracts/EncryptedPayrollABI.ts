export const ENCRYPTED_PAYROLL_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidEmployee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRate",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEmployer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StreamAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StreamNotFound",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "StreamCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "rateHandle",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      }
    ],
    "name": "StreamCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "StreamPaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "StreamResumed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "amountHandle",
        "type": "bytes32"
      }
    ],
    "name": "StreamToppedUp",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "cancelStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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
      }
    ],
    "name": "computeStreamId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "internalType": "externalEuint64",
        "name": "encRatePerSecond",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "rateProof",
        "type": "bytes"
      },
      {
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      }
    ],
    "name": "createStream",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
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
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "encryptedBalanceOf",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "getStream",
    "outputs": [
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
        "internalType": "bytes32",
        "name": "rateHandle",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "internalType": "enum EncryptedPayroll.StreamStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "lastAccruedAt",
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
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "pauseStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "lookbackDays",
        "type": "uint256"
      }
    ],
    "name": "projectedIncome",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "resumeStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      }
    ],
    "name": "syncStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamId",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint128",
        "name": "encAmount",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "amountProof",
        "type": "bytes"
      }
    ],
    "name": "topUp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
