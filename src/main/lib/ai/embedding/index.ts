import { readFileSync } from 'fs'
import MemoryFragment from '../../../models/model'
import { createTreeFromMarkdown, getChunkFromNodes } from './splitter'
import { embedding } from './embedding'
import { getData, saveData, saveIndex } from '../../../models/memo'
import { ulid } from 'ulid'
import { createMemo } from '../../../models'

export interface EditFragmentOption {
  id: string
  fragment: MemoryFragment
  type: 'add' | 'remove'
  useLM: boolean
}

const fragmentsMap: {
  [key in string]: MemoryFragment[] | undefined
} = {}

let dataMap: {
  [key in string]:
    | { id: string; name: string; data: string; vectors: Float32Array[]; indexes: string[] }[]
    | undefined
} = {}

async function readFile(fragment: MemoryFragment): Promise<{
  suc: boolean
  content?: string
  reason?: string
}> {
  if (fragment.type !== 'md') {
    return { suc: false, reason: '不支持的文件类型' }
  }
  const content = readFileSync(fragment.from!)
  return { suc: true, content: content.toString() }
}

export async function editFragment(option: EditFragmentOption): Promise<{
  suc: boolean
  reason?: string
}> {
  if (option.type === 'add') {
    if (
      fragmentsMap[option.id] &&
      fragmentsMap[option.id]?.find((f) => f.name === option.fragment.name)
    ) {
      return { suc: false, reason: '已存在同名记忆片段' }
    } else {
      fragmentsMap[option.id] === undefined && (fragmentsMap[option.id] = [])
      const res = await readFile(option.fragment)
      if (!res.suc) return { suc: false, reason: res.reason }
      // memory
      const nodes = createTreeFromMarkdown(res.content)
      const chunks = await getChunkFromNodes(nodes, {
        chunkSize: 700,
        chunkOverlap: 2,
        useLM: option.useLM
      })
      for (let chunk of chunks) {
        const vectors: Float32Array[] = []
        for (let index of chunk.indexes) {
          const vector = await embedding(index.value)
          vectors.push(vector)
        }
        dataMap[option.id] === undefined && (dataMap[option.id] = [])
        dataMap[option.id]?.push({
          id: ulid(),
          name: option.fragment.name,
          data: chunk.document.content,
          vectors,
          indexes: chunk.indexes.map((index) => index.value)
        })
      }
      fragmentsMap[option.id]?.push(option.fragment)
    }
    return { suc: true }
  } else if (option.type === 'remove') {
    fragmentsMap[option.id] = fragmentsMap[option.id]?.filter(
      (fragment) => fragment.name !== option.fragment.name
    )
    dataMap[option.id] = dataMap[option.id]?.filter((index) => index.name !== option.fragment.name)
  }
  return { suc: false, reason: '未匹配到操作类型' }
}

export interface SaveMemoParams {
  id: string
  memoName: string
  introduce?: string
}
export async function saveMemo(params: SaveMemoParams) {
  const data = dataMap[params.id]
  const memoId = ulid()
  if (params.id === 'creating') {
    saveData(
      memoId,
      (data || []).map((item) => ({
        id: item.id,
        content: item.data,
        indexes: item.indexes,
        fileName: item.name
      }))
    )
    await saveIndex(
      memoId,
      (data || []).map((item) => ({
        id: item.id,
        vectors: item.vectors
      }))
    )
    createMemo({
      id: memoId,
      name: params.memoName,
      introduce: params.introduce,
      fragment: fragmentsMap[params.id] || []
    })
  }
  fragmentsMap[params.id] = undefined
  dataMap[params.id] = undefined
}

export interface GetMemoParams {
  id: string
  content: string
}
export function getMemo(data: GetMemoParams) {
  return getData(data)
}

export function cancelSaveMemo(id: string) {
  fragmentsMap[id] = undefined
  dataMap[id] = undefined
}