// 消息中心 （发布订阅）
const Events = new Map<string, Set<Function>>()

export type Events = {
  reGenMsg: (id: string) => void // 告知 Chat 页面重新生成答案
  editUserMsg: (content: string, id: string) => void // 告知 Chat 页面修改用户的信息
}
export const event = {
  on<T extends keyof Events>(event: T, callback: Events[T]) {
    if (!Events.has(event)) {
      Events.set(event, new Set())
    }
    Events.get(event)!.add(callback)
  },
  off<T extends keyof Events>(event: T, callback: Events[T]) {
    if (Events.has(event)) {
      Events.get(event)!.delete(callback)
    }
  },
  emit<T extends keyof Events>(event: T, ...args: Parameters<Events[T]>) {
    if (Events.has(event)) {
      for (const callback of Events.get(event)!) {
        callback(...args)
      }
    }
  }
}