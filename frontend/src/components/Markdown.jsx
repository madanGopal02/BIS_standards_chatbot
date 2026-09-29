import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Safe Markdown renderer.
 *
 * `react-markdown` never renders raw HTML (no `rehype-raw` is used), so model
 * output cannot inject markup or scripts. Links are forced to open in a new
 * tab with `rel="noopener noreferrer"`, and unsafe URL schemes are stripped by
 * react-markdown's default `urlTransform`.
 */
export function Markdown({ children }) {
  if (!children) return null

  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
          ),
          table: ({ node, ...props }) => (
            <div className="markdown__table-wrap">
              <table {...props} />
            </div>
          ),
          code: ({ node, inline, className, ...props }) => {
            const language = /language-(\w+)/.exec(className || '')?.[1]
            if (inline || !language) {
              return <code className="markdown__code-inline" {...props} />
            }
            return (
              <code className={`markdown__code-block ${className || ''}`.trim()} {...props} />
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default Markdown
