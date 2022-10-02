export type OffsetPaging = [offset: number, limit: number];

export type CursorPaging = {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
};

export type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
};

export type Edge<T> = {
  cursor: string;
  node: T;
};

export type PageInfo = {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
};
