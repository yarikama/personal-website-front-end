"""Clips for /learnings/calibrate-before-use."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


def column(top: str, bottom: str) -> str:
    return R"\begin{pmatrix}" + top + R"\\" + bottom + R"\end{pmatrix}"


class DivideOutTheLean(Clip):
    """Contextual calibration with two labels, (unhappy, happy): the blank
    input's chances set W = diag(p_cf)^-1, which maps the blank itself to
    even odds and a 59%-happy review to unhappy. The numbers are the page's
    (model.test.ts checks them)."""

    def construct(self):
        # The blank input's chances, and the W they set
        ask = words(R"``N/A'' scores (unhappy, happy)", font_size=34, color=FADED)
        blank, bp = split_formula(R"\hat{p}_{cf}", "=", column("0.22", "0.78"), font_size=56)
        weight, wp = split_formula("W", "=", R"\begin{pmatrix}1/0.22 & 0\\0 & 1/0.78\end{pmatrix}", font_size=56)
        no_bias = formula("b = 0", font_size=56)
        top = VGroup(blank, weight, no_bias).arrange(RIGHT, buff=0.9).move_to(UP * 2.2)
        ask.next_to(top, UP, buff=0.35).align_to(top, LEFT)

        self.play(FadeIn(ask, shift=0.2 * DOWN))
        self.play(Write(blank), run_time=1.5)
        self.wait(0.5)
        self.play(
            FadeIn(wp[0:2]),
            TransformFromCopy(bp[2], wp[2]),
            run_time=1.5,
        )
        self.play(FadeIn(no_bias))
        self.wait(0.8)

        # W turns the blank itself into even odds
        even, ep = split_formula(
            R"W\hat{p}_{cf}", "=", column("0.22/0.22", "0.78/0.78"), "=", column("1", "1"), font_size=56
        )
        even_words = words("even odds", font_size=40, color=SAGE)
        row_b = VGroup(even, even_words).arrange(RIGHT, buff=0.6).move_to(UP * 0.1)
        self.play(FadeIn(ep[0:2]), TransformFromCopy(bp[2], ep[2]), run_time=1.5)
        self.play(FadeIn(ep[3:]), run_time=1)
        ep[4].set_fill(SAGE)
        self.play(FadeIn(even_words, shift=0.2 * LEFT))
        self.wait(1.0)

        # A review that scored 59% happy, under the blank's 78%
        review_says = words(R"``Too loud to talk.'' scores (0.41, 0.59)", font_size=34, color=FADED)
        review, rp = split_formula(
            R"W\hat{p}",
            "=",
            column("0.41/0.22", "0.59/0.78"),
            "=",
            column("1.86", "0.76"),
            R"\mskip\thickmuskip\to\mskip\thickmuskip",
            column("0.71", "0.29"),
            font_size=56,
        )
        verdict = words("unhappy", font_size=40, color=SAGE)
        row_c = VGroup(review, verdict).arrange(RIGHT, buff=0.6).move_to(DOWN * 2.5)
        review_says.next_to(row_c, UP, buff=0.35).align_to(row_c, LEFT)
        rule = Line(LEFT * 6.4, RIGHT * 6.4, stroke_color=RULE, stroke_width=2).move_to(DOWN * 1.05)

        self.play(ShowCreation(rule), FadeIn(review_says, shift=0.2 * DOWN))
        self.play(Write(rp[0:3]), run_time=1.8)
        self.wait(0.5)
        self.play(FadeIn(rp[3:5], shift=0.2 * LEFT), run_time=1.2)
        self.wait(0.4)
        # Rescaled to add to one: the unhappy label wins
        rp[6].set_fill(SAGE)
        self.play(FadeIn(rp[5:], shift=0.2 * LEFT), run_time=1.2)
        self.play(FadeIn(verdict, shift=0.2 * LEFT))
        self.play(Indicate(rp[6], color=SAGE, scale_factor=1.12))
        self.wait(3)
