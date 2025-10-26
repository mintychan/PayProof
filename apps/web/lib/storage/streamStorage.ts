/**
 * Stream storage using localStorage to persist streamKeys
 * This allows us to find streams without scanning the entire blockchain
 */

const STORAGE_KEY_PREFIX = "payproof_streams_";

interface StoredStream {
  streamKey: string;
  employer: string;
  employee: string;
  createdAt: number;
  transactionHash: string;
}

/**
 * Get storage key for a specific address
 */
function getStorageKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`;
}

/**
 * Store a newly created stream
 */
export function storeStream(
  streamKey: string,
  employer: string,
  employee: string,
  transactionHash: string
): void {
  try {
    const stream: StoredStream = {
      streamKey,
      employer: employer.toLowerCase(),
      employee: employee.toLowerCase(),
      createdAt: Date.now(),
      transactionHash,
    };

    // Store for employer
    const employerStreams = getStreamsForAddress(employer);
    employerStreams.push(stream);
    localStorage.setItem(getStorageKey(employer), JSON.stringify(employerStreams));

    // Store for employee
    const employeeStreams = getStreamsForAddress(employee);
    employeeStreams.push(stream);
    localStorage.setItem(getStorageKey(employee), JSON.stringify(employeeStreams));

    console.log("Stored stream:", { streamKey, employer, employee });
  } catch (error) {
    console.error("Failed to store stream:", error);
  }
}

/**
 * Get all stored streams for an address
 */
export function getStreamsForAddress(address: string): StoredStream[] {
  try {
    const key = getStorageKey(address);
    const data = localStorage.getItem(key);
    if (!data) return [];

    const streams: StoredStream[] = JSON.parse(data);
    return streams;
  } catch (error) {
    console.error("Failed to get stored streams:", error);
    return [];
  }
}

/**
 * Get streamKeys for an address (just the keys)
 */
export function getStreamKeysForAddress(address: string): string[] {
  const streams = getStreamsForAddress(address);
  return streams.map(s => s.streamKey);
}

/**
 * Clear all stored streams for an address
 */
export function clearStreamsForAddress(address: string): void {
  try {
    localStorage.removeItem(getStorageKey(address));
    console.log("Cleared streams for:", address);
  } catch (error) {
    console.error("Failed to clear streams:", error);
  }
}

/**
 * Remove a specific stream from storage
 */
export function removeStream(streamKey: string, address: string): void {
  try {
    const streams = getStreamsForAddress(address);
    const filtered = streams.filter(s => s.streamKey !== streamKey);
    localStorage.setItem(getStorageKey(address), JSON.stringify(filtered));
    console.log("Removed stream:", streamKey);
  } catch (error) {
    console.error("Failed to remove stream:", error);
  }
}
