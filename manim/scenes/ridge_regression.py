"""Clips for /learnings/ridge-regression."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

# The parties' XᵀX: eigenvalue 21 along "both came", 1 along "one came alone"
STRONG = 21
WEAK = 1
LAMBDA = 4
# Height of one unit of eigenvalue
SCALE = 0.13
BASELINE = -2.0


class LiftEigenvalues(Clip):
    """Ridge's loss, least squares' plus lambda times the squared weights.
    Its slope set to zero: (XᵀX + λI) w = Xᵀy. Then XᵀX's two eigenvalues
    for the parties, 21 and 1, as bars, each lifted by λ = 4, and what share
    of least squares' answer ridge keeps along each: 21/25 and 1/5."""

    def construct(self):
        title = words("squared error, plus a charge for big weights", font_size=36, color=FADED).to_edge(UP, buff=0.5)
        loss, parts = split_formula(R"\|y - Xw\|^2", "+", R"\lambda \|w\|^2", font_size=60)
        parts[2].set_fill(SAGE)
        loss.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(parts[0]), run_time=1.4)
        self.play(FadeIn(parts[1]), Write(parts[2]), run_time=1.2)
        self.wait(1.0)

        # Its slope set to zero
        slope = words("set its slope to zero", font_size=36, color=FADED).move_to(title)
        solved, pieces = split_formula(R"(X^{\top}X", "+", R"\lambda I", R")\, w", "=", R"X^{\top}y", font_size=60)
        pieces[2].set_fill(SAGE)
        solved.move_to(loss)
        self.play(FadeTransform(title, slope), FadeTransform(loss, solved), run_time=1.6)
        self.wait(1.2)

        # The two eigenvalues of XᵀX, as bars
        self.play(FadeOut(slope), solved.animate.to_edge(UP, buff=0.5), run_time=0.8)
        floor = Line(LEFT * 5, RIGHT * 5, stroke_color=RULE, stroke_width=2).shift(UP * BASELINE)
        spots = [LEFT * 2.4, RIGHT * 2.4]

        def bar(value, at, color):
            rect = Rectangle(width=1.4, height=max(value * SCALE, 0.02), fill_color=color, fill_opacity=1, stroke_width=0)
            return rect.move_to(at + UP * (BASELINE + value * SCALE / 2))

        strong = bar(STRONG, spots[0], INK)
        weak = bar(WEAK, spots[1], INK)
        names = VGroup(
            words("both came", font_size=34, color=FADED).next_to(floor, DOWN, buff=0.25).set_x(spots[0][0]),
            words("one came alone", font_size=34, color=FADED).next_to(floor, DOWN, buff=0.25).set_x(spots[1][0]),
        )
        values = VGroup(
            formula(str(STRONG), font_size=56).next_to(strong, UP, buff=0.2),
            formula(str(WEAK), font_size=56).next_to(weak, UP, buff=0.2),
        )
        heading = words(R"eigenvalues of $X^{\top}X$: how much the data say", font_size=36, color=FADED)
        heading.next_to(solved, DOWN, buff=0.45)
        self.play(ShowCreation(floor), FadeIn(heading), run_time=0.8)
        self.play(GrowFromEdge(strong, DOWN), GrowFromEdge(weak, DOWN), FadeIn(names), run_time=1.2)
        self.play(FadeIn(values, shift=0.2 * UP))
        self.wait(1.4)

        # Each lifted by lambda
        lift = [bar(LAMBDA, s, SAGE).next_to(b, UP, buff=0) for s, b in zip(spots, (strong, weak))]
        lifted = VGroup(
            formula(str(STRONG + LAMBDA), font_size=56, color=SAGE).next_to(lift[0], UP, buff=0.2),
            formula(str(WEAK + LAMBDA), font_size=56, color=SAGE).next_to(lift[1], UP, buff=0.2),
        )
        plus = words(Rf"each one $+\,\lambda$, here $\lambda = {LAMBDA}$", font_size=36, color=SAGE).move_to(heading)
        self.play(FadeTransform(heading, plus), run_time=0.8)
        self.play(*(GrowFromEdge(piece, DOWN) for piece in lift), *(FadeTransform(a, b) for a, b in zip(values, lifted)), run_time=1.6)
        self.wait(1.2)

        # What share of least squares' answer each direction keeps
        keeps = VGroup(
            formula(Rf"\tfrac{{{STRONG}}}{{{STRONG + LAMBDA}}} = 0.84", font_size=54),
            formula(Rf"\tfrac{{{WEAK}}}{{{WEAK + LAMBDA}}} = 0.2", font_size=54, color=SAGE),
        )
        for keep, spot in zip(keeps, spots):
            keep.next_to(names, DOWN, buff=0.3).set_x(spot[0])
        kept = words(R"keeps $e \,/\, (e + \lambda)$ of least squares", font_size=36, color=FADED).move_to(plus)
        self.play(FadeTransform(plus, kept), run_time=0.8)
        self.play(FadeIn(keeps[0], shift=0.2 * UP), run_time=0.8)
        self.play(FadeIn(keeps[1], shift=0.2 * UP), run_time=0.8)
        self.wait(3)
