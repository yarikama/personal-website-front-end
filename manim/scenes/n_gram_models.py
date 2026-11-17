"""Clips for /learnings/n-gram-models."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class ChainToBigram(Clip):
    """The chance an order begins "a large tea", built up: the chain rule
    multiplies one next-word chance per word, each given everything before
    it. Keeping only the last word drops the older ones. Then each chance is
    a count over a count from the café's twelve orders: 10/12, 6/10, 2/6,
    which multiply to 1/6."""

    def construct(self):
        title = words("the chance an order begins ``a large tea''", font_size=38, color=FADED)

        # The chain rule: exact, one factor per word
        chain, cp = split_formula(
            R"P(\text{a} \mid \langle s\rangle)",
            R"\,P(\text{large} \mid \langle s\rangle\ \text{a})",
            R"\,P(\text{tea} \mid\mskip\thickmuskip",
            R"\langle s\rangle\ \text{a}",
            R"\ \text{large})",
            font_size=52,
        )
        short, sp = split_formula(
            R"P(\text{a} \mid \langle s\rangle)",
            R"\,P(\text{large} \mid \text{a})",
            R"\,P(\text{tea} \mid \text{large})",
            font_size=52,
        )
        exact = words("each word, given everything before it", font_size=34, color=FADED)
        last = words("keep only the last word", font_size=34, color=SAGE)
        # Each chance is a count of the pair over a count of the word
        counts = formula(
            R"\frac{c(\langle s\rangle\ \text{a})}{c(\langle s\rangle)}"
            R"\times\frac{c(\text{a large})}{c(\text{a})}"
            R"\times\frac{c(\text{large tea})}{c(\text{large})}",
            font_size=46,
        )
        numbers, np_ = split_formula(
            R"\frac{10}{12}",
            R"\times",
            R"\frac{6}{10}",
            R"\times",
            R"\frac{2}{6}",
            "=",
            R"\frac{1}{6}",
            font_size=52,
        )
        np_[6].set_fill(SAGE)
        note = words("counted from the twelve orders", font_size=34, color=FADED)

        # Lay out the end frame, centred, and start the chain where the
        # short form will be
        page = VGroup(title, short, last, counts, numbers, note)
        page.arrange(DOWN, buff=0.5)
        title.shift(0.2 * UP)
        page.center()
        chain.move_to(short)
        exact.move_to(last)

        self.play(FadeIn(title, shift=0.2 * DOWN))
        for piece in cp[:2]:
            self.play(Write(piece), run_time=1.1)
        self.play(Write(cp[2:]), run_time=1.3)
        self.play(FadeIn(exact, shift=0.2 * UP))
        self.wait(1.2)

        # Keep only the last word: the older context falls away
        self.play(cp[3].animate.set_fill(FADED, opacity=0.4), run_time=0.8)
        cross = Line(cp[3].get_left(), cp[3].get_right(), stroke_color=INK, stroke_width=3)
        self.play(ShowCreation(cross), run_time=0.6)
        self.play(
            ReplacementTransform(cp[0], sp[0]),
            ReplacementTransform(cp[1], sp[1]),
            ReplacementTransform(VGroup(cp[2], cp[4]), sp[2]),
            FadeOut(VGroup(cp[3], cross), shift=0.3 * DOWN),
            FadeTransform(exact, last),
            run_time=1.6,
        )
        self.wait(1)

        self.play(TransformFromCopy(short, counts), run_time=1.6)
        self.wait(1)
        self.play(TransformFromCopy(counts, VGroup(*np_[:5])), run_time=1.4)
        self.play(Write(VGroup(*np_[5:])), run_time=1)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(4)
