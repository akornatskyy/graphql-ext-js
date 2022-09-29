import {GraphQLResolveInfo, Kind} from 'graphql';

export function fields(info: GraphQLResolveInfo): string[] {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const set = info.fieldNodes[0].selectionSet!;
  const r = [];
  for (const s of set.selections) {
    if (s.kind === Kind.FIELD) {
      r.push(s.name.value);
    }
  }

  return r;
}
