import React from 'react'
import Hero from './Hero'
import TickerStrip from './TickerStrip'
import MarketsSection from './MarketsSection'
import FeatureBand from './FeatureBand'
import AccountsSection from './AccountsSection'
import EducationSection from './EducationSection'
import SupportCTA from './SupportCTA'

export default function Landing({ onNavigate }) {
  return (
    <>
      <Hero onNavigate={onNavigate} />
      <TickerStrip />
      <MarketsSection onNavigate={onNavigate} />
      <FeatureBand onNavigate={onNavigate} />
      <AccountsSection onNavigate={onNavigate} />
      <EducationSection />
      <SupportCTA onNavigate={onNavigate} />
    </>
  )
}
