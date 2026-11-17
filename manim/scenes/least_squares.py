"""Clips for /learnings/least-squares."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class NormalEquations(Clip):
    """The total of squared misses; its slope set to zero; the leftover
    perpendicular to every feature; the normal equations; then the five
    bikes' numbers dropped in, giving $448 and -$24 a year."""

    def construct(self):
        said, sp = split_words("total of", "squared misses", font_size=40, color=FADED)
        total, tp = split_formula(
            "L(w)", "=", R"\textstyle\sum_i", R"(\,y_i - x_i \cdot w\,)^2",
            font_size=60,
        )
        normed, np_ = split_formula("L(w)", "=", R"\lVert\, y - Xw \,\rVert^2", font_size=60)
        said.to_edge(UP, buff=1.3)
        total.next_to(said, DOWN, buff=0.6)
        normed.move_to(total)

        self.play(Write(said), run_time=1.2)
        self.play(FadeTransform(sp[1].copy(), tp[3]), FadeIn(tp[2]), FadeIn(tp[0:2]), run_time=1.6)
        self.wait(0.6)
        # One sum over sales is one length, squared, of the vector of misses
        self.play(
            ReplacementTransform(tp[0:2], np_[0:2]),
            FadeTransform(tp[2:], np_[2]),
            run_time=1.4,
        )
        self.wait(0.4)

        # At the bottom of the bowl, nudging any weight changes nothing
        flat, fp = split_words("at the bottom, every slope is", "zero", font_size=38, color=FADED)
        slope, sl = split_formula(R"\nabla L(w)", "=", R"-2\,X^{\top}", "(y - Xw)", "=", "0", font_size=60, t2c={"(y - Xw)": SAGE})
        flat.next_to(normed, DOWN, buff=0.8)
        slope.next_to(flat, DOWN, buff=0.5)
        self.play(FadeIn(flat, shift=0.2 * DOWN))
        self.play(
            TransformFromCopy(np_[0], sl[0]),
            FadeIn(sl[1]),
            FadeIn(sl[2]),
            TransformFromCopy(np_[2], sl[3]),
            FadeIn(sl[4]),
            FadeTransform(fp[1].copy(), sl[5]),
            run_time=1.8,
        )
        self.wait(0.5)

        # The leftover misses, and what the equation says about them
        brace = Brace(sl[3], DOWN, buff=0.12).set_fill(SAGE)
        leftover = words("the leftover misses", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.12)
        self.play(GrowFromCenter(brace), FadeIn(leftover, shift=0.2 * DOWN))
        self.wait(0.6)
        square = words("at a right angle to every feature column", font_size=36).next_to(leftover, DOWN, buff=0.4)
        self.play(Write(square), run_time=1.4)
        self.wait(1.0)

        # Drop the -2, then move the X-transpose-X w term across: the normal equations
        mid, mq = split_formula(R"X^{\top}", "(y - Xw)", "=", "0", font_size=64, t2c={"(y - Xw)": SAGE})
        normal, nq = split_formula(R"X^{\top}X", "w", "=", R"X^{\top}y", font_size=64, t2c={"w": SAGE})
        mid.to_edge(UP, buff=1.3)
        normal.to_edge(UP, buff=1.3)
        name = words("the normal equations", font_size=34, color=FADED).next_to(normal, DOWN, buff=0.3)
        self.play(
            FadeOut(VGroup(said, normed, flat, brace, leftover, square)),
            FadeOut(sl[0:2]),
            FadeTransform(sl[2], mq[0]),
            ReplacementTransform(sl[3], mq[1]),
            ReplacementTransform(sl[4:], mq[2:]),
            run_time=1.4,
        )
        self.wait(0.9)
        self.play(FadeTransform(mid, normal), run_time=1.2)
        self.play(FadeIn(name, shift=0.2 * UP))
        self.wait(0.6)

        # The five bikes: a column of 1s for the starting price and one of ages
        bikes, bp = split_formula(
            R"\begin{bmatrix} 5 & 15 \\ 15 & 55 \end{bmatrix}",
            R"\begin{bmatrix} b \\ m \end{bmatrix}",
            "=",
            R"\begin{bmatrix} 1880 \\ 5400 \end{bmatrix}",
            font_size=56,
        )
        bp[1].set_fill(SAGE)
        bikes.next_to(name, DOWN, buff=0.7)
        self.play(
            LaggedStart(
                TransformFromCopy(nq[0], bp[0]),
                TransformFromCopy(nq[1], bp[1]),
                TransformFromCopy(nq[2], bp[2]),
                TransformFromCopy(nq[3], bp[3]),
                lag_ratio=0.25,
            ),
            run_time=2.2,
        )
        self.wait(0.5)

        answer, ap = split_formula(R"b = \$448", R"\qquad", R"m = -\$24 \text{ a year}", font_size=56, color=SAGE)
        answer.next_to(bikes, DOWN, buff=0.7)
        self.play(FadeIn(answer, shift=0.2 * UP), run_time=1.2)
        self.play(Indicate(answer, color=SAGE, scale_factor=1.08))
        self.wait(2.5)
