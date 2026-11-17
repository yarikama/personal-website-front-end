"""Clips for /learnings/lime."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class WeightedFit(Clip):
    """LIME's loss built from words: the box's answer minus the line's guess,
    squared, weighted by the copy's say, summed over copies. Then what the
    guess and the say are, and the say of a copy keeping 4 of 5 words: 0.91."""

    def construct(self):
        said, sp = split_words("the box's answer", "the line's guess", "the copy's say", font_size=36, color=FADED)
        sp.arrange(RIGHT, buff=0.9)

        loss, lp = split_formula(
            "L", "=", R"\textstyle\sum_{z}", R"\pi(z)", R"\big(", "f(z)", "-", R"g(z')", R"\big)^2",
            font_size=64,
        )
        lp[3].set_fill(SAGE)

        guess, gp = split_formula(R"g(z')", "=", "b", "+", R"\textstyle\sum_i", R"w_i\, z'_i", font_size=52)
        kept = words(R"$z'_i$ is $1$ if word $i$ is kept, $0$ if covered", font_size=34, color=FADED)
        say, yp = split_formula(R"\pi(z)", "=", R"e^{-D^2/\sigma^2}", font_size=52)
        yp[0].set_fill(SAGE)
        worked, wp = split_formula(
            R"D = 1 - \sqrt{4/5} = 0.11", R"\qquad", R"\pi = e^{-0.11^2/0.35^2} = 0.91",
            font_size=46,
        )
        wp[2].set_fill(SAGE)
        stack = VGroup(loss, guess, kept, say, worked)
        stack.arrange(DOWN, buff=0.6)
        kept.next_to(guess, DOWN, buff=0.25)
        stack.move_to(ORIGIN).shift(0.1 * DOWN)
        said.next_to(loss, UP, buff=0.7)

        self.play(LaggedStart(*(FadeIn(p, shift=0.2 * DOWN) for p in sp), lag_ratio=0.4), run_time=1.6)
        self.wait(0.4)
        # The miss: the box's answer against the line's guess
        self.play(FadeTransform(sp[0].copy(), lp[5]), run_time=1.0)
        self.play(FadeIn(lp[6]), FadeTransform(sp[1].copy(), lp[7]), run_time=1.0)
        self.wait(0.3)
        # Squared, so a miss either way costs
        self.play(FadeIn(lp[4]), FadeIn(lp[8]), run_time=0.8)
        self.wait(0.3)
        # Weighted by how close the copy is
        self.play(FadeTransform(sp[2].copy(), lp[3]), run_time=1.0)
        # And added up over every copy
        self.play(FadeIn(lp[2]), FadeIn(lp[0:2]), run_time=1.0)
        self.wait(0.8)

        # The guess: a base plus the credit of each word the copy keeps
        self.play(FadeOut(said), TransformFromCopy(lp[7], gp[0]), FadeIn(gp[1:]), run_time=1.3)
        self.play(FadeIn(kept, shift=0.2 * UP), run_time=0.8)
        self.wait(0.8)

        # The say: falls off with the cosine distance from the review
        self.play(TransformFromCopy(lp[3], yp[0]), FadeIn(yp[1:]), run_time=1.3)
        self.wait(0.6)

        # A copy that keeps 4 of the review's 5 words
        self.play(Write(wp[0]), run_time=1.4)
        self.play(Write(wp[2]), run_time=1.4)
        self.play(Indicate(wp[2], color=SAGE, scale_factor=1.08))
        self.wait(2.5)
