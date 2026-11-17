"""Clips for /learnings/bleu."""

from manimlib import *

from style import FADED, RULE, SAGE, Clip, formula, split_formula, words

# A multiplication dot set apart in a piece of its own keeps its spacing
DOT = R"\mskip\medmuskip\cdot\mskip\medmuskip"


class Score(Clip):
    """The candidate "a dog slept on the rug" against "the dog slept on the
    rug": its four clipped shares, multiplied to a third and rooted to 0.76,
    times a brevity penalty of 1. Then the same steps in symbols, with the
    penalty's two cases."""

    def construct(self):
        pair = VGroup(
            words(R"candidate: \emph{a dog slept on the rug}", font_size=36, color=FADED),
            words(R"reference: \emph{the dog slept on the rug}", font_size=36, color=FADED),
        ).arrange(DOWN, buff=0.18, aligned_edge=LEFT)
        pair.to_edge(UP, buff=0.6)
        self.play(FadeIn(pair, shift=0.2 * DOWN), run_time=1)

        # The four shares, each with what it counts
        values = [R"\tfrac56", R"\tfrac45", R"\tfrac34", R"\tfrac23"]
        names = ["words", "pairs", "threes", "fours"]
        columns = VGroup(
            *(
                VGroup(formula(v, font_size=64), words(name, font_size=34, color=FADED)).arrange(DOWN, buff=0.25)
                for v, name in zip(values, names)
            )
        ).arrange(RIGHT, buff=0.9)
        columns.next_to(pair, DOWN, buff=0.6)
        self.play(LaggedStart(*(FadeIn(c, shift=0.2 * UP) for c in columns), lag_ratio=0.3), run_time=2)
        self.wait(1)

        # Multiplied, then rooted: the multiplying average
        product, pp = split_formula(
            R"\Big(", values[0], DOT, values[1], DOT, values[2], DOT, values[3], R"\Big)^{1/4}",
            "=", R"\Big(\tfrac13\Big)^{1/4}", "=", "0.76",
            font_size=60,
        )
        pp[12].set_fill(SAGE)
        product.next_to(columns, DOWN, buff=0.7)
        self.play(
            *(TransformFromCopy(c[0], pp[1 + 2 * i]) for i, c in enumerate(columns)),
            FadeIn(VGroup(pp[0], pp[2], pp[4], pp[6], pp[8])),
            run_time=1.4,
        )
        self.play(FadeIn(pp[9:11], shift=0.2 * LEFT), run_time=0.9)
        self.play(FadeIn(pp[11:], shift=0.2 * LEFT), run_time=0.9)
        self.wait(0.8)

        # The length charge: 6 words against 6
        charge = words(R"$6$ words, like the reference: brevity penalty $1$", font_size=34, color=FADED)
        charge.next_to(product, DOWN, buff=0.5)
        result, rp = split_formula(R"\mathrm{BLEU}", "=", "1", R"\times", "0.76", "=", "0.76", font_size=60)
        rp[6].set_fill(SAGE)
        result.next_to(charge, DOWN, buff=0.4)
        self.play(FadeIn(charge, shift=0.2 * DOWN))
        self.play(FadeIn(rp[:4]), TransformFromCopy(pp[12], rp[4]), run_time=1.2)
        self.play(FadeIn(rp[5:], shift=0.2 * LEFT))
        self.wait(1.4)

        # The same steps in symbols
        self.play(FadeOut(VGroup(pair, columns, product, charge)), run_time=0.6)
        self.play(result.animate.to_edge(UP, buff=0.8), run_time=0.8)
        rule = Line(LEFT * 5, RIGHT * 5, stroke_color=RULE, stroke_width=2).next_to(result, DOWN, buff=0.5)
        general, gp = split_formula(
            R"\mathrm{BLEU}", "=", R"BP", DOT, R"\big(p_1\, p_2\, p_3\, p_4\big)^{1/4}",
            font_size=60,
        )
        logs, lp = split_formula("=", R"BP", DOT, R"\exp\Big(\sum_{n=1}^{4}\tfrac14\log p_n\Big)", font_size=60)
        penalty = formula(
            R"BP = \begin{cases} 1 & c > r \\ e^{\,1 - r/c} & c \le r \end{cases}",
            font_size=54,
        )
        general.next_to(rule, DOWN, buff=0.5)
        logs.next_to(general, DOWN, buff=0.4).align_to(gp[1], LEFT)
        shift = -VGroup(general, logs).get_center()[0]
        general.shift(shift * RIGHT)
        logs.shift(shift * RIGHT)
        penalty.next_to(logs, DOWN, buff=0.5)
        gp[2].set_fill(SAGE)
        lp[1].set_fill(SAGE)
        self.play(ShowCreation(rule))
        self.play(FadeIn(gp[:2]), FadeIn(gp[4], shift=0.2 * UP), run_time=1.2)
        self.play(FadeIn(gp[2:4], shift=0.2 * UP), run_time=0.8)
        self.wait(0.6)
        self.play(LaggedStart(*(FadeIn(p, shift=0.2 * UP) for p in lp), lag_ratio=0.2), run_time=1.6)
        self.wait(0.6)
        self.play(FadeIn(penalty, shift=0.2 * UP), run_time=1)
        self.wait(3)
