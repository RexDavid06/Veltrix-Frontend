import React from 'react'
import Hero from './Hero'
import TickerStrip from './TickerStrip'
import MarketsSection from './MarketsSection'
import FeatureBand from './FeatureBand'
import AccountsSection from './AccountsSection'
import EducationSection from './EducationSection'
import SupportCTA from './SupportCTA'

export default function Landing({ onNavigate, quotes = [], token }) {
  return (
    <>
      <Hero onNavigate={onNavigate} token={token} />
      <TickerStrip quotes={quotes} />
      <MarketsSection onNavigate={onNavigate} quotes={quotes} />
      <FeatureBand onNavigate={onNavigate} />
      <AccountsSection onNavigate={onNavigate} token={token} />
      <EducationSection />
      <SupportCTA onNavigate={onNavigate} token={token} />
    </>
  )
}
