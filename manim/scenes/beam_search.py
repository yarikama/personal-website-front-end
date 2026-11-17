"""Clips for /learnings/beam-search."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class PerWord(Clip):
    """A sentence's chance is a product, so every word can only shrink it.
    The log turns it into a sum; dividing by the length gives the average
    per word. Then two replies: the short one wins the product, the long
    one the average."""

    def construct(self):
        said = words("the chance of a whole sentence", font_size=38, color=FADED)
        said.to_edge(UP, buff=0.8)

        prod, pp = split_formula(
            R"P(y)", "=", R"\prod_{t=1}^{T}", R"p(y_t \mid y_{<t})",
            font_size=60,
        )
        prod.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=1.4)
        self.play(FadeIn(pp[0:2]), run_time=0.6)
        self.play(FadeIn(pp[2:], shift=0.2 * LEFT), run_time=1.0)

        # Each factor is at most 1
        brace = Brace(pp[3], DOWN, buff=0.15).set_fill(SAGE)
        shrink = words("each at most 1: every word shrinks it", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(shrink, shift=0.2 * DOWN))
        self.wait(1.4)

        # The log: a product becomes a sum
        logs, lp = split_formula(
            R"\log P(y)", "=", R"\sum_{t=1}^{T}", R"\log p(y_t \mid y_{<t})",
            font_size=60,
        )
        logs.move_to(prod)
        why = words("take the log: a product becomes a sum", font_size=38, color=FADED).move_to(said)
        self.play(FadeOut(brace), FadeOut(shrink), FadeTransform(said, why), run_time=0.8)
        self.play(*(FadeTransform(pp[i], lp[i]) for i in range(4)), run_time=1.5)
        self.wait(0.8)

        # Divide by the length: the average per word
        avg, ap = split_formula(
            R"\mathrm{score}(y)", "=", R"\frac{1}{T}", R"\sum_{t=1}^{T}", R"\log p(y_t \mid y_{<t})",
            font_size=60,
            t2c={R"\frac{1}{T}": SAGE},
        )
        avg.move_to(logs)
        per = words("divide by its length $T$: the average per word", font_size=38, color=FADED).move_to(said)
        self.play(FadeTransform(why, per), run_time=0.8)
        self.play(
            FadeTransform(lp[0], ap[0]),
            FadeTransform(lp[1], ap[1]),
            FadeIn(ap[2], shift=0.2 * DOWN),
            FadeTransform(lp[2], ap[3]),
            FadeTransform(lp[3], ap[4]),
            run_time=1.5,
        )
        self.wait(1.0)

        # Two finished replies
        rule = Line(LEFT * 5.8, RIGHT * 5.8, stroke_color=RULE, stroke_width=2).next_to(avg, DOWN, buff=0.6).set_x(0)
        self.play(ShowCreation(rule), run_time=0.6)

        head_total = words("product", font_size=34, color=FADED)
        head_score = words("score", font_size=34, color=FADED)
        no = words(R"No \textless/s\textgreater", font_size=38)
        yes = words(R"Yes I'm in \textless/s\textgreater", font_size=38)
        no_total = formula("0.36", font_size=52, color=SAGE)
        yes_total = formula("0.33", font_size=52)
        no_score = formula("-0.51", font_size=52)
        yes_score = formula("-0.28", font_size=52, color=SAGE)

        names_x, total_x, score_x = -3.4, 0.6, 3.6
        top = rule.get_y() - 0.6
        head_total.move_to([total_x, top, 0])
        head_score.move_to([score_x, top, 0])
        for row, (name, total, score) in enumerate([(no, no_total, no_score), (yes, yes_total, yes_score)]):
            y = top - 0.9 * (row + 1)
            name.move_to([names_x, y, 0])
            total.move_to([total_x, y, 0])
            score.move_to([score_x, y, 0])

        self.play(FadeIn(head_total), FadeIn(no), FadeIn(yes), run_time=0.8)
        self.play(FadeIn(no_total, shift=0.2 * LEFT), FadeIn(yes_total, shift=0.2 * LEFT), run_time=0.9)
        self.play(Indicate(no_total, color=SAGE, scale_factor=1.15))
        self.wait(0.6)
        self.play(
            FadeIn(head_score),
            no_total.animate.set_fill(INK),
            LaggedStart(FadeIn(no_score, shift=0.2 * LEFT), FadeIn(yes_score, shift=0.2 * LEFT), lag_ratio=0.4),
            run_time=1.4,
        )
        self.play(Indicate(yes_score, color=SAGE, scale_factor=1.1))
        self.wait(2.5)
