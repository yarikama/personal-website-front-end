"""Clips for /learnings/dropout."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class KeepOrDrop(Clip):
    """One unit under inverted dropout: kept with chance 1 - p and scaled by
    1/(1 - p), or dropped. Its average is its own output, whatever p is,
    then the same with x = 3 and p = 1/2."""

    def construct(self):
        title = words("one unit, with output $x$", font_size=36, color=FADED).to_edge(UP, buff=0.5)

        # The two branches, each a chance and what is passed on
        keep_said = words("kept, with chance", font_size=38)
        keep_chance = formula("1-p", font_size=56, color=SAGE)
        keep_out = formula(R"\frac{x}{1-p}", font_size=60)
        drop_said = words("dropped, with chance", font_size=38)
        drop_chance = formula("p", font_size=56)
        drop_out = formula("0", font_size=60)

        keep_row = VGroup(keep_said, keep_chance).arrange(RIGHT, buff=0.3)
        drop_row = VGroup(drop_said, drop_chance).arrange(RIGHT, buff=0.3)
        rows = VGroup(keep_row, drop_row).arrange(DOWN, buff=0.9, aligned_edge=LEFT)
        rows.move_to(LEFT * 2.2 + UP * 1.2)
        keep_arrow = Arrow(keep_row.get_right(), keep_row.get_right() + RIGHT * 1.6, buff=0.25, stroke_color=RULE, stroke_width=4)
        drop_arrow = Arrow(drop_row.get_right(), drop_row.get_right() + RIGHT * 1.6, buff=0.25, stroke_color=RULE, stroke_width=4)
        drop_arrow.align_to(keep_arrow, LEFT)
        keep_out.next_to(keep_arrow, RIGHT, buff=0.3)
        drop_out.next_to(drop_arrow, RIGHT, buff=0.3)
        drop_out.align_to(keep_out, LEFT)
        passes = words("passes on", font_size=30, color=FADED).next_to(keep_arrow, UP, buff=0.15)

        self.play(FadeIn(title))
        self.play(Write(keep_row), run_time=1.4)
        self.play(GrowArrow(keep_arrow), FadeIn(passes), FadeIn(keep_out, shift=0.2 * RIGHT))
        self.wait(0.4)
        self.play(Write(drop_row), run_time=1.4)
        self.play(GrowArrow(drop_arrow), FadeIn(drop_out, shift=0.2 * RIGHT))
        self.wait(0.8)

        # The average: each thing passed on, times its chance
        mean, mp = split_formula(
            "(1-p)", R"\cdot", R"\frac{x}{1-p}", "+", "p", R"\cdot", "0", "=", "x",
            font_size=64,
            t2c={"(1-p)": SAGE},
        )
        mean.move_to(DOWN * 1.15)
        on_average = words("on average", font_size=34, color=FADED).next_to(mean, LEFT, buff=0.5)
        VGroup(on_average, mean).move_to(DOWN * 1.15)

        self.play(FadeIn(on_average))
        self.play(
            TransformFromCopy(keep_chance, mp[0]),
            FadeIn(mp[1]),
            TransformFromCopy(keep_out, mp[2]),
            run_time=1.4,
        )
        self.play(
            FadeIn(mp[3]),
            TransformFromCopy(drop_chance, mp[4]),
            FadeIn(mp[5]),
            TransformFromCopy(drop_out, mp[6]),
            run_time=1.4,
        )
        self.wait(0.5)

        # The chance of being kept cancels the scale-up
        cross_a = Line(mp[0].get_corner(DL), mp[0].get_corner(UR), stroke_color=SAGE, stroke_width=5)
        # Across the fraction's lower half, its 1 - p
        frac = mp[2]
        cross_b = Line(
            [frac.get_left()[0] + 0.05, frac.get_bottom()[1] + 0.02, 0],
            [frac.get_right()[0] - 0.05, frac.get_center()[1] - 0.12, 0],
            stroke_color=SAGE,
            stroke_width=5,
        )
        self.play(Indicate(mp[0], color=SAGE, scale_factor=1.15), Indicate(mp[2], color=SAGE, scale_factor=1.15))
        self.play(ShowCreation(cross_a), ShowCreation(cross_b))
        self.play(FadeIn(mp[7:], shift=0.2 * LEFT))
        self.play(Indicate(mp[8], color=INK, scale_factor=1.3))
        self.wait(1.0)

        # With numbers: x = 3, p = 1/2
        given = words(R"with $x = 3$ and $p = \tfrac12$:", font_size=34, color=FADED)
        sums, sp = split_formula(
            R"\tfrac12", R"\cdot", "6", "+", R"\tfrac12", R"\cdot", "0", "=", "3",
            font_size=60,
            t2c={"6": SAGE},
        )
        line = VGroup(given, sums).arrange(RIGHT, buff=0.45).to_edge(DOWN, buff=0.55)
        self.play(FadeIn(given))
        self.play(
            LaggedStart(
                TransformFromCopy(mp[0], sp[0]),
                FadeIn(sp[1]),
                TransformFromCopy(mp[2], sp[2]),
                FadeIn(sp[3]),
                TransformFromCopy(mp[4], sp[4]),
                FadeIn(sp[5]),
                TransformFromCopy(mp[6], sp[6]),
                lag_ratio=0.15,
            ),
            run_time=2.2,
        )
        self.play(FadeIn(sp[7:], shift=0.2 * LEFT))
        self.play(Indicate(sp[8], color=INK, scale_factor=1.3))
        self.wait(3)
