"""Clips for /learnings/kernel-trick."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, split_formula, words

# A product dot set apart in a piece of its own, with the spacing TeX would give it
DOT = R"\mskip\medmuskip\cdot\mskip\medmuskip"
COMMA = R",\mskip\thickmuskip"


class SquareExpand(Clip):
    """(x·x′)² opened up term by term, regrouped into three products of a
    piece of x with the matching piece of x′: the inner product of the
    features (x1², √2 x1x2, x2²). Then both ways with numbers."""

    def construct(self):
        # The kernel, then its inside written out
        kernel, kp = split_formula("(x \\cdot x')^2", "=", "(x_1 x_1' + x_2 x_2')^2", font_size=56)
        kernel.to_edge(UP, buff=0.7)
        self.play(Write(kp[0]), run_time=1.2)
        self.wait(0.4)
        self.play(FadeIn(kp[1]), FadeIn(kp[2], shift=0.2 * LEFT), run_time=1.2)
        self.wait(0.6)

        # Open the square
        opened, op = split_formula(
            "(x \\cdot x')^2", "=", "x_1^2 x_1'^2", "+", "2\\, x_1 x_2\\, x_1' x_2'", "+", "x_2^2 x_2'^2",
            font_size=56,
        )
        opened.move_to(kernel)
        self.play(
            ReplacementTransform(kp[0:2], op[0:2]),
            FadeTransform(kp[2], op[2:]),
            run_time=1.6,
        )
        self.wait(0.6)

        # Split each term into a piece of x times the same piece of x′
        split, sp = split_formula(
            "(x \\cdot x')^2", "=",
            "x_1^2", DOT, "x_1'^2", "+",
            "\\sqrt2\\, x_1 x_2", DOT, "\\sqrt2\\, x_1' x_2'", "+",
            "x_2^2", DOT, "x_2'^2",
            font_size=52,
        )
        split.move_to(kernel)
        for i in (4, 8, 12):
            sp[i].set_fill(SAGE)
        self.play(
            ReplacementTransform(op[0:2], sp[0:2]),
            FadeTransform(op[2], sp[2:5]),
            ReplacementTransform(op[3], sp[5]),
            FadeTransform(op[4], sp[6:9]),
            ReplacementTransform(op[5], sp[9]),
            FadeTransform(op[6], sp[10:13]),
            run_time=1.8,
        )
        self.wait(0.6)

        # Gather the pieces of x, and of x′: two vectors of features
        phi, pp = split_formula(
            "\\phi(x)", "=", "(", "x_1^2", COMMA, "\\sqrt2\\, x_1 x_2", COMMA, "x_2^2", ")",
            font_size=52,
        )
        psi, qp = split_formula(
            "\\phi(x')", "=", "(", "x_1'^2", COMMA, "\\sqrt2\\, x_1' x_2'", COMMA, "x_2'^2", ")",
            font_size=52,
        )
        for part in (qp[0], qp[3], qp[5], qp[7]):
            part.set_fill(SAGE)
        phi.next_to(split, DOWN, buff=0.55)
        psi.next_to(phi, DOWN, buff=0.3)
        psi.align_to(phi, LEFT)
        self.play(
            FadeIn(pp[0:3]), FadeIn(pp[4]), FadeIn(pp[6]), FadeIn(pp[8]),
            TransformFromCopy(sp[2], pp[3]),
            TransformFromCopy(sp[6], pp[5]),
            TransformFromCopy(sp[10], pp[7]),
            run_time=1.5,
        )
        self.play(
            FadeIn(qp[0:3]), FadeIn(qp[4]), FadeIn(qp[6]), FadeIn(qp[8]),
            TransformFromCopy(sp[4], qp[3]),
            TransformFromCopy(sp[8], qp[5]),
            TransformFromCopy(sp[12], qp[7]),
            run_time=1.5,
        )
        said = words("the kernel is their inner product", font_size=36, color=FADED)
        said.next_to(psi, DOWN, buff=0.35)
        self.play(FadeIn(said, shift=0.2 * UP))
        self.wait(1.2)

        # With numbers: x = (1, 2), x′ = (3, 1)
        divider = Line(LEFT * 6, RIGHT * 6, stroke_color=RULE, stroke_width=2)
        divider.next_to(said, DOWN, buff=0.3)
        given, gp = split_formula("x = (1, 2)", "\\qquad", "x' = (3, 1)", font_size=48)
        gp[2].set_fill(SAGE)
        given.next_to(divider, DOWN, buff=0.3)

        short, shp = split_formula("(1" + DOT, "3", "+", "2" + DOT, "1", ")^2", "=", "25", font_size=52)
        for i in (1, 4):
            shp[i].set_fill(SAGE)
        long, lop = split_formula(
            "1" + DOT, "9", "+", "2\\sqrt2" + DOT, "3\\sqrt2", "+", "4" + DOT, "1", "=", "25",
            font_size=52,
        )
        for i in (1, 4, 7):
            lop[i].set_fill(SAGE)
        short.next_to(given, DOWN, buff=0.35)
        long.next_to(short, DOWN, buff=0.3)
        # Line the two results up under each other
        short.shift((long[-1].get_x() - shp[7].get_x()) * RIGHT)
        short_name = words("kernel", font_size=34, color=FADED).next_to(short, LEFT, buff=0.5)
        long_name = words("features", font_size=34, color=FADED).next_to(long, LEFT, buff=0.5)
        short_name.align_to(long_name, RIGHT)

        self.play(ShowCreation(divider), FadeIn(given), run_time=1)
        self.play(FadeIn(short_name), Write(shp[0:6]), run_time=1.2)
        self.play(FadeIn(shp[6:], shift=0.2 * LEFT))
        self.play(FadeIn(long_name), Write(lop[0:8]), run_time=1.6)
        self.play(FadeIn(lop[8:], shift=0.2 * LEFT))
        self.play(Indicate(shp[7], color=INK, scale_factor=1.2), Indicate(lop[9], color=INK, scale_factor=1.2))
        self.wait(3)
