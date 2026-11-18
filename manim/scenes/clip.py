"""Clips for /learnings/clip."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, words

# The toy's starting arrows, at temperature 1 (src/learnings/clip/model.ts):
# the house picture's row of scores against the four captions, and the
# house caption's column against the four pictures
ROW = ["-0.26", "0.71", "-0.91", "0.82"]
ROW_E = ["0.77", "2.03", "0.40", "2.27"]
CAPTIONS = ["sky", "house", "oak", "lake"]
HOUSE = 1


class ContrastiveLoss(Clip):
    """The house picture's quiz, one row of the grid: its four scores, each
    raised to e to the score over tau (tau 1 here), the house caption's share
    of the sum (0.37, the lake caption takes 0.41), and minus its log, 0.99.
    The caption's quiz down its column gives 1.00 the same way. The loss is
    half the mean over the rows plus half the mean over the columns."""

    def construct(self):
        title = words("the house picture's quiz: which caption is mine?", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        # One row: the caption words over their scores
        xs = [-4.2, -1.4, 1.4, 4.2]
        heads = VGroup(*(words(c, font_size=40, color=SAGE if j == HOUSE else FADED) for j, c in enumerate(CAPTIONS)))
        scores = VGroup(*(formula(s.replace("-", "{-}"), font_size=58, color=SAGE if j == HOUSE else INK) for j, s in enumerate(ROW)))
        for j in range(4):
            heads[j].move_to([xs[j], 2.35, 0])
            scores[j].move_to([xs[j], 1.55, 0])
        label = formula(R"s", font_size=52, color=FADED).move_to([-6.2, 1.55, 0])
        self.play(LaggedStartMap(FadeIn, heads, lag_ratio=0.15), run_time=0.8)
        self.play(FadeIn(label), LaggedStartMap(Write, scores, lag_ratio=0.2), run_time=1.4)
        self.wait(0.6)

        # e to each score over tau
        exps = VGroup(*(formula(s, font_size=58, color=SAGE if j == HOUSE else INK) for j, s in enumerate(ROW_E)))
        for j in range(4):
            exps[j].move_to([xs[j], 0.55, 0])
        elabel = formula(R"e^{s/\tau}", font_size=52, color=FADED).move_to([-6.2, 0.6, 0])
        self.play(FadeIn(elabel), *(TransformFromCopy(scores[j], exps[j]) for j in range(4)), run_time=1.4)
        tau = words(R"with $\tau = 1$, to keep the numbers small", font_size=36, color=FADED)
        tau.move_to([0, -0.2, 0])
        self.play(FadeIn(tau))
        self.wait(0.8)

        # Its own caption's share of the sum, then minus its log
        share = formula(
            R"\frac{2.03}{0.77 + 2.03 + 0.40 + 2.27} = 0.37",
            font_size=56,
            t2c={"2.03": SAGE, "0.37": SAGE},
        )
        share.move_to([0, -1.25, 0])
        self.play(FadeOut(tau), Write(share), run_time=1.6)
        lake = words("lake takes 0.41: the quiz is lost", font_size=36, color=FADED)
        lake.next_to(share, DOWN, buff=0.45)
        self.play(FadeIn(lake, shift=0.15 * UP))
        self.wait(1.0)
        row_loss = formula(R"\text{row loss} = -\ln 0.37 = 0.99", font_size=58, color=SAGE)
        row_loss.move_to(lake)
        self.play(FadeTransform(lake, row_loss), run_time=1.0)
        self.wait(1.0)

        # The caption's quiz, down its column, the same way
        column = formula(R"\text{column loss for ``our house''} = -\ln 0.37 = 1.00", font_size=50)
        column.next_to(row_loss, DOWN, buff=0.4)
        self.play(FadeIn(column, shift=0.15 * UP), run_time=0.9)
        self.wait(1.2)

        # Every row and every column: the loss
        everything = VGroup(heads, scores, exps, label, elabel, share)
        self.play(FadeOut(everything), FadeOut(title), VGroup(row_loss, column).animate.to_edge(UP, buff=0.7), run_time=1.0)
        rule = Line([-5.5, 0.9, 0], [5.5, 0.9, 0], color=RULE, stroke_width=2)
        loss = formula(
            R"L = \frac{1}{2N} \sum_{k} \big( {-}\ln P_{kk} - \ln Q_{kk} \big)",
            font_size=72,
            t2c={"P_{kk}": SAGE, "Q_{kk}": SAGE},
        )
        loss.move_to([0, -0.3, 0])
        under = words(R"$P$: the chances along each row, $Q$: down each column", font_size=36, color=FADED)
        under.move_to([0, -1.8, 0])
        self.play(ShowCreation(rule), Write(loss), run_time=1.6)
        self.play(FadeIn(under, shift=0.15 * UP))
        batch = words(R"all four pairs, at the start: $L = 2.02$", font_size=40, color=SAGE)
        batch.move_to([0, -2.8, 0])
        self.play(FadeIn(batch, shift=0.15 * UP))
        self.wait(3)
