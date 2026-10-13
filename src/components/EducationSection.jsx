import React from 'react'

export default function EducationSection() {
  return (
    <section className="education-section" id="learn">
      <div className="section-wrap education-layout">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> KNOWLEDGE FIRST</div>
          <h2>Understand more.<br />Move with <span>care.</span></h2>
          <p>Financial markets involve risk. Build your understanding with clear educational content before making financial decisions.</p>
          <a className="text-link" href="#support">Explore learning resources <span>↗</span></a>
        </div>
        <div className="learning-cards">
          <article className="learn-card">
            <div className="learn-art art-one"><span>01</span><div className="art-lines" /></div>
            <div className="learn-meta">THE BASICS · 6 MIN READ</div>
            <h3>Getting to know the markets</h3>
            <p>A beginner-friendly overview of market types and common terminology.</p>
            <a href="#support" className="text-link">Read overview ↗</a>
          </article>
          <article className="learn-card">
            <div className="learn-art art-two"><span>02</span><div className="risk-dial">!</div></div>
            <div className="learn-meta">RISK AWARENESS · 4 MIN READ</div>
            <h3>Risk is part of the picture</h3>
            <p>Learn about volatility, leverage, and why losses are possible.</p>
            <a href="#support" className="text-link">Read overview ↗</a>
          </article>
        </div>
      </div>
    </section>
  )
}
