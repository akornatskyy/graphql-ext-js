import {GraphQLResolveInfo, Kind, SelectionNode} from 'graphql';

export function paths(info: GraphQLResolveInfo, separator: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return all(info.fieldNodes[0].selectionSet!.selections, separator);
}

function all(nodes: readonly SelectionNode[], separator: string): string[] {
  const r = [];
  for (const s of nodes) {
    if (s.kind === Kind.FIELD) {
      const selectionSet = s.selectionSet;
      if (selectionSet !== undefined) {
        const nested = all(selectionSet.selections, separator);
        const name = s.name.value;
        r.push(name, ...nested.map((n) => name + separator + n));
      } else {
        r.push(s.name.value);
      }
    }
  }

  return r;
}
