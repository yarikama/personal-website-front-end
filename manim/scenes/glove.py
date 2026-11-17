"""Clips for /learnings/glove."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class RatioToOffset(Clip):
    """GloVe asks that a context vector dotted with a word vector give the log
    of how likely the context word is beside the word. Write that for ice and
    for steam and subtract: the log of a ratio of probabilities becomes the
    context vector dotted with the difference of two word vectors. Then the
    GloVe paper's ratios drop in: solid 8.9, gas 0.085, water 1.36, whose
    logs are 2.19, -2.47 and 0.31 (the numbers are in the page's model.ts)."""

    def construct(self):
        # The ask, in words, then in symbols
        said, sp = split_words(
            "context vector", R"$\cdot$", "word vector", R"$\approx$", "log of how likely",
            font_size=48,
            color=FADED,
        )
        ask, ap = split_formula(
            "u_k", R"\mskip\medmuskip\cdot\mskip\medmuskip", "v_i", R"\mskip\thickmuskip\approx\mskip\thickmuskip", R"\log P(k \mid i)",
            font_size=68,
        )
        said.move_to(UP * 0.9)
        ask.next_to(said, DOWN, buff=0.7)
        self.play(Write(said), run_time=2)
        self.wait(0.4)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), ap[i]) for i in range(5)), lag_ratio=0.15),
            run_time=2,
        )
        self.wait(0.6)

        # Once for ice, once for steam
        ice = formula(R"u_k \cdot v_{\text{ice}} \approx \log P(k \mid \text{ice})", font_size=60)
        steam = formula(R"u_k \cdot v_{\text{steam}} \approx \log P(k \mid \text{steam})", font_size=60)
        pair = VGroup(ice, steam).arrange(DOWN, buff=0.35)
        self.play(FadeOut(said), ask.animate.to_edge(UP, buff=0.6), run_time=0.8)
        pair.next_to(ask, DOWN, buff=0.6)
        self.play(FadeIn(ice, shift=0.2 * DOWN), run_time=0.9)
        self.play(FadeIn(steam, shift=0.2 * DOWN), run_time=0.9)
        self.wait(0.6)

        # Subtract: a ratio of chances becomes a difference of vectors
        minus = words("subtract", font_size=44, color=FADED)
        minus.next_to(pair, LEFT, buff=0.4)
        diff = formula(
            R"u_k \cdot \big(v_{\text{ice}} - v_{\text{steam}}\big) \approx \log \frac{P(k \mid \text{ice})}{P(k \mid \text{steam})}",
            font_size=72,
            t2c={R"v_{\text{ice}} - v_{\text{steam}}": SAGE},
        )
        diff.move_to(pair)
        self.play(FadeIn(minus), run_time=0.5)
        self.play(FadeOut(minus), FadeTransform(pair, diff), run_time=1.6)
        self.wait(1.0)

        # The paper's ratios drop in
        self.play(FadeOut(ask), diff.animate.to_edge(UP, buff=0.6), run_time=0.8)
        names = VGroup(
            words("solid", font_size=56, color=SAGE),
            words("gas", font_size=56, color=SAGE),
            words("water", font_size=56),
        )
        values = VGroup(
            formula(R"\log 8.9 = 2.19", font_size=64, color=SAGE),
            formula(R"\log 0.085 = -2.47", font_size=64, color=SAGE),
            formula(R"\log 1.36 = 0.31", font_size=64),
        ).arrange(DOWN, buff=0.4, aligned_edge=LEFT)
        for name, value in zip(names, values):
            name.next_to(value, LEFT, buff=0.8)
            name.align_to(values, LEFT).shift(LEFT * 2.2)
        rows = VGroup(*(VGroup(name, value) for name, value in zip(names, values)))
        rows.next_to(diff, DOWN, buff=0.7)
        for row in rows:
            self.play(FadeIn(row, shift=0.2 * UP), run_time=0.9)
            self.wait(0.4)

        line = Line(LEFT, RIGHT, color=RULE).set_width(rows.get_width() + 0.6)
        line.next_to(rows, DOWN, buff=0.45)
        sums = words("steam to ice points toward solid, away from gas", font_size=52, color=INK)
        sums.next_to(line, DOWN, buff=0.4)
        self.play(ShowCreation(line), FadeIn(sums, shift=0.2 * UP), run_time=1.2)
        self.play(VGroup(diff, rows, line, sums).animate.center(), run_time=0.8)
        self.wait(3)
