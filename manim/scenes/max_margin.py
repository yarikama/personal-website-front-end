"""Clips for /learnings/max-margin."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class StreetWidth(Clip):
    """A point's distance to the line; the nearest points scaled to sit at
    plus or minus 1; the street's width 2 over the length of w; so the widest
    street is the smallest w, with every point at least 1 out. Then road C's
    numbers: w = (0.08, 0.06), length 0.1, width 20 m."""

    def construct(self):
        # The distance from a point to the line, in words, then in symbols
        said, sp = split_words("distance to the line", "=", R"$|\,w\cdot x + b\,|$", "over the", R"length of $w$", font_size=38, color=FADED)
        dist, dp = split_formula(R"\text{distance}", "=", R"\frac{|\,w\cdot x + b\,|}{\lVert w\rVert}", font_size=60)
        said.to_edge(UP, buff=0.8)
        dist.next_to(said, DOWN, buff=0.45)
        self.play(Write(said), run_time=1.6)
        self.play(
            FadeTransform(sp[0].copy(), dp[0]),
            FadeIn(dp[1]),
            FadeTransform(sp[2:].copy(), dp[2]),
            run_time=1.6,
        )
        self.wait(0.6)

        # A street: the line, and an edge on each side through the nearest points
        street = VGroup(
            Line(LEFT * 2.6, RIGHT * 2.6, stroke_color=SAGE, stroke_width=5),
            DashedLine(LEFT * 2.6, RIGHT * 2.6, stroke_color=FADED, stroke_width=3).shift(UP * 0.85),
            DashedLine(LEFT * 2.6, RIGHT * 2.6, stroke_color=FADED, stroke_width=3).shift(DOWN * 0.85),
        )
        street.move_to(DOWN * 1.35 + RIGHT * 0.2)
        near_up = Dot(street[1].get_center() + RIGHT * 0.9, radius=0.13, fill_color=SAGE)
        near_down = Dot(street[2].get_center() + LEFT * 1.1, radius=0.13, fill_color=INK)
        labels = VGroup(
            formula(R"w\cdot x + b = +1", font_size=34, color=FADED).next_to(street[1], RIGHT, buff=0.3),
            formula(R"w\cdot x + b = 0", font_size=34, color=SAGE).next_to(street[0], RIGHT, buff=0.3),
            formula(R"w\cdot x + b = -1", font_size=34, color=FADED).next_to(street[2], RIGHT, buff=0.3),
        )
        scale_words = words(R"scale $w$ and $b$ so the nearest points give $\pm 1$", font_size=36, color=FADED)
        scale_words.next_to(dist, DOWN, buff=0.55)
        self.play(FadeIn(scale_words, shift=0.2 * DOWN), FadeOut(said))
        self.play(ShowCreation(street[0]), run_time=0.8)
        self.play(
            ShowCreation(street[1]), ShowCreation(street[2]),
            FadeIn(near_up, scale=0.5), FadeIn(near_down, scale=0.5),
            LaggedStart(*(FadeIn(l) for l in labels), lag_ratio=0.3),
            run_time=1.6,
        )
        self.wait(0.6)

        # Each edge is 1 / |w| from the line, so the street is 2 / |w| wide
        brace = Brace(VGroup(street[1], street[2]), LEFT, buff=0.15).set_fill(SAGE)
        width, wp = split_formula(R"\text{width}", "=", R"\frac{2}{\lVert w\rVert}", font_size=56, color=SAGE)
        width.next_to(brace, LEFT, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(width, shift=0.2 * RIGHT), run_time=1.2)
        self.wait(1.2)

        # Widest street = smallest w, with every point at least 1 out
        top_width, tw = split_formula(R"\text{width}", "=", R"\frac{2}{\lVert w\rVert}", font_size=60, color=SAGE)
        top_width.to_edge(UP, buff=0.5)
        self.play(
            FadeOut(VGroup(dist, scale_words, street, near_up, near_down, labels, brace)),
            ReplacementTransform(width, top_width),
            run_time=1.2,
        )
        widest = words(R"widest street $=$ smallest $\lVert w\rVert$", font_size=38, color=FADED)
        widest.next_to(top_width, DOWN, buff=0.45)
        self.play(FadeIn(widest, shift=0.2 * DOWN))
        problem, pp = split_formula(
            R"\min_{w,\,b}\ \tfrac12\lVert w\rVert^2",
            R"\quad\text{with}\quad",
            R"y_i\,(w\cdot x_i + b) \ge 1",
            font_size=54,
        )
        problem.next_to(widest, DOWN, buff=0.45)
        every = words("for every point $i$", font_size=34, color=FADED).next_to(problem, DOWN, buff=0.2)
        every.align_to(pp[2], LEFT)
        self.play(TransformFromCopy(tw[2], pp[0]), run_time=1.2)
        self.play(FadeIn(pp[1]), FadeIn(pp[2], shift=0.2 * LEFT), FadeIn(every), run_time=1.2)
        self.wait(1.0)

        # Road C's numbers dropped in
        rule = Line(LEFT * 4.5, RIGHT * 4.5, stroke_color=RULE, stroke_width=2).next_to(every, DOWN, buff=0.35)
        road, rp = split_formula(
            R"w = (0.08,\ 0.06)",
            R"\qquad",
            R"\lVert w\rVert = 0.1",
            font_size=52,
        )
        wide = formula(R"\text{width} = \tfrac{2}{0.1} = 20\text{ m}", font_size=56, color=SAGE)
        road.next_to(rule, DOWN, buff=0.35)
        wide.next_to(road, DOWN, buff=0.3)
        label = words("road C:", font_size=34, color=FADED).next_to(road, LEFT, buff=0.5)
        self.play(ShowCreation(rule), FadeIn(label))
        self.play(FadeIn(rp[0], shift=0.2 * UP), run_time=0.9)
        self.play(FadeIn(rp[2], shift=0.2 * UP), run_time=0.9)
        self.play(TransformFromCopy(tw, wide), run_time=1.4)
        self.play(Indicate(wide, color=SAGE, scale_factor=1.08))
        self.wait(2.5)
