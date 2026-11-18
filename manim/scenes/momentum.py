"""Clips for /learnings/momentum."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class SteadyOrFlipping(Clip):
    """The update in words, then symbols. Then what the velocity settles to
    when the gradient is the same every step (it piles up to g over 1 - beta)
    and when it flips sign every step (it shrinks to g over 1 + beta), with
    beta = 0.9: 10 against 0.53, a tilt of 19 to 1."""

    def construct(self):
        said, sp = split_words(
            "new velocity", "=", R"$\beta$", R"$\times$", "old velocity", "+", "gradient",
            font_size=40,
        )
        rule, rp = split_formula(
            "v", R"\leftarrow", R"\beta", "v", "+", "g",
            font_size=64,
            t2c={R"\beta": SAGE},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2.2)
        self.wait(0.6)
        pairs = [(0, 0), (1, 1), (2, 2), (4, 3), (5, 4), (6, 5)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[j]) for i, j in pairs), lag_ratio=0.12),
            FadeOut(sp[3]),
            run_time=2,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.7), run_time=0.9)
        self.wait(0.4)

        # Two columns: a gradient that agrees with itself, and one that flips
        left_head = words("same every step", font_size=36, color=FADED).move_to(LEFT * 3.4 + UP * 1.7)
        right_head = words("flips every step", font_size=36, color=FADED).move_to(RIGHT * 3.4 + UP * 1.7)
        left_seq = formula(R"g,\ g,\ g,\ g,\ \dots", font_size=48).next_to(left_head, DOWN, buff=0.35)
        right_seq = formula(R"g,\ -g,\ g,\ -g,\ \dots", font_size=48).next_to(right_head, DOWN, buff=0.35)
        divider = Line(UP * 2.0, DOWN * 3.0, stroke_color=RULE, stroke_width=2)

        self.play(ShowCreation(divider), FadeIn(left_head), FadeIn(right_head))
        self.play(FadeIn(left_seq, shift=0.2 * DOWN), FadeIn(right_seq, shift=0.2 * DOWN))
        self.wait(0.6)

        # Settled: v comes back to itself, or to minus itself
        left_fix = formula(R"v = \beta v + g", font_size=52).next_to(left_seq, DOWN, buff=0.5)
        right_fix = formula(R"v = -\beta v + g", font_size=52).next_to(right_seq, DOWN, buff=0.5)
        self.play(FadeIn(left_fix))
        self.play(FadeIn(right_fix))
        self.wait(0.8)

        left_sol = formula(R"v = \frac{g}{1 - \beta}", font_size=56, t2c={R"\beta": SAGE}).move_to(left_fix)
        right_sol = formula(R"v = \frac{g}{1 + \beta}", font_size=56, t2c={R"\beta": SAGE}).move_to(right_fix)
        self.play(TransformMatchingTex(left_fix, left_sol), run_time=1.4)
        self.play(TransformMatchingTex(right_fix, right_sol), run_time=1.4)
        self.wait(0.6)

        # With beta = 0.9
        left_num = formula(R"\tfrac{1}{0.1}\,g = 10\,g", font_size=56, color=SAGE).next_to(left_sol, DOWN, buff=0.5)
        right_num = formula(R"\tfrac{1}{1.9}\,g \approx 0.53\,g", font_size=56, color=SAGE).next_to(right_sol, DOWN, buff=0.5)
        beta = formula(R"\beta = 0.9", font_size=44, color=SAGE).next_to(rule, RIGHT, buff=1.0)
        self.play(FadeIn(beta, shift=0.2 * LEFT))
        self.play(FadeIn(left_num, shift=0.2 * DOWN))
        self.play(FadeIn(right_num, shift=0.2 * DOWN))
        self.wait(0.6)

        left_say = words("piles up", font_size=36).next_to(left_num, DOWN, buff=0.35)
        right_say = words("shrinks", font_size=36).next_to(right_num, DOWN, buff=0.35)
        self.play(FadeIn(left_say), FadeIn(right_say))
        self.play(Indicate(left_num, color=SAGE, scale_factor=1.12))
        self.wait(3)
