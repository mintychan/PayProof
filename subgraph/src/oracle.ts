import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  PaidAmountUpdated,
  OutstandingRecorded,
  Attested,
} from "../generated/IncomeOracle/IncomeOracle";
import { Attestation, PaymentRecord, Stream } from "../generated/schema";

export function handlePaidAmountUpdated(event: PaidAmountUpdated): void {
  const streamKey = event.params.streamKey;
  const stream = Stream.load(streamKey);
  if (stream == null) return;

  let record = PaymentRecord.load(streamKey);
  if (record == null) {
    record = new PaymentRecord(streamKey);
    record.stream = streamKey;
  }
  record.amountHandle = event.params.amountHandle;
  record.lastUpdated = event.block.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
}

export function handleOutstandingRecorded(event: OutstandingRecorded): void {
  // Outstanding amounts are tracked on cancel - update the payment record
  const streamKey = event.params.streamKey;
  const stream = Stream.load(streamKey);
  if (stream == null) return;

  let record = PaymentRecord.load(streamKey);
  if (record == null) {
    record = new PaymentRecord(streamKey);
    record.stream = streamKey;
  }
  record.amountHandle = event.params.recipientAmountHandle;
  record.lastUpdated = event.block.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
}

export function handleAttested(event: Attested): void {
  const entityId = event.transaction.hash.concatI32(event.logIndex.toI32());
  const attestation = new Attestation(entityId);

  attestation.stream = event.params.streamId;
  attestation.employee = event.params.employee;
  attestation.lookbackDays = event.params.lookbackDays;
  attestation.meetsHandle = event.params.meetsHandle;
  attestation.tierHandle = event.params.tierHandle;
  attestation.attestationId = event.params.attestationId;
  attestation.blockNumber = event.block.number;
  attestation.timestamp = event.block.timestamp;
  attestation.txHash = event.transaction.hash;
  attestation.save();
}
