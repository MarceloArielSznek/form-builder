/**
 * Express backend for the form-builder app.
 * - POST /api/convert-email-to-html  → convert plain text to HTML via OpenAI
 *
 * Run from project root:  npm run dev:backend
 * Or from backend folder:  npm run dev
 * Requires backend/.env with OPENAI_API_KEY=sk-...
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const PORT = Number(process.env.PORT) || 3456
const MAX_TOKENS = Math.min(4096, Math.max(256, parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2048))

const SYSTEM_PROMPT = `You are an expert email template designer. Convert the given plain text email template into a full, professional email HTML with background, layout, and clear sections. NEVER return only a few <p> tags. Always produce a complete email shell.

CRITICAL – Preserve placeholders:
- Keep every {{placeholder}} EXACTLY as written (same spelling, same double curly braces). Do not change, remove, or add any {{...}}.

CRITICAL – Infer structure from the template:
- Read the template and identify what each part represents: greetings (Hello, Hi), fields (Date, Name, Email, etc.), and body content (notes, message, comments).
- Design the HTML to match: use a "Details" or "Summary" table for discrete fields (e.g. Date, Name), and a dedicated section with a heading for longer content (e.g. Notes, Message). Use section titles that fit the content (e.g. "Details", "Notes", "Message", "Summary").

REQUIRED layout (you MUST include all of these):
1. Outer wrapper: <table> with width="100%", style="background-color:#e5e5e5; font-family: Arial, sans-serif; padding: 24px 0". This is the page background.
2. Inner container: a <table> inside it with style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08)" (or similar). Use cellpadding="24" or equivalent padding via style.
3. Optional header bar: one row with a cell style="background-color: #4a5568; color: #ffffff; padding: 16px 24px; font-size: 18px; font-weight: bold" (e.g. "Message" or "Notification").
4. Content area: one or more rows with padding 24px.
   - For greeting + field-like placeholders: add a small two-column <table> (border-collapse: collapse, width 100%). First column: label cell with style="background-color: #f1f3f5; font-weight: bold; padding: 10px 14px; border: 1px solid #dee2e6; width: 35%". Second column: value cell with style="padding: 10px 14px; border: 1px solid #dee2e6" containing the {{placeholder}}. One row per field (e.g. Date → row "Date" / {{Date}}; if the text says "Hello {{Date}}" use a row like "Greeting" / "Hello" and "Date" / {{Date}}, or adapt so the greeting and date are both clearly presented).
   - For notes/message/body placeholders: add a section heading (e.g. <h3> or <p> with font-weight bold, margin 16px 0 8px, color #333) then a styled block for the content, e.g. <p> or <td> with style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 12px 16px; margin: 0 0 16px; line-height: 1.5; color: #333" containing the intro text and {{notes}} (or whatever placeholder).
5. Use consistent typography: font-size 14–16px for body, 16–18px for section headings, color #333 for text.

Use only inline styles. No <script>, no external CSS or images. Return ONLY the raw HTML string, no markdown code fence, no explanation.`

async function convertToHtml(message) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set. Add it in backend/.env')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || response.statusText)
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Unexpected response from AI')
  return content.trim().replace(/^```html?\s*|\s*```$/gi, '').trim()
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

app.post('/api/convert-email-to-html', async (req, res) => {
  const message = req.body?.message
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Body must include { "message": "your text here" }' })
  }
  try {
    const html = await convertToHtml(message)
    res.json({ html })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Conversion failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
  console.log(`  POST http://localhost:${PORT}/api/convert-email-to-html`)
  console.log(`  Model: ${OPENAI_MODEL}`)
  if (!OPENAI_API_KEY) console.warn('  WARNING: OPENAI_API_KEY not set. Add it in backend/.env')
})
