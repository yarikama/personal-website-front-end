import Hero from '../components/sections/Hero'
import TravelWall from '../components/sections/TravelWall'
import Ask from '../components/sections/Ask'
import Manifesto from '../components/sections/Manifesto'
import BriefSelection from '../components/sections/BriefSelection'
import Experience from '../components/sections/Experience'
import Toolkit from '../components/sections/Toolkit'
import LabNotes from '../components/sections/LabNotes'
import Contact from '../components/sections/Contact'
import { PAGES, usePageMeta } from '../lib/pageMeta'

export default function Home() {
  usePageMeta(PAGES.home)
  return (
    <>
      <Hero />
      <TravelWall />
      <Ask />
      {/* "About" in the header: the story, the experience and the skills */}
      <div id="about">
        <Manifesto />
        <Experience />
        <Toolkit />
      </div>
      <BriefSelection />
      <LabNotes />
      <Contact />
    </>
  )
}
