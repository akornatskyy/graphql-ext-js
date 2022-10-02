import {Connection, CursorPaging, OffsetPaging} from './types';

export class CursorConnection {
  constructor(private readonly prefix: string) {}

  fromSlice<T>(
    items: readonly T[],
    offset: number,
    totalCount: number,
  ): Connection<T> {
    const length = offset + items.length;
    return {
      edges: items.map((node, index) => ({
        cursor: this.offsetToCursor(offset + index),
        node,
      })),
      pageInfo: {
        endCursor: this.offsetToCursor(length - 1),
        hasNextPage: length < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: this.offsetToCursor(offset),
      },
      totalCount,
    };
  }

  fromArray<T>(items: readonly T[], paging: CursorPaging): Connection<T> {
    const totalCount = items.length;
    const [start, limit] = this.toOffsetPaging(paging, totalCount);
    const end = start + limit;
    return {
      edges: items.slice(start, end).map((node, index) => ({
        cursor: this.offsetToCursor(start + index),
        node,
      })),
      pageInfo: {
        endCursor: this.offsetToCursor(end - 1),
        hasNextPage: end < totalCount,
        hasPreviousPage: start > 0,
        startCursor: this.offsetToCursor(start),
      },
      totalCount,
    };
  }

  toOffsetPaging(paging: CursorPaging, totalCount: number): OffsetPaging {
    let offset = Math.max(
      paging.after ? this.cursorToOffset(paging.after) + 1 : 0,
      0,
    );
    let limit =
      Math.min(
        paging.before ? this.cursorToOffset(paging.before) : totalCount,
        totalCount,
      ) - offset;
    const {first, last} = paging;
    if (typeof first === 'number') {
      if (first <= 0) {
        throw new Error('Expected a value greater than zero for first');
      }

      if (first < limit) {
        limit = first;
      }
    }

    if (typeof last === 'number') {
      if (last <= 0) {
        throw new Error('Expected a value greater than zero for last');
      }

      if (last < limit) {
        offset += limit - last;
        limit = last;
      }
    }

    return [offset, limit];
  }

  offsetToCursor(offset: number): string {
    return Buffer.from(this.prefix + offset.toString(), 'utf8').toString(
      'base64url',
    );
  }

  cursorToOffset(cursor: string): number {
    const s = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!s.startsWith(this.prefix)) {
      throw new Error('Invalid cursor');
    }

    return Number.parseInt(s.slice(this.prefix.length));
  }
}
