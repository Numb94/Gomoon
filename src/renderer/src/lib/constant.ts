function stringError(err: Error) {
  return `\n\n出问题了 \n${err.name} \n${err.message}`
}

export function ErrorDict(err: Error): string {
  console.log('error', err)
  if (err.message.includes('AbortError') || err.name.includes('AbortError')) {
    return ' ⏹'
  } else if (
    err.message.includes('Request timed out.') ||
    err.name.includes('Request timed out.')
  ) {
    return '\n\n回答超时，请检查网络后重试'
  } else if (err.message.includes('401') || err.message.includes('Failed to fetch')) {
    return `密钥或BaseURL不正确。\n请点击${
      navigator.userAgent.includes('Mac') ? '右' : '左'
    }上角设置，进入设置页面进行设置。`
  } else if (err.message.includes('404')) {
    return `${stringError(err)}\n这通常是由于您未配置上述缺少的模型。`
  } else if (err.message.includes('maximum')) {
    return `${stringError(err)}\n这通常是由于您的总字数超过了模型的限制。`
  }
  return `${stringError(err)}`
}
