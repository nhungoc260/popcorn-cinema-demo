import toast from 'react-hot-toast'

const active = new Set<string>()
const key = (msg: string, t: string) => `${t}:${msg.slice(0, 50)}`

export const showToast = {
  success: (msg: string) => {
    const id = key(msg, 's')
    if (active.has(id)) return
    active.add(id)
    toast.success(msg, { id })
    setTimeout(() => active.delete(id), 3500)
  },
  error: (msg: string) => {
    const id = key(msg, 'e')
    if (active.has(id)) return
    active.add(id)
    toast.error(msg, { id })
    setTimeout(() => active.delete(id), 4500)
  },
  info: (msg: string) => {
    const id = key(msg, 'i')
    if (active.has(id)) return
    active.add(id)
    toast(msg, { id })
    setTimeout(() => active.delete(id), 3500)
  },
}
