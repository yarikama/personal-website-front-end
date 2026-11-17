"""Clips for /learnings/random-forests."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

AVERAGE = R"\mathrm{Var}\Big[\tfrac{1}{B}\textstyle\sum_b T_b\Big]"


class AverageOfTrees(Clip):
    """The variance of an average of B trees: a grid of every pair of trees,
    the B cells on its diagonal each sigma squared and the rest rho sigma
    squared; added up and divided by B squared, that is rho sigma squared
    plus (1 - rho) sigma squared over B. Then three cases with B = 100."""

    def construct(self):
        title = words("the variance of an average of $B$ trees", font_size=40, color=FADED).to_edge(UP, buff=0.5)
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=1)

        # Every pair of trees, B = 4 drawn: the diagonal is a tree with
        # itself, the rest two different trees
        size = 1.15
        cells = VGroup()
        labels = VGroup()
        for i in range(4):
            for j in range(4):
                cell = Square(side_length=size, stroke_color=RULE, stroke_width=2)
                cell.move_to([j * size, -i * size, 0])
                same = i == j
                if same:
                    cell.set_fill(SAGE, opacity=0.25)
                cells.add(cell)
                text = formula(R"\sigma^2" if same else R"\rho\sigma^2", font_size=40, color=INK if same else FADED)
                text.move_to(cell)
                labels.add(text)
        grid = VGroup(cells, labels).move_to(LEFT * 3.7 + DOWN * 0.5)
        heads = VGroup(
            *(formula(f"T_{k + 1}", font_size=30, color=FADED).next_to(cells[k], UP, buff=0.15) for k in range(4)),
            *(formula(f"T_{k + 1}", font_size=30, color=FADED).next_to(cells[4 * k], LEFT, buff=0.15) for k in range(4)),
        )
        pairs = words("every pair of trees", font_size=34, color=FADED).next_to(grid, DOWN, buff=0.35)
        self.play(ShowCreation(cells), FadeIn(heads), run_time=1.4)
        self.play(FadeIn(labels, lag_ratio=0.05), FadeIn(pairs), run_time=1.4)
        self.wait(0.6)

        # Add up the grid, then divide by B squared
        sums, sp = split_formula(
            R"\tfrac{1}{B^2}", R"\Big(", R"B\sigma^2", "+", R"\,B(B-1)\rho\sigma^2", R"\Big)",
            font_size=58,
        )
        sums.move_to(RIGHT * 2.9 + DOWN * 0.5)
        diagonal = VGroup(*(labels[5 * k] for k in range(4)))
        others = VGroup(*(labels[k] for k in range(16) if k % 5 != 0))
        self.play(FadeIn(sp[0]), FadeIn(sp[1]), FadeIn(sp[5]), run_time=0.6)
        self.play(TransformFromCopy(diagonal, sp[2]), run_time=1.4)
        self.play(FadeIn(sp[3]), TransformFromCopy(others, sp[4]), run_time=1.6)
        self.wait(0.8)

        # Tidy it: what is shared, and what averages away
        result, rp = split_formula(
            AVERAGE, "=", R"\,\rho\sigma^2", "+", R"\frac{(1-\rho)\,\sigma^2}{B}",
            font_size=72,
        )
        result.next_to(title, DOWN, buff=0.4)
        self.play(FadeOut(VGroup(grid, heads, pairs)), run_time=0.7)
        self.play(
            FadeIn(rp[0:2]),
            TransformFromCopy(sp[4], rp[2]),
            FadeIn(rp[3]),
            TransformFromCopy(sp[2], rp[4]),
            FadeOut(sums),
            run_time=1.8,
        )
        floor_brace = Brace(rp[2], DOWN, buff=0.15).set_fill(SAGE)
        floor = words("never shrinks", font_size=34, color=SAGE).next_to(floor_brace, DOWN, buff=0.12)
        fall_brace = Brace(rp[4], DOWN, buff=0.15).set_fill(INK)
        fall = words("falls as $B$ grows", font_size=34).next_to(fall_brace, DOWN, buff=0.12)
        self.play(GrowFromCenter(floor_brace), FadeIn(floor, shift=0.2 * DOWN))
        self.play(GrowFromCenter(fall_brace), FadeIn(fall, shift=0.2 * DOWN))
        self.wait(1.2)

        # Three cases, each with B = 100 trees and sigma squared = 1
        given = words(R"$B = 100$, $\sigma^2 = 1$", font_size=36, color=FADED)
        given.next_to(VGroup(floor, fall), DOWN, buff=0.35)
        self.play(FadeIn(given))
        rows = []
        top = given.get_bottom()[1] - 0.55
        for k, (rho, shared, own, total) in enumerate(
            (("0", "0", "0.01", "0.01"), ("0.5", "0.5", "0.005", "0.505"), ("0.1", "0.1", "0.009", "0.109"))
        ):
            y = top - 0.85 * k
            tag = formula(Rf"\rho = {rho}", font_size=50, color=FADED).move_to([rp[0].get_center()[0], y, 0])
            a = formula(shared, font_size=54, color=SAGE).move_to([rp[2].get_center()[0], y, 0])
            b = formula(own, font_size=54).move_to([rp[4].get_center()[0], y, 0])
            plus = formula("+", font_size=54, color=FADED).move_to([rp[3].get_center()[0], y, 0])
            equals = formula(R"= " + total, font_size=54)
            rows.append(VGroup(tag, a, plus, b, equals))
        # The totals in one column, just right of the widest term
        column = max(row[3].get_right()[0] for row in rows) + 0.4
        for row in rows:
            row[4].move_to([column, row[1].get_center()[1], 0], aligned_edge=LEFT)
        for row in rows:
            self.play(FadeIn(row[0]), TransformFromCopy(rp[2], row[1]), FadeIn(row[2]), TransformFromCopy(rp[4], row[3]), run_time=1.1)
            self.play(FadeIn(row[4], shift=0.2 * LEFT), run_time=0.6)
        self.play(Indicate(rows[1][1], color=SAGE, scale_factor=1.25), run_time=1.2)
        self.wait(3)
