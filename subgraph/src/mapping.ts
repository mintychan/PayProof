import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import {
  StreamCancelled,
  StreamConfigured,
  StreamCreated,
  StreamHookUpdated,
  StreamPaused,
  StreamResumed,
  StreamSettled,
  StreamToppedUp,
  StreamWithdrawn,
} from "../generated/EncryptedPayroll/EncryptedPayroll";
import { Stream, StreamEvent } from "../generated/schema";

function createEventEntity(
  stream: Stream,
  eventType: string,
  event: ethereum.Event,
  counterparty: Address | null = null,
  amountHandle: Bytes | null = null
): void {
  const entityId = event.transaction.hash.concatI32(event.logIndex.toI32());
  const record = new StreamEvent(entityId);
  record.stream = stream.id;
  record.eventType = eventType;
  record.actor = event.transaction.from;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.txHash = event.transaction.hash;
  record.counterparty = counterparty;
  record.amountHandle = amountHandle;

  record.save();
}

function updateStreamMetadata(stream: Stream, eventBlock: BigInt, eventTimestamp: BigInt, txHash: Bytes): void {
  stream.updatedAtBlock = eventBlock;
  stream.updatedAtTimestamp = eventTimestamp;
  stream.updatedTxHash = txHash;
}

export function handleStreamCreated(event: StreamCreated): void {
  const stream = new Stream(event.params.streamKey);
  stream.numericId = event.params.streamId;
  stream.employer = event.params.employer;
  stream.employee = event.params.employee;
  stream.cadenceInSeconds = event.params.cadenceInSeconds;
  stream.startTime = event.params.startTime;
  stream.status = "ACTIVE";
  stream.cancelable = true;
  stream.transferable = true;
  stream.hook = Address.zero();
  stream.createdAtBlock = event.block.number;
  stream.createdAtTimestamp = event.block.timestamp;
  stream.createdTxHash = event.transaction.hash;
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamCreated", event);
}

export function handleStreamPaused(event: StreamPaused): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.status = "PAUSED";
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamPaused", event);
}

export function handleStreamResumed(event: StreamResumed): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.status = "ACTIVE";
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamResumed", event);
}

export function handleStreamCancelled(event: StreamCancelled): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.status = "CANCELLED";
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamCancelled", event);
}

export function handleStreamSettled(event: StreamSettled): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.status = "SETTLED";
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamSettled", event);
}

export function handleStreamConfigured(event: StreamConfigured): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.cancelable = event.params.cancelable;
  stream.transferable = event.params.transferable;
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamConfigured", event);
}

export function handleStreamHookUpdated(event: StreamHookUpdated): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  stream.hook = event.params.newHook;
  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamHookUpdated", event, event.params.newHook);
}

export function handleStreamToppedUp(event: StreamToppedUp): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamToppedUp", event, null, event.params.amountHandle);
}

export function handleStreamWithdrawn(event: StreamWithdrawn): void {
  const stream = Stream.load(event.params.streamKey);
  if (stream == null) return;

  updateStreamMetadata(stream, event.block.number, event.block.timestamp, event.transaction.hash);
  stream.save();

  createEventEntity(stream, "StreamWithdrawn", event, event.params.to, event.params.amountHandle);
}
