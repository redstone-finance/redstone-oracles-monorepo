const BATCH_VERSION = 0x01;
const HEADER_BYTES = 5;
const FRAME_OVERHEAD_BYTES = 6;
export const MAX_BATCH_BODY_BYTES = 2 * 1024 * 1024;

export interface BatchFrame {
  topicBytes: Buffer;
  dataB64: Buffer;
}

function frameSize(frame: BatchFrame): number {
  return FRAME_OVERHEAD_BYTES + frame.topicBytes.length + frame.dataB64.length;
}

export function* lazyBatches<P>(
  payloads: Iterable<P>,
  toFrame: (p: P) => BatchFrame,
  maxBodyBytes = MAX_BATCH_BODY_BYTES
): Generator<BatchFrame[]> {
  let current: BatchFrame[] = [];
  let currentSize = HEADER_BYTES;

  for (const payload of payloads) {
    const frame = toFrame(payload);
    const size = frameSize(frame);

    if (size > maxBodyBytes - HEADER_BYTES) {
      throw new Error(`frame exceeds max batch body: ${size + HEADER_BYTES} > ${maxBodyBytes}`);
    }

    if (current.length > 0 && currentSize + size > maxBodyBytes) {
      yield current;
      current = [];
      currentSize = HEADER_BYTES;
    }

    current.push(frame);
    currentSize += size;
  }

  if (current.length > 0) {
    yield current;
  }
}

export function buildBatchBody(frames: BatchFrame[]): Buffer {
  const totalSize = frames.reduce((sum, frame) => sum + frameSize(frame), HEADER_BYTES);
  const buf = Buffer.allocUnsafe(totalSize);

  let offset = 0;
  buf.writeUInt8(BATCH_VERSION, offset);
  offset += 1;
  buf.writeUInt32LE(frames.length, offset);
  offset += 4;

  for (const { topicBytes, dataB64 } of frames) {
    buf.writeUInt16LE(topicBytes.length, offset);
    offset += 2;

    topicBytes.copy(buf, offset);
    offset += topicBytes.length;

    buf.writeUInt32LE(dataB64.length, offset);
    offset += 4;

    dataB64.copy(buf, offset);
    offset += dataB64.length;
  }

  return buf;
}
