import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import ReactMarkdown from 'react-markdown'
import type { FormEmail } from '../types/payload'
import { buildStandardEmailHtml, type EmailTemplateField } from '../lib/emailTemplate'
import './EmailBuilderCard.css'

function insertAtCursor(
  text: string,
  before: string,
  after: string,
  start: number,
  end: number
): { newValue: string; newStart: number; newEnd: number } {
  const head = text.slice(0, start)
  const tail = text.slice(end)
  const selected = text.slice(start, end)
  const newValue = head + before + selected + after + tail
  const newStart = start + before.length
  const newEnd = newStart + selected.length
  return { newValue, newStart, newEnd }
}

interface EmailBuilderCardProps {
  email: FormEmail
  index: number
  fieldOptions: EmailTemplateField[]
  sourceFormTitle?: string
  onChange: (email: FormEmail) => void
  onRemove: () => void
}

export default function EmailBuilderCard({
  email,
  index,
  fieldOptions,
  sourceFormTitle,
  onChange,
  onRemove,
}: EmailBuilderCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showFieldMenu, setShowFieldMenu] = useState(false)
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const body = email.messageText ?? ''
  const isHtml = email.messageFormat === 'html'

  const generateTemplate = () => {
    const html = buildStandardEmailHtml(sourceFormTitle ?? 'Form submission', fieldOptions)
    onChange({ ...email, messageText: html, messageFormat: 'html' })
    setConvertSuccess('Standard template generated from selected form fields.')
    return html
  }

  const handleGenerateTemplate = () => {
    generateTemplate()
  }

  useEffect(() => {
    if (!showFieldMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowFieldMenu(false)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [showFieldMenu])

  const insertPlaceholder = (fieldName: string) => {
    const placeholder = `{{${fieldName}}}`
    const el = textareaRef.current
    const pos = el ? el.selectionStart : body.length
    const newValue = body.slice(0, pos) + placeholder + body.slice(pos)
    onChange({ ...email, messageText: newValue })
    setShowFieldMenu(false)
    if (el) {
      el.focus()
      const newPos = pos + placeholder.length
      requestAnimationFrame(() => el.setSelectionRange(newPos, newPos))
    }
  }

  const applyFormat = (before: string, after: string = before) => {
    const el = textareaRef.current
    if (!el) {
      onChange({ ...email, messageText: body + before + after })
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const { newValue, newStart, newEnd } = insertAtCursor(body, before, after, start, end)
    onChange({ ...email, messageText: newValue })
    el.focus()
    requestAnimationFrame(() => el.setSelectionRange(newStart, newEnd))
  }

  const insertLine = (prefix: string) => {
    const el = textareaRef.current
    const pos = el ? el.selectionStart : body.length
    const lines = body.slice(0, pos).split('\n')
    const currentLine = lines[lines.length - 1] ?? ''
    const newLine = currentLine.trimStart() ? `\n${prefix} ` : `${prefix} `
    const newValue = body.slice(0, pos) + newLine + body.slice(pos)
    onChange({ ...email, messageText: newValue })
    if (el) {
      el.focus()
      const newPos = pos + newLine.length
      requestAnimationFrame(() => el.setSelectionRange(newPos, newPos))
    }
  }

  return (
    <div className="email-builder-card">
      <div className="email-builder-card__header">
        <span className="email-builder-card__title">Email {index + 1}</span>
        <button type="button" className="app-button--ghost email-builder-card__remove" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="email-builder-card__body">
        <div className="email-builder-card__fields">
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">To</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.emailTo}
              onChange={(e) => onChange({ ...email, emailTo: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">From (optional)</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.emailFrom}
              onChange={(e) => onChange({ ...email, emailFrom: e.target.value })}
              placeholder="sender@example.com"
            />
          </div>
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">Subject</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.subject}
              onChange={(e) => onChange({ ...email, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">CC (optional)</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.cc ?? ''}
              onChange={(e) => onChange({ ...email, cc: e.target.value })}
              placeholder="cc@example.com"
            />
          </div>
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">BCC (optional)</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.bcc ?? ''}
              onChange={(e) => onChange({ ...email, bcc: e.target.value })}
              placeholder="bcc@example.com"
            />
          </div>
          <div className="email-builder-card__row">
            <label className="email-builder-card__label">Reply-to (optional)</label>
            <input
              type="text"
              className="app-input email-builder-card__input"
              value={email.replyTo ?? ''}
              onChange={(e) => onChange({ ...email, replyTo: e.target.value })}
              placeholder="reply@example.com"
            />
          </div>
          <div className="email-builder-card__message-wrap">
            <div className="email-builder-card__message-head">
              <label className="email-builder-card__label">
                Message body ({isHtml ? 'HTML' : 'Markdown'})
              </label>
              <div className="email-builder-card__mode-toggle">
                <button
                  type="button"
                  className={`email-builder-card__mode-btn ${!isHtml ? 'email-builder-card__mode-btn--active' : ''}`}
                  onClick={() => onChange({ ...email, messageFormat: 'markdown' })}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  className={`email-builder-card__mode-btn ${isHtml ? 'email-builder-card__mode-btn--active' : ''}`}
                  onClick={() => onChange({ ...email, messageFormat: 'html' })}
                >
                  HTML
                </button>
              </div>
            </div>
            {!isHtml && (
              <div className="email-builder-card__toolbar">
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => applyFormat('**', '**')} title="Bold">
                  <b>B</b>
                </button>
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => applyFormat('*', '*')} title="Italic">
                  <i>I</i>
                </button>
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => insertLine('#')} title="Heading 1">
                  H1
                </button>
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => insertLine('##')} title="Heading 2">
                  H2
                </button>
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => insertLine('-')} title="Bullet list">
                  •
                </button>
                <button type="button" className="email-builder-card__toolbar-btn" onClick={() => applyFormat('[', '](url)')} title="Link">
                  🔗
                </button>
              </div>
            )}
            <div className="email-builder-card__toolbar email-builder-card__toolbar--convert">
              <button
                type="button"
                className="email-builder-card__toolbar-btn email-builder-card__generate-btn"
                onClick={handleGenerateTemplate}
                disabled={fieldOptions.length === 0}
                title="Build a complete HTML template with all fields from the selected form."
              >
                Generate standard template
              </button>
              <div className="email-builder-card__insert-field-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="email-builder-card__toolbar-btn email-builder-card__insert-field-btn"
                  onClick={() => setShowFieldMenu((v) => !v)}
                  aria-expanded={showFieldMenu}
                >
                  Insert field placeholder
                </button>
                {showFieldMenu && (
                  <div className="email-builder-card__field-menu">
                    {fieldOptions.length === 0 ? (
                      <div className="email-builder-card__field-menu-empty">No form fields with a name yet. Add fields in Build form.</div>
                    ) : (
                      fieldOptions.map((opt, idx) => (
                        <button
                          key={`${opt.name}-${idx}`}
                          type="button"
                          className="email-builder-card__field-menu-item"
                          onClick={() => insertPlaceholder(opt.name)}
                        >
                          <code>{'{{' + opt.name + '}}'}</code>
                          {opt.label ? <span className="email-builder-card__field-menu-label">{opt.label}</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="email-builder-card__generator-note">
              Standard generation uses {fieldOptions.length} field{fieldOptions.length === 1 ? '' : 's'} from{' '}
              <strong>{sourceFormTitle?.trim() || 'current form'}</strong>.
            </p>
            {convertSuccess && (
              <div className="email-builder-card__convert-success" role="status">
                {convertSuccess}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="app-textarea email-builder-card__textarea"
              rows={isHtml ? 12 : 6}
              value={body}
              onChange={(e) => onChange({ ...email, messageText: e.target.value })}
              placeholder={isHtml ? 'Paste or type HTML. Use {{fieldName}} for form answers.' : 'Email content. Use **bold**, *italic*, # headings. Insert field placeholders below.'}
            />
          </div>
        </div>
        <div className="email-builder-card__preview">
          <div className="email-builder-card__preview-title">Preview</div>
          <div className="email-builder-card__preview-inner">
            <div className="email-builder-card__preview-meta">
              <div><strong>Subject:</strong> {email.subject || '(no subject)'}</div>
              <div><strong>From:</strong> {email.emailFrom || '(not set)'}</div>
              <div><strong>To:</strong> {email.emailTo || '(not set)'}</div>
            </div>
            <div className="email-builder-card__preview-body email-builder-card__preview-body--email">
              {body ? (
                isHtml ? (
                  <div
                    className="email-builder-card__preview-html"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(body, {
                        ADD_ATTR: ['target'],
                        ALLOWED_TAGS: ['h1','h2','h3','h4','p','br','strong','b','em','i','u','a','ul','ol','li','table','thead','tbody','tr','th','td','span','div','img'],
                        ALLOWED_ATTR: ['href','target','style','width','height','src','alt','cellpadding','cellspacing','border','colspan','rowspan'],
                      }),
                    }}
                  />
                ) : (
                  <ReactMarkdown>{body}</ReactMarkdown>
                )
              ) : (
                <span className="email-builder-card__preview-placeholder">Email body will appear here. Use {isHtml ? 'HTML and {{fieldName}}' : 'Markdown and Insert field'} for placeholders.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
