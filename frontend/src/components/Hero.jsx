import { ArrowRight } from 'lucide-react'

import { APP_INFO, EXAMPLE_PROMPTS } from '../utils/constants'

/** Landing view shown when a conversation has no messages yet. */
export function Hero({ onSelectPrompt }) {
  return (
    <div className="hero">
      <div className="hero__inner">
        <span className="hero__eyebrow">{APP_INFO.subtitle}</span>
        <h1 className="hero__title">{APP_INFO.heroTitle}</h1>
        <p className="hero__subtitle">{APP_INFO.heroSubtitle}</p>
        <p className="hero__description">{APP_INFO.heroDescription}</p>

        <div className="hero__examples">
          <h2 className="hero__examples-title">Try one of these</h2>
          <ul className="prompt-grid">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button type="button" className="prompt-card" onClick={() => onSelectPrompt(prompt)}>
                  <span className="prompt-card__text">{prompt}</span>
                  <ArrowRight size={16} className="prompt-card__icon" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="hero__note">
          Educational answers only. Always verify compliance-critical details against the
          latest applicable BIS publication.
        </p>
      </div>
    </div>
  )
}

export default Hero
