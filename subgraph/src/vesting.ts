import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  VestingCancelled,
  VestingCreated,
  VestingRevoked,
  VestingWithdrawn,
} from "../generated/ConfidentialVestingVault/ConfidentialVestingVault";
import { Vesting, VestingEvent } from "../generated/schema";

function createVestingEvent(
  vestingId: BigInt,
  eventType: string,
  event: ethereum.Event,
  amountHandle: Bytes | null
): void {
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const entity = new VestingEvent(id);
  entity.vesting = Bytes.fromByteArray(Bytes.fromBigInt(vestingId));
  entity.eventType = eventType;
  entity.actor = event.transaction.from;
  entity.amountHandle = amountHandle;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.txHash = event.transaction.hash;
  entity.save();
}

function updateMeta(vesting: Vesting, event: ethereum.Event): void {
  vesting.updatedAtBlock = event.block.number;
  vesting.updatedAtTimestamp = event.block.timestamp;
  vesting.updatedTxHash = event.transaction.hash;
}

export function handleVestingCreated(event: VestingCreated): void {
  const vestingIdBytes = Bytes.fromByteArray(Bytes.fromBigInt(event.params.vestingId));
  const vesting = new Vesting(vestingIdBytes);
  vesting.sponsor = event.params.sponsor;
  vesting.beneficiary = event.params.beneficiary;
  vesting.start = event.params.start;
  vesting.cliff = event.params.cliff;
  vesting.duration = event.params.duration;
  vesting.initialUnlockBps = event.params.initialUnlockBps;
  vesting.cancelable = event.params.cancelable;
  vesting.revoked = false;
  vesting.revokedAt = BigInt.zero();
  vesting.totalAmountHandle = event.params.totalAmountHandle;
  vesting.releasedHandle = Bytes.empty();
  vesting.createdAtBlock = event.block.number;
  vesting.createdAtTimestamp = event.block.timestamp;
  vesting.createdTxHash = event.transaction.hash;
  updateMeta(vesting, event);
  vesting.save();

  createVestingEvent(event.params.vestingId, "VestingCreated", event, event.params.totalAmountHandle);
}

export function handleVestingWithdrawn(event: VestingWithdrawn): void {
  const vesting = Vesting.load(Bytes.fromByteArray(Bytes.fromBigInt(event.params.vestingId)));
  if (vesting == null) return;

  vesting.releasedHandle = event.params.amountHandle;
  updateMeta(vesting, event);
  vesting.save();

  createVestingEvent(event.params.vestingId, "VestingWithdrawn", event, event.params.amountHandle);
}

export function handleVestingCancelled(event: VestingCancelled): void {
  const vesting = Vesting.load(Bytes.fromByteArray(Bytes.fromBigInt(event.params.vestingId)));
  if (vesting == null) return;

  vesting.revoked = true;
  vesting.revokedAt = event.block.timestamp;
  updateMeta(vesting, event);
  vesting.save();

  createVestingEvent(event.params.vestingId, "VestingCancelled", event, event.params.refundedAmountHandle);
}

export function handleVestingRevoked(event: VestingRevoked): void {
  const vesting = Vesting.load(Bytes.fromByteArray(Bytes.fromBigInt(event.params.vestingId)));
  if (vesting == null) return;

  vesting.revoked = true;
  vesting.revokedAt = event.block.timestamp;
  updateMeta(vesting, event);
  vesting.save();

  createVestingEvent(event.params.vestingId, "VestingRevoked", event, null);
}
