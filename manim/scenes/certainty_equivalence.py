"""Clips for /learnings/certainty-equivalence."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, split_formula, split_words, words

DOT = R"\mskip\medmuskip\cdot\mskip\medmuskip"


class FromCounts(Clip):
    """The story's six trips counted into a model: how often the station
    sent her on each train, how long each ride and leg took. Then the
    model's values worked out from it, the counts dropping into place,
    and solved as if the model were certain."""

    def construct(self):
        title = words("count the notes", font_size=40, color=FADED)

        after, ap = split_words("after the station:", "fast", "3 in 6", R"$\cdot$", "slow", "3 in 6", font_size=42)
        rides, rp = split_words("the rides:", "fast", "10 min", R"$\cdot$", "slow", "30 min", font_size=42)
        legs, lp = split_words("to the station:", "bus", "15 min", R"$\cdot$", "bike", "12 min", font_size=42)
        counts = VGroup(after, rides, legs).arrange(DOWN, buff=0.32, aligned_edge=LEFT)
        counts.next_to(title, DOWN, buff=0.4)
        for part in (ap[0], rp[0], lp[0]):
            part.set_fill(FADED)

        rule = Line(LEFT, RIGHT, stroke_color=RULE, stroke_width=2)
        rule.next_to(counts, DOWN, buff=0.35)

        station, sp = split_formula(
            R"V(\mathrm{station})", "=", R"\tfrac{3}{6}", DOT, "10", "+", R"\tfrac{3}{6}", DOT, "30", "=", "20",
            font_size=60,
        )
        bike, bp = split_formula(R"V(\mathrm{bike})", "=", "12", "+", R"V(\mathrm{station})", "=", "32", font_size=60)
        bus, up = split_formula(R"V(\mathrm{bus})", "=", "15", "+", R"V(\mathrm{station})", "=", "35", font_size=60)
        solved = VGroup(station, bike, bus).arrange(DOWN, buff=0.38, aligned_edge=LEFT)
        solved.next_to(rule, DOWN, buff=0.4)
        rule.set_width(max(counts.get_width(), solved.get_width()) + 0.4, stretch=True)
        # The whole page of it, as large as the frame allows, in the middle
        page = VGroup(title, counts, rule, solved)
        grow = min(6.9 / page.get_height(), 13 / page.get_width())
        page.scale(grow).center()
        for answer in (sp[10], bp[6], up[6]):
            answer.set_fill(SAGE)

        self.play(FadeIn(title))
        # The notes, counted: one line at a time
        for line in (after, rides, legs):
            self.play(FadeIn(line, shift=0.15 * DOWN), run_time=0.9)
        self.wait(1.0)
        self.play(ShowCreation(rule), run_time=0.6)

        # The station: the shares and the rides drop into place
        self.play(FadeIn(sp[0:2]))
        self.play(
            LaggedStart(
                TransformFromCopy(ap[2], sp[2]),
                FadeIn(sp[3]),
                TransformFromCopy(rp[2], sp[4]),
                FadeIn(sp[5]),
                TransformFromCopy(ap[5], sp[6]),
                FadeIn(sp[7]),
                TransformFromCopy(rp[5], sp[8]),
                lag_ratio=0.25,
            ),
            run_time=2.6,
        )
        self.play(FadeIn(sp[9:], shift=0.2 * LEFT))
        self.wait(0.8)

        # The bike and the bus: a leg, plus the station's value
        for row, parts, leg in ((bike, bp, lp[5]), (bus, up, lp[2])):
            self.play(FadeIn(parts[0:2]))
            self.play(
                TransformFromCopy(leg, parts[2]),
                FadeIn(parts[3]),
                TransformFromCopy(sp[0], parts[4]),
                run_time=1.6,
            )
            self.play(FadeIn(parts[5:], shift=0.2 * LEFT))
            self.wait(0.5)

        # Trusted as if it were certain
        new_title = words("solved as if the counts were certain", font_size=40, color=SAGE).scale(grow).move_to(title)
        self.play(FadeTransform(title, new_title))
        self.play(Indicate(VGroup(sp[10], bp[6], up[6]), color=INK, scale_factor=1.15))
        self.wait(3)
