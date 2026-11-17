"""Clips for /learnings/convexity."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class ChordRule(Clip):
    """The rope rule in words, then in symbols, then with the dented
    valley's numbers dropped in: halfway between x = -1 and x = 1 the ground
    is at 0 and the rope at -1, so the ground is above the rope."""

    def construct(self):
        said, sp = split_words(
            "the ground", R"a share $\theta$ of the way from $x$ to $y$", R"$\le$", "the rope there",
            font_size=44,
        )
        rule, rp = split_formula(
            "f(", R"\theta x + (1-\theta) y", ")", R"\mskip\thickmuskip\le\mskip\thickmuskip", R"\theta f(x) + (1-\theta) f(y)",
            font_size=76,
            t2c={R"\theta f(x) + (1-\theta) f(y)": SAGE},
        )
        said.to_edge(UP, buff=1.0)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.5)
        self.wait(0.6)
        # Each phrase becomes its symbol
        self.play(
            FadeTransform(sp[0].copy(), VGroup(rp[0], rp[2])),
            FadeTransform(sp[1].copy(), rp[1]),
            FadeTransform(sp[2].copy(), rp[3]),
            FadeTransform(sp[3].copy(), rp[4]),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.9), run_time=1)

        under = words("ground", font_size=42).next_to(rp[0:3], DOWN, buff=0.3)
        over = words("rope", font_size=42, color=SAGE).next_to(rp[4], DOWN, buff=0.3)
        self.play(FadeIn(under, shift=0.2 * DOWN), FadeIn(over, shift=0.2 * DOWN))
        self.wait(1)

        # The dented valley, and the rope across its hump
        which = formula(R"f(x) = x^4 - 2x^2 + 0.8x", font_size=52, color=FADED)
        which.next_to(rule, DOWN, buff=0.9)
        given = formula(R"x = -1,\quad y = 1,\quad \theta = \tfrac12", font_size=52, color=FADED)
        given.next_to(which, DOWN, buff=0.35)
        self.play(FadeOut(under), FadeOut(over), FadeIn(which), FadeIn(given))
        self.wait(1)

        nums, np_ = split_formula(
            "f(0)", "=", "0", R"\mskip\thickmuskip\le\mskip\thickmuskip", R"\tfrac12(-1.8) + \tfrac12(-0.2)", "=", "-1",
            font_size=66,
            t2c={R"\tfrac12(-1.8) + \tfrac12(-0.2)": SAGE, "-1": SAGE},
        )
        nums.next_to(given, DOWN, buff=0.6)
        self.play(
            LaggedStart(
                TransformFromCopy(rp[0:3], np_[0]),
                FadeIn(np_[1:3]),
                TransformFromCopy(rp[3], np_[3]),
                TransformFromCopy(rp[4], np_[4]),
                FadeIn(np_[5:]),
                lag_ratio=0.25,
            ),
            run_time=3,
        )
        self.wait(0.8)

        # 0 is not at most -1: the ground is above the rope
        cross = Line(np_[3].get_corner(DL), np_[3].get_corner(UR), stroke_color=INK, stroke_width=5)
        verdict = words("ground above the rope: not convex", font_size=46)
        verdict.next_to(nums, DOWN, buff=0.45)
        self.play(ShowCreation(cross), FadeIn(verdict, shift=0.2 * UP))
        self.play(Indicate(np_[2], color=INK, scale_factor=1.25))
        self.wait(3)
