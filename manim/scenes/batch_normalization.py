"""Clips for /learnings/batch-normalization."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


# The maths font's \div draws as a nabla here, so the sign is Garamond's own,
# set as a binary operator so it keeps its spacing
DIV = R"\mskip\medmuskip\text{\textdiv}\mskip\medmuskip"


class BatchNormRule(Clip):
    """The rule in words, then in symbols, then with a batch of four on a
    number line: 27 sits 7 above the average of 20, which is 1.4 spreads,
    and a scale of 2 and a shift of 1 make it 3.8."""

    def construct(self):
        said, sp = split_words(
            "output", "=", "scale", R"$\times$", "(", "value", R"$-$", "batch average", ")",
            R"\textdiv", "batch spread", "+", "shift",
            font_size=36,
        )
        rule, rp = split_formula(
            "y", "=", R"\gamma", R"\cdot", "(", "x", "-", R"\mu", ")", DIV, R"\sigma", "+", R"\beta",
            font_size=72,
            t2c={R"\gamma": SAGE, R"\beta": SAGE},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2.5)
        self.wait(0.8)
        # Each phrase becomes its symbol
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(len(rp))), lag_ratio=0.1),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.8), run_time=1)
        learned = words(R"$\gamma$ and $\beta$ are learned", font_size=34, color=SAGE)
        learned.next_to(rule, DOWN, buff=0.35)
        self.play(FadeIn(learned, shift=0.2 * DOWN))
        self.wait(0.8)

        # A batch of four on a number line
        line = NumberLine(x_range=[10, 30, 5], width=10, color=RULE, tick_size=0.07, stroke_width=3)
        line.move_to(DOWN * 1.9)
        ticks = VGroup(
            *(formula(str(v), font_size=32, color=FADED).next_to(line.n2p(v), DOWN, buff=0.22) for v in (10, 15, 20, 25, 30))
        )
        batch = [13, 19, 21, 27]
        dots = VGroup(*(Dot(line.n2p(v), radius=0.12, fill_color=INK) for v in batch))
        dots[3].set_fill(SAGE)
        self.play(FadeOut(learned), ShowCreation(line), FadeIn(ticks))
        self.play(LaggedStart(*(FadeIn(d, scale=0.5) for d in dots), lag_ratio=0.2), run_time=1.2)

        # The average, and one spread either side
        mu_mark = DashedLine(line.n2p(20) + UP * 0.9, line.n2p(20), color=FADED, stroke_width=3)
        mu_label = formula(R"\mu = 20", font_size=40, color=FADED).next_to(mu_mark, UP, buff=0.15)
        self.play(ShowCreation(mu_mark), FadeIn(mu_label))
        spread = Line(line.n2p(20) + UP * 0.45, line.n2p(25) + UP * 0.45, color=FADED, stroke_width=4)
        spread_label = formula(R"\sigma = 5", font_size=40, color=FADED).next_to(spread, RIGHT, buff=0.2)
        self.play(ShowCreation(spread), FadeIn(spread_label))
        self.wait(0.6)

        # Numbers dropped into the symbols, for the sage photo
        sums, np_ = split_formula(
            "3.8", "=", "2", R"\cdot", "(", "27", "-", "20", ")", DIV, "5", "+", "1",
            font_size=60,
            t2c={"27": SAGE},
        )
        sums.move_to(UP * 1.2)
        self.play(
            LaggedStart(
                TransformFromCopy(rp[5], np_[5]),
                TransformFromCopy(rp[7], np_[7]),
                TransformFromCopy(rp[10], np_[10]),
                TransformFromCopy(rp[2], np_[2]),
                TransformFromCopy(rp[12], np_[12]),
                FadeIn(np_[3:5]),
                FadeIn(np_[6]),
                FadeIn(np_[8:10]),
                FadeIn(np_[11]),
                lag_ratio=0.15,
            ),
            run_time=2.5,
        )
        self.wait(0.5)
        # 7 above the average is 1.4 spreads
        brace = Brace(np_[4:11], DOWN, buff=0.12).set_fill(SAGE)
        spreads = formula("1.4", font_size=40, color=SAGE).next_to(brace, DOWN, buff=0.1)
        self.play(GrowFromCenter(brace), FadeIn(spreads, shift=0.2 * DOWN))
        self.wait(0.6)
        self.play(FadeIn(np_[0:2], shift=0.2 * RIGHT))
        self.play(Indicate(np_[0], color=INK, scale_factor=1.15))
        self.wait(3)
