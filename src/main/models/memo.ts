import { app } from 'electron'
import { join } from 'path'
import { JSONSyncPreset } from 'lowdb/node'
import { Connection, connect } from 'vectordb'
import { mkdirSync } from 'fs'
import { embedding } from '../lib/ai/embedding/embedding'

const appDataPath = app.getPath('userData')
const memoPath = join(appDataPath, 'memo')
let db: Connection | null = null

async function connectDB() {
  if (db) return
  db = await connect(join(memoPath))
}

mkdirSync(memoPath, { recursive: true })
// 这里的数据文件先使用
export function saveData(
  memoId: string,
  data: {
    fileName: string
    id: string
    content: string
    indexes: string[]
  }[]
) {
  const path = join(memoPath, memoId)
  const db = JSONSyncPreset<{
    [id: string]: {
      content: string
      indexes: string[]
      fileName: string
    }
  }>(path, {})
  data.forEach((d) => {
    db.data[d.id] = {
      content: d.content,
      fileName: d.fileName,
      indexes: d.indexes
    }
  })
  db.write()
}

export async function saveIndex(
  name: string,
  data: {
    id: string
    vectors: Float32Array[]
  }[]
) {
  await connectDB()
  const tables = await db!.tableNames()
  if (!tables.includes(name)) {
    const tableData = data.reduce(
      (
        arr: {
          id: string
          vector: Float32Array
        }[],
        item
      ) => {
        return arr.concat(
          item.vectors.map((vector) => ({
            id: item.id,
            vector: vector
          }))
        )
      },
      []
    )
    await db!.createTable(name, tableData)
    return
  }
  const table = await db!.openTable(name)
  table.add(data)
}

export async function getData(data: { id: string; content: string }): Promise<
  Array<{
    content: string
  }>
> {
  await connectDB()
  const tables = await db!.tableNames()
  if (!tables.includes(data.id)) {
    return []
  }
  const table = await db!.openTable(data.id)
  const indexes = await embedding(data.content)
  console.log('>>', indexes)
  const result = (await table
    .search(Array.from(indexes.map((index) => Number(index))))
    .limit(20)
    .execute()) as {
    id: string
  }[]
  const path = join(memoPath, data.id)
  const fileDB = JSONSyncPreset<{
    [id: string]: {
      content: string
      indexes: string[]
      fileName: string
    }
  }>(path, {})
  const contents: {
    content: string
  }[] = []
  result.forEach((item) => {
    if (contents.find((c) => c.content === fileDB.data[item.id]?.content) || contents.length >= 4)
      return
    contents.push({
      content: fileDB.data[item.id]?.content || ''
    })
  })
  return contents
}