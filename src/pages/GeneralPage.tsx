import { ArrowRight, BookOpen, Flame, Info } from "lucide-react";

import "./landing.css";

function Navigation() {
  return <nav className="landing-nav"><a className="landing-brand" href="#/"><Flame size={18} /> Burn Calendar</a><div><a href="#/explorer">Launch Explorer</a><a href="#/about">About Us</a><a href="#/methods">Method Overview</a></div></nav>;
}

export function GeneralPage() {
  return <main className="landing-page"><Navigation /><section className="landing-hero"><p className="landing-eyebrow">Cambodia fire intelligence</p><h1>Explore Fire Activity.<br /><span>Understand Our World.</span></h1><p className="landing-subtitle">Explore harmonized MODIS and VIIRS observations to understand where, when, and how fire activity changes across Cambodia.</p><div className="landing-actions"><a className="landing-button landing-button--primary" href="#/explorer">Launch Explorer <ArrowRight size={17} /></a><a className="landing-button" href="#/methods">Method Overview</a></div></section><section className="landing-cards"><a href="#/explorer"><Flame /><h2>Explore fire activity</h2><p>Map clustered events, compare sensors, and filter observations by time and area.</p><span>Open explorer <ArrowRight size={15} /></span></a><a href="#/about"><Info /><h2>About us</h2><p>Learn why this dashboard brings satellite observations into one Cambodia-focused view.</p><span>Our mission <ArrowRight size={15} /></span></a><a href="#/methods"><BookOpen /><h2>Method overview</h2><p>See how raw detections are clustered into events and compared responsibly.</p><span>Read method <ArrowRight size={15} /></span></a></section></main>;
}

