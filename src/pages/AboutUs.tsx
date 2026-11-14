import { ArrowLeft, ArrowRight, Compass, Target, Users } from "lucide-react";

import "./landing.css";

const objectives = [
  "Make Cambodia fire activity easier to explore through a single interactive map.",
  "Turn overlapping MODIS and VIIRS detections into clearer, harmonized fire events.",
  "Support evidence-based comparison through time, location, source sensor, and fire type.",
];

const team = [
  { role: "Data & methods", detail: "Data cleaning, event clustering, and confidence harmonization." },
  { role: "Mapping & analysis", detail: "Spatial exploration, filters, and fire-activity interpretation." },
  { role: "Product & design", detail: "A clear experience for exploring fire activity and evidence." },
];

export function AboutUs() {
  return <main className="landing-page"><header className="about-nav"><a href="#/"><ArrowLeft size={15} /> Back to home</a><a className="landing-brand" href="#/"><Compass size={18} /> Burn Calendar</a><a href="#/explorer">Launch Explorer</a></header><section className="about-hero"><p className="landing-eyebrow">About us</p><h1>Discover fire activity for yourself.</h1><p>Burn Calendar is a Cambodia-focused explorer that helps people move from a large volume of satellite detections to a clearer picture of fire activity, intensity, and sensor agreement.</p><a className="landing-button landing-button--primary" href="#/explorer">Launch Explorer <ArrowRight size={17} /></a></section><section className="about-grid"><article><Compass /><h2>What is the Explorer?</h2><p>The Explorer is an interactive workspace for viewing harmonized fire events, raw sensor observations, map areas, time periods, detection types, and downloadable evidence.</p></article><article><Target /><h2>Our purpose</h2><p>We make satellite-based fire information easier to understand so users can investigate patterns, compare observations, and ask better questions about changing landscapes.</p></article><article><Users /><h2>Project objectives</h2><ul>{objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></article></section><section className="team-section"><p className="landing-eyebrow">Meet our team</p><h2>Built across data, mapping, and design.</h2><div>{team.map((member) => <article key={member.role}><span>{member.role.slice(0, 1)}</span><h3>{member.role}</h3><p>{member.detail}</p></article>)}</div></section></main>;
}
