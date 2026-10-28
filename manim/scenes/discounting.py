"""Clips for /learnings/discounting."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class TheReturn(Clip):
    """The return as a discounted sum; everything after the first reward is
    γ times the next return, so G_t = R_{t+1} + γG_{t+1}. With a reward of 1
    every step that reads G = 1 + γG, so G = 1 / (1 − γ): 10 at γ = 0.9."""

    def construct(self):
        title = words("all the reward still to come, each step counted at $\\gamma$", font_size=38, color=FADED)
        title.to_edge(UP, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        sum_, sp = split_formula(
            "G_t", "=", "R_{t+1}", "+", R"\gamma R_{t+2}", "+", R"\gamma^2 R_{t+3}", "+", R"\cdots",
            font_size=60,
        )
        sum_.next_to(title, DOWN, buff=0.7)
        self.play(LaggedStart(*(FadeIn(p, shift=0.15 * UP) for p in sp), lag_ratio=0.15), run_time=2.4)
        self.wait(0.6)

        # Everything after the first reward
        rest = sp[4:]
        brace = Brace(rest, DOWN, buff=0.15).set_fill(SAGE)
        said = words("$\\gamma$ times the next step's return", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(said))
        self.wait(1.2)

        folded, fp = split_formula("G_t", "=", "R_{t+1}", "+", R"\gamma G_{t+1}", font_size=72, t2c={R"\gamma G_{t+1}": SAGE})
        folded.next_to(said, DOWN, buff=0.6)
        self.play(
            TransformFromCopy(sp[0:4], fp[0:4]),
            FadeTransform(rest.copy(), fp[4]),
            run_time=1.6,
        )
        self.wait(1)
        self.play(FadeOut(VGroup(sum_, brace, said)), folded.animate.next_to(title, DOWN, buff=0.7), run_time=1.2)

        # A reward of 1 every step: every return is the same G
        ones = words("a reward of 1 every step, for ever:", font_size=36, color=FADED)
        ones.next_to(folded, DOWN, buff=0.7)
        one, op = split_formula("G", "=", "1", "+", R"\gamma G", font_size=64)
        one.next_to(ones, DOWN, buff=0.4)
        self.play(FadeIn(ones))
        self.play(TransformFromCopy(folded, one), run_time=1.4)
        self.wait(0.6)
        solved, sv = split_formula("G", "=", R"\frac{1}{1 - \gamma}", "=", R"\frac{1}{1 - 0.9}", "=", "10", font_size=64, t2c={"10": SAGE})
        solved.next_to(one, DOWN, buff=0.6)
        self.play(FadeIn(sv[:3], shift=0.2 * DOWN))
        self.wait(0.6)
        self.play(FadeIn(sv[3:5], shift=0.2 * LEFT))
        self.play(FadeIn(sv[5:], shift=0.2 * LEFT))
        self.play(FlashAround(sv[6], color=SAGE, stroke_width=3))
        self.wait(4)
