import { describe, expect, it } from 'vitest'
import { findTalk, formatTalkDate, publicTalks, talks } from '.'

// A slip in a talk (a typo in a section id, two slides with one id) would
// otherwise show up only on stage
describe('the talks', () => {
  it('each have a unique slug that fits in a URL', () => {
    const slugs = talks.map((talk) => talk.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('each have a real date', () => {
    for (const talk of talks) {
      expect(talk.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(talk.date).getTime())).toBe(false)
    }
  })

  it.each(talks.map((talk) => [talk.slug, talk] as const))('%s has slides that fit its sections', async (_, talk) => {
    const { default: content } = await talk.load()
    expect(content.slides.length).toBeGreaterThan(0)
    const sectionIds = content.sections.map((section) => section.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const slideIds = content.slides.map((slide) => slide.id)
    expect(new Set(slideIds).size).toBe(slideIds.length)
    for (const slide of content.slides) {
      expect(sectionIds).toContain(slide.section)
      expect(slide.steps ?? 0).toBeGreaterThanOrEqual(0)
    }
  })

  it('lists only public talks publicly, and finds any talk by its slug', () => {
    expect(publicTalks.every((talk) => talk.visibility === 'public')).toBe(true)
    for (const talk of talks) expect(findTalk(talk.slug)).toBe(talk)
    expect(findTalk('no-such-talk')).toBeUndefined()
    expect(findTalk(undefined)).toBeUndefined()
  })

  it('shows the date as written', () => {
    expect(formatTalkDate('2026-10-12')).toBe('Oct 12, 2026')
  })
})
