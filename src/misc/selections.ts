import {GraphQLResolveInfo, Kind, SelectionNode} from 'graphql';

export function flatSelections(info: GraphQLResolveInfo): string[] {
  const r: string[] = [];
  for (const fieldNode of info.fieldNodes) {
    const selectionSet = fieldNode.selectionSet;
    if (selectionSet !== undefined) {
      walk(selectionSet.selections, r, '');
    }
  }

  return r;
}

function walk(nodes: readonly SelectionNode[], r: string[], prefix: string) {
  for (const s of nodes) {
    if (s.kind === Kind.FIELD) {
      const name = prefix + s.name.value;
      r.push(name);
      const selectionSet = s.selectionSet;
      if (selectionSet !== undefined) {
        walk(selectionSet.selections, r, name + '.');
      }
    }
  }
}
