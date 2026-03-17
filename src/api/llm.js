// 开发环境通过 Vite proxy 转发以绕过 CORS，见 vite.config.js
const LLM_URL = '/llm-proxy/ai/service/llm_extraction'

export async function callLLM(prompt, markdown, pages) {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'qwen3.5-plus',
      ocr: { result: { markdown, pages } },
    }),
  })

  if (!response.ok) throw new Error(`LLM 请求失败: HTTP ${response.status}`)

  const json = await response.json()
  if (json.code !== 200) throw new Error(`LLM 错误: ${json.message}`)

  return {
    llm_json: json.result.llm_json,
    raw_json: json.result.raw_json,
  }
}

export function parseLLMJson(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    let s = String(raw).trim()
    s = s.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '')
    return JSON.parse(s)
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch (_) {} }
    return null
  }
}
