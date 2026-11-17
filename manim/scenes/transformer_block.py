"""Clips for /learnings/transformer-block."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, words


class SkipPaths(Clip):
    """Why a residual connection keeps blame alive: a skip turns a layer's
    slope F' into 1 + F'. Through three layers the plain slopes multiply to
    abc; with skips, (1 + a)(1 + b)(1 + c) opens into eight paths, one of
    them a plain 1 down the skips. Then numbers: every slope 0.1."""

    def construct(self):
        # One layer, plain and with a skip
        plain_said = words("plain layer", font_size=36, color=FADED)
        plain, pp = split_formula("y", "=", "F(x)", font_size=56)
        skip_said = words("with a skip", font_size=36, color=FADED)
        skip, sp = split_formula("y", "=", "x", "+", "F(x)", font_size=56)
        # The input carried past the layer: the skip
        sp[2].set_fill(SAGE)
        plain_said.move_to(3.4 * LEFT + 2.9 * UP)
        skip_said.move_to(3.4 * RIGHT + 2.9 * UP)
        plain.next_to(plain_said, DOWN, buff=0.4)
        skip.next_to(skip_said, DOWN, buff=0.4)

        self.play(FadeIn(plain_said), Write(plain), run_time=1.4)
        self.play(FadeIn(skip_said), Write(skip), run_time=1.4)
        self.wait(0.5)

        slope_said = words("its slope", font_size=34, color=FADED).move_to(1.3 * UP)
        plain_slope, pls = split_formula("F'", font_size=60)
        skip_slope, sks = split_formula("1", "+", "F'", font_size=60, t2c={"1": SAGE})
        plain_slope.next_to(plain, DOWN, buff=0.9)
        skip_slope.next_to(skip, DOWN, buff=0.9)
        self.play(FadeIn(slope_said))
        self.play(TransformFromCopy(pp[2], pls[0]), run_time=1)
        self.play(TransformFromCopy(sp[2], sks[0]), FadeIn(sks[1]), TransformFromCopy(sp[4], sks[2]), run_time=1.2)
        self.wait(1)

        # Three layers: the slopes multiply
        self.play(
            FadeOut(VGroup(plain_said, skip_said, plain, skip, slope_said)),
            plain_slope.animate.to_edge(UP, buff=0.8).shift(3.4 * LEFT - plain_slope.get_x() * RIGHT),
            skip_slope.animate.to_edge(UP, buff=0.8).shift(3.4 * RIGHT - skip_slope.get_x() * RIGHT),
            run_time=1,
        )
        three = words("three layers, slopes $a$, $b$, $c$", font_size=36, color=FADED).next_to(VGroup(plain_slope, skip_slope), DOWN, buff=0.55)
        self.play(FadeIn(three))

        plain3, p3 = split_formula("a", "b", "c", font_size=60)
        plain3.move_to(3.4 * LEFT + 0.6 * UP)
        skip3, s3 = split_formula("(1+a)", "(1+b)", "(1+c)", font_size=60)
        skip3.move_to(3.4 * RIGHT + 0.6 * UP)
        self.play(FadeIn(plain3, shift=0.2 * DOWN), FadeIn(skip3, shift=0.2 * DOWN), run_time=1.2)
        self.wait(0.6)

        # Opened up: eight paths, one of them the plain 1
        opened, op = split_formula("=", "1", "+", "a+b+c", "+", "ab+ac+bc", "+", "abc", font_size=60, t2c={"1": SAGE})
        opened.next_to(skip3, DOWN, buff=0.6).to_edge(RIGHT, buff=0.6)
        self.play(TransformFromCopy(skip3, opened), run_time=1.6)
        brace = Brace(op[1], DOWN, buff=0.12).set_fill(SAGE)
        down = words("straight down the skips", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.12)
        self.play(GrowFromCenter(brace), FadeIn(down, shift=0.2 * DOWN))
        self.wait(1.4)

        # Numbers dropped in
        each = words("every slope $0.1$", font_size=36, color=FADED).move_to(2.2 * DOWN)
        plain_n, pn = split_formula("0.1^3", "=", "0.001", font_size=58)
        skip_n, sn = split_formula("1.1^3", "=", "1.331", font_size=58, t2c={"1.331": SAGE})
        plain_n.move_to(3.4 * LEFT + 3.1 * DOWN)
        skip_n.move_to(3.4 * RIGHT + 3.1 * DOWN)
        self.play(FadeIn(each))
        self.play(TransformFromCopy(plain3, pn[0]), FadeIn(pn[1:]), run_time=1.2)
        self.play(TransformFromCopy(skip3, sn[0]), FadeIn(sn[1:]), run_time=1.2)
        self.wait(3)
