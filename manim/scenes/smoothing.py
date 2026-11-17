"""Clips for /learnings/smoothing."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


def fraction(top, bottom, buff=0.18):
    """`top` over `bottom` with a bar between them, as one group whose bar
    is its middle part."""
    bar = Line(LEFT, RIGHT, stroke_color=INK, stroke_width=3)
    bar.set_width(max(top.get_width(), bottom.get_width()) + 0.3)
    top.next_to(bar, UP, buff=buff)
    bottom.next_to(bar, DOWN, buff=buff)
    return VGroup(top, bar, bottom)


def refit(top, bar, bottom):
    """A bar for the fraction's widest part, where `bar` is, with `top` and
    `bottom` set to move above and below it."""
    width = max(top.get_width(), bottom.get_width()) + 0.3
    target = Line(LEFT, RIGHT, stroke_color=INK, stroke_width=3).set_width(width)
    target.move_to(bar)
    top.generate_target().next_to(target, UP, buff=0.18)
    bottom.generate_target().next_to(target, DOWN, buff=0.18)
    return target


class AddK(Clip):
    """Counting gives a pair never seen a chance of 0. Add k pretend counts
    to every pair on top, k for each of the V possible next words below, and
    drop in the café numbers: k = 1, V = 11."""

    def construct(self):
        title = words(R"the chance of ``tea'' after ``want''", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.6)

        # In words first, as a fraction
        said = fraction(
            words(R"times ``want tea'' was said", font_size=36),
            words(R"times ``want'' was said", font_size=36),
        )
        said.move_to(UP * 0.6)
        self.play(FadeIn(title), Write(said), run_time=2.2)
        self.wait(0.8)

        # The same in symbols, and the café's numbers
        count = fraction(formula(R"c(\text{want tea})", font_size=56), formula(R"c(\text{want})", font_size=56))
        count.move_to(UP * 0.6 + LEFT * 1.6)
        five = formula(R"=\ \frac{5}{8}", font_size=56).next_to(count, RIGHT, buff=0.4)
        self.play(
            FadeTransform(said[0], count[0]),
            ReplacementTransform(said[1], count[1]),
            FadeTransform(said[2], count[2]),
            run_time=1.5,
        )
        self.play(FadeIn(five, shift=0.2 * LEFT))
        self.wait(0.5)

        # A pair never seen
        never = formula(R"\text{``now'' after ``want''}:\ \ \frac{0}{8}\ =\ 0", font_size=48)
        never.to_edge(DOWN, buff=1.0)
        self.play(FadeIn(never, shift=0.2 * UP))
        self.play(Indicate(never[-1], color=INK, scale_factor=1.4))
        self.wait(0.8)

        # k pretend counts on top...
        top, tp = split_formula(R"c(\text{want tea})", "+", "k", font_size=56)
        tp[1:].set_fill(SAGE)
        top.move_to(count[0])
        bar, bottom = count[1], count[2]
        note = words("every pair: $k$ pretend counts", font_size=34, color=SAGE).next_to(title, DOWN, buff=0.35)
        self.play(FadeOut(five), FadeIn(note))
        self.play(ReplacementTransform(count[0], tp[0]), FadeIn(tp[1:], shift=0.2 * LEFT), run_time=1.2)
        self.play(Transform(bar, refit(top, bar, bottom)), MoveToTarget(top), MoveToTarget(bottom))
        self.wait(0.5)

        # ...and k for each of the V words that could come next, below
        below, bp = split_formula(R"c(\text{want})", "+", "k", "V", font_size=56)
        bp[1:].set_fill(SAGE)
        below.move_to(bottom)
        note2 = words("$k$ for each of $V$ next words, so they still add to 1", font_size=34, color=SAGE).move_to(note)
        self.play(FadeTransform(note, note2))
        self.play(ReplacementTransform(bottom, bp[0]), FadeIn(bp[1:], shift=0.2 * LEFT), run_time=1.2)
        bottom = below
        self.play(Transform(bar, refit(top, bar, bottom)), MoveToTarget(top), MoveToTarget(bottom))
        self.wait(0.6)
        count = VGroup(top, bar, bottom)

        # The café's numbers: k = 1, V = 11
        given = formula(R"k = 1,\ \ V = 11", font_size=48, color=SAGE).move_to(note2)
        tea = formula(R"=\ \frac{5+1}{8+11}\ =\ \frac{6}{19}\ \approx\ 0.32", font_size=52)
        tea.next_to(count, RIGHT, buff=0.4)
        group = VGroup(count, tea)
        self.play(FadeTransform(note2, given))
        self.play(group.animate.move_to(UP * 0.6), run_time=0.8)
        self.play(FadeIn(tea, shift=0.2 * LEFT), run_time=1.2)
        self.wait(0.6)

        now = formula(R"\text{``now'' after ``want''}:\ \ \frac{0+1}{8+11}\ =\ \frac{1}{19}\ \approx\ 0.05", font_size=48)
        now.move_to(never)
        self.play(FadeTransform(never, now), run_time=1.4)
        self.play(Indicate(now[-4:], color=SAGE, scale_factor=1.2))
        self.wait(2.6)
