# @jaune-sql/parse-query

```ts
import { infer, parse, QueryKind, ColumnKind } from '@jaune-sql/parse-query/lib/postgresql'

// parse string
const parsed = parse('SELECT lemme FROM lemmes WHERE lemme LIMIT 10')

const parsed = {
  kind: QueryKind.SELECT,
  columns: [
    {
      kind: ColumnKind.REF,
      alias: undefined,
      name: 'lemme',
      schema: 'public',
      table: 'lemmes',
    }
  ]
}

// infer type
const inferred = infer(introception, parsed)

const inferred = {
  kind: QueryKind.SELECT,
  columns: [
    {
      kind: ColumnKind.REF,
      alias: undefined,
      name: 'lemme',
      schema: 'public',
      table: 'lemmes',
      type: {
        kind: TypeKind.CHARACTER_VARYING,
        length: 128
      }
    }
  ]
}

```

## Limitations

- only `SELECT` queries are supported
- multipe queries are not supported
