import {CursorConnection, CursorPaging} from '../';

describe('relay cursor connection', () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const c = new CursorConnection('c:');

  it('forward first', () => {
    const r = c.fromArray(items, {first: 2});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzow",
            "node": 0,
          },
          {
            "cursor": "Yzox",
            "node": 1,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzox",
          "hasNextPage": true,
          "hasPreviousPage": false,
          "startCursor": "Yzow",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(0, 2), 0, 10));
  });

  it('forward next', () => {
    const r = c.fromArray(items, {after: c.offsetToCursor(1), first: 2});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzoy",
            "node": 2,
          },
          {
            "cursor": "Yzoz",
            "node": 3,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzoz",
          "hasNextPage": true,
          "hasPreviousPage": true,
          "startCursor": "Yzoy",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(2, 4), 2, 10));
  });

  it('forward last', () => {
    const r = c.fromArray(items, {after: c.offsetToCursor(7), first: 2});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzo4",
            "node": 8,
          },
          {
            "cursor": "Yzo5",
            "node": 9,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzo5",
          "hasNextPage": false,
          "hasPreviousPage": true,
          "startCursor": "Yzo4",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(8, 10), 8, 10));
  });

  it('backward last', () => {
    const r = c.fromArray(items, {last: 2});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzo4",
            "node": 8,
          },
          {
            "cursor": "Yzo5",
            "node": 9,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzo5",
          "hasNextPage": false,
          "hasPreviousPage": true,
          "startCursor": "Yzo4",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(8, 10), 8, 10));
  });

  it('backward previous', () => {
    const r = c.fromArray(items, {last: 2, before: c.offsetToCursor(8)});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzo2",
            "node": 6,
          },
          {
            "cursor": "Yzo3",
            "node": 7,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzo3",
          "hasNextPage": true,
          "hasPreviousPage": true,
          "startCursor": "Yzo2",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(6, 8), 6, 10));
  });

  it('backward first', () => {
    const r = c.fromArray(items, {last: 2, before: c.offsetToCursor(2)});
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzow",
            "node": 0,
          },
          {
            "cursor": "Yzox",
            "node": 1,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzox",
          "hasNextPage": true,
          "hasPreviousPage": false,
          "startCursor": "Yzow",
        },
        "totalCount": 10,
      }
    `);
    expect(r).toStrictEqual(c.fromSlice(items.slice(0, 2), 0, 10));
  });

  it('middle', () => {
    const r = c.fromArray(items, {
      after: c.offsetToCursor(2),
      before: c.offsetToCursor(7),
      first: 3,
      last: 2,
    });
    expect(r).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "cursor": "Yzo0",
            "node": 4,
          },
          {
            "cursor": "Yzo1",
            "node": 5,
          },
        ],
        "pageInfo": {
          "endCursor": "Yzo1",
          "hasNextPage": true,
          "hasPreviousPage": true,
          "startCursor": "Yzo0",
        },
        "totalCount": 10,
      }
    `);
  });

  it.each([
    [{}, 10, [0, 10]],
    [{first: 2}, 10, [0, 2]],
    [{first: 2, after: c.offsetToCursor(1)}, 10, [2, 2]],
    [{last: 2}, 10, [8, 2]],
    [{last: 2, before: c.offsetToCursor(8)}, 10, [6, 2]],
  ])(
    'to offset paging %s',
    (cp: CursorPaging, totalCount: number, expected: number[]) => {
      const r = c.toOffsetPaging(cp, totalCount);
      expect(r).toStrictEqual(expected);
    },
  );

  it.each([-2, -1, 0])('throws for first %s', (first) => {
    expect(() => c.toOffsetPaging({first}, 10)).toThrowError(/first/);
  });

  it.each([-2, -1, 0])('throws for last %s', (last) => {
    expect(() => c.toOffsetPaging({last}, 10)).toThrowError(/last/);
  });

  it('throws invalid cursor', () => {
    expect(() => c.cursorToOffset('abc')).toThrowError(/invalid/i);
  });
});
