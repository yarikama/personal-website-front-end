"""Clips for /learnings/relational-algebra."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words


class SqlToPlan(Clip):
    """A query's three clauses become three operators, from the inside out:
    FROM a product, WHERE a selection over it, SELECT a projection on top.
    Then the selection over the product turns out to be the join."""

    def construct(self):
        clauses = VGroup(
            *(
                split_words(text, font_size=42, color=FADED)[0]
                for text in ("SELECT sauce", "FROM pastas, sauces", "WHERE shape = fits")
            )
        )
        clauses.arrange(DOWN, aligned_edge=LEFT, buff=0.3).to_edge(UP, buff=1.0)

        plan, pp = split_formula(
            R"\pi_{\mathrm{sauce}}",
            "(",
            R"\sigma_{\mathrm{shape}=\mathrm{fits}}",
            "(",
            R"\mathrm{PASTAS}",
            R"\times",
            R"\mathrm{SAUCES}",
            ")",
            ")",
            font_size=60,
        )
        plan.next_to(clauses, DOWN, buff=1.0)

        self.play(LaggedStart(*(Write(c) for c in clauses), lag_ratio=0.4), run_time=2.5)
        self.wait(0.6)

        # FROM: the tables, every row with every row
        self.play(clauses[1].animate.set_fill(INK), run_time=0.4)
        self.play(FadeTransform(clauses[1].copy(), pp[4:7]), run_time=1.4)
        self.play(clauses[1].animate.set_fill(FADED), run_time=0.3)
        self.wait(0.4)

        # WHERE: a selection around the product
        self.play(clauses[2].animate.set_fill(INK), run_time=0.4)
        self.play(FadeTransform(clauses[2].copy(), VGroup(pp[2], pp[3], pp[7])), run_time=1.4)
        self.play(clauses[2].animate.set_fill(FADED), run_time=0.3)
        self.wait(0.4)

        # SELECT: a projection on top
        self.play(clauses[0].animate.set_fill(INK), run_time=0.4)
        self.play(FadeTransform(clauses[0].copy(), VGroup(pp[0], pp[1], pp[8])), run_time=1.4)
        self.play(clauses[0].animate.set_fill(FADED), run_time=0.3)
        self.wait(1)

        # The selection over the product is the join
        inner = pp[2:8]
        self.play(inner.animate.set_fill(SAGE), run_time=0.8)
        brace = Brace(inner, DOWN, buff=0.15).set_fill(SAGE)
        # Garamond's maths has no bowtie, so the join's sign is drawn
        w, h = 0.2, 0.15
        tie = Polygon(
            [-w, h, 0], [0, 0, 0], [w, h, 0], [w, -h, 0], [0, 0, 0], [-w, -h, 0],
            stroke_color=SAGE, stroke_width=4, fill_opacity=0,
        )
        left = formula(R"\mathrm{PASTAS}", font_size=56, color=SAGE)
        right = formula(R"\mathrm{SAUCES}", font_size=56, color=SAGE)
        on = formula(R"\mathrm{shape}=\mathrm{fits}", font_size=34, color=SAGE)
        # Laid out by hand, the condition as the sign's subscript
        tie.next_to(left, RIGHT, buff=0.3)
        on.next_to(tie.get_corner(DR), DR, buff=0.04).shift(0.1 * LEFT)
        right.next_to(on, RIGHT, buff=0.2).match_y(left)
        join = VGroup(left, tie, on, right)
        jp = [left, VGroup(tie, on), right]
        join.next_to(brace, DOWN, buff=0.35)
        self.play(GrowFromCenter(brace), run_time=0.8)
        self.play(
            TransformFromCopy(pp[4], jp[0]),
            TransformFromCopy(VGroup(pp[2], pp[5]), jp[1]),
            TransformFromCopy(pp[6], jp[2]),
            run_time=1.8,
        )
        self.wait(3)
