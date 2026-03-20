const TEXTIN_URL = 'https://api.textin.com/home/user_trial_ocr'

export async function parseDocumentWithTextIn(file) {
  const params = new URLSearchParams({
    service: 'pdf_to_markdown',
    page_start: '0',
    page_count: '200',
    dpi: '144',
    parse_mode: 'auto',
    table_flavor: 'html',
    apply_document_tree: '1',
    markdown_details: '1',
    page_details: '1',
    get_image: 'both',
  })

  const response = await fetch(`${TEXTIN_URL}?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Origin': 'https://www.textin.com',
    },
    body: await file.arrayBuffer(),
  })

  if (!response.ok) throw new Error(`文档解析失败: HTTP ${response.status}`)

  const rawJson = await response.json()
  const result = rawJson?.data?.result ?? rawJson?.data ?? {}
  return {
    markdown: result.markdown ?? '',
    pages: Array.isArray(result.pages) ? result.pages : [],
  }
}

export async function downloadPageImage(imageId) {
  const response = await fetch(
    `/textin-img/ocr_image/download?image_id=${encodeURIComponent(imageId)}`,
    { headers: { 'x-ti-app-id': 'user_trial' } }
  )
  if (!response.ok) throw new Error(`图像下载失败: HTTP ${response.status}`)
  const json = await response.json()
  const b64 = json?.data?.image
  if (!b64) throw new Error('图像数据为空')
  return `data:image/jpeg;base64,${b64}`
}
