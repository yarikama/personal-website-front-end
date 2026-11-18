"""Clips for /learnings/image-convolution."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

CELL = 0.95


def cells(values, color_of=lambda v: INK, fill_of=lambda v: 0.0, size=CELL, font_size=48):
    """A grid of square cells, row by row, each with its number; returns the
    grid and its cells (each a VGroup of square and number) in order."""
    rows = []
    for row in values:
        line = []
        for v in row:
            square = Square(side_length=size, stroke_color=RULE, stroke_width=3)
            square.set_fill(INK, opacity=fill_of(v))
            text = formula(str(v).replace("-", "{-}"), font_size=font_size, color=color_of(v))
            text.move_to(square)
            line.append(VGroup(square, text))
        rows.append(line)
    flat = [c for line in rows for c in line]
    group = VGroup(*flat)
    for i, line in enumerate(rows):
        for j, c in enumerate(line):
            c.move_to(np.array([j * size, -i * size, 0]))
    group.center()
    return group, flat


def weight_color(v):
    return SAGE if v > 0 else INK if v < 0 else FADED


class WeightedSum(Clip):
    """The rule in words, then in symbols, then on the story's window on the
    block's left side: nine weights times nine pixels, added, is 36."""

    def construct(self):
        said, sp = split_words(
            "new value", "=", "add up", "weight", R"$\times$", "pixel", "over the window",
            font_size=40,
        )
        rule, rp = split_formula(
            "g[i,j]", "=", R"\sum_{u,v}", "k[u,v]", R"\, f[i{+}u,\, j{+}v]",
            font_size=60,
            t2c={"k[u,v]": SAGE},
        )
        said.to_edge(UP, buff=1.0)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.5)
        self.wait(0.8)
        pairs = [(0, 0), (1, 1), (2, 2), (3, 3), (5, 4)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[j]) for i, j in pairs), lag_ratio=0.15),
            FadeOut(sp[4]),
            FadeOut(sp[6]),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.7), run_time=1)

        # The story's window: blank on the left, solid in the middle and right
        pixels = [[0, 9, 9], [0, 9, 9], [0, 9, 9]]
        weights = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
        under, uc = cells(pixels, fill_of=lambda v: 0.22 * v / 9)
        kernel, kc = cells(weights, color_of=weight_color)
        times = formula(R"\times", font_size=60, color=FADED)
        row = VGroup(under, times, kernel).arrange(RIGHT, buff=0.7).move_to(UP * 0.1)
        under_label = words("pixels $f$", font_size=34, color=FADED).next_to(under, DOWN, buff=0.3)
        kernel_label = words("weights $k$", font_size=34, color=SAGE).next_to(kernel, DOWN, buff=0.3)

        self.play(FadeIn(under, lag_ratio=0.05), FadeIn(under_label), run_time=1.2)
        self.play(FadeIn(times), FadeIn(kernel, lag_ratio=0.05), FadeIn(kernel_label), run_time=1.2)
        self.wait(0.6)

        sums, np_ = split_formula(
            R"(9 + 2{\cdot}9 + 9)", "-", R"(0 + 2{\cdot}0 + 0)", "=", "36",
            font_size=56,
        )
        sums.to_edge(DOWN, buff=0.7)
        right = [2, 5, 8]
        left = [0, 3, 6]
        # The right column, weights 1, 2, 1
        self.play(
            *(Indicate(uc[n], color=SAGE, scale_factor=1.08) for n in right),
            *(Indicate(kc[n], color=SAGE, scale_factor=1.08) for n in right),
            FadeIn(np_[0], shift=0.2 * UP),
            run_time=1.6,
        )
        # Minus the left, weights −1, −2, −1
        self.play(
            *(Indicate(uc[n], color=INK, scale_factor=1.08) for n in left),
            *(Indicate(kc[n], color=INK, scale_factor=1.08) for n in left),
            FadeIn(np_[1:3], shift=0.2 * UP),
            run_time=1.6,
        )
        self.play(FadeIn(np_[3:], shift=0.2 * LEFT), run_time=1)
        self.play(Indicate(np_[4], color=SAGE, scale_factor=1.2))
        self.wait(3)


class SobelBuilt(Clip):
    """A difference of neighbours measures a slope; average down three rows,
    1, 2, 1, then take the difference across, and the two multiply into the
    Sobel filter."""

    def construct(self):
        title = words("a slope is a difference of neighbours", font_size=38)
        title.to_edge(UP, buff=0.8)
        self.play(Write(title), run_time=1.5)

        squares = [1, 4, 9, 16, 25]
        line, lc = cells([squares])
        line.move_to(UP * 1.0)
        name = words("a row: $x^2$", font_size=34, color=FADED).next_to(line, LEFT, buff=0.5)
        self.play(FadeIn(line, lag_ratio=0.1), FadeIn(name), run_time=1.5)

        diffs = [squares[n + 1] - squares[n - 1] for n in range(1, 4)]
        out = VGroup()
        for n, d in zip(range(1, 4), diffs):
            label = formula(str(d), font_size=56, color=SAGE)
            label.next_to(lc[n], DOWN, buff=0.7)
            out.add(label)
        rule = words("right $-$ left", font_size=34, color=FADED).next_to(out, LEFT, buff=0.5).align_to(name, RIGHT)
        self.play(FadeIn(rule))
        for n, label in zip(range(1, 4), out):
            self.play(
                Indicate(lc[n - 1], color=INK, scale_factor=1.1),
                Indicate(lc[n + 1], color=SAGE, scale_factor=1.1),
                FadeIn(label, shift=0.2 * DOWN),
                run_time=0.9,
            )
        twice = words(R"twice the slope $2x$ there: 4, 6, 8", font_size=34, color=FADED)
        twice.next_to(out, DOWN, buff=0.5)
        self.play(FadeIn(twice, shift=0.2 * UP))
        self.wait(1.5)

        self.play(FadeOut(VGroup(line, name, out, rule, twice)), run_time=0.8)

        # Average down, times difference across
        column, cc = cells([[1], [2], [1]], color_of=lambda v: INK)
        across, ac = cells([[-1, 0, 1]], color_of=weight_color)
        sobel, sc = cells([[a * b for b in (-1, 0, 1)] for a in (1, 2, 1)], color_of=weight_color)
        times = formula(R"\times", font_size=60, color=FADED)
        equals = formula("=", font_size=60, color=FADED)
        group = VGroup(column, times, across, equals, sobel).arrange(RIGHT, buff=0.55).move_to(DOWN * 0.3)
        down = words("average down", font_size=34, color=FADED).next_to(column, DOWN, buff=0.35)
        side = words("difference across", font_size=34, color=FADED).next_to(across, DOWN, buff=0.35).align_to(down, UP)
        named = words("the Sobel filter", font_size=36, color=SAGE).next_to(sobel, DOWN, buff=0.35)

        self.play(FadeIn(column, lag_ratio=0.1), FadeIn(down), run_time=1.2)
        self.play(FadeIn(times), FadeIn(across, lag_ratio=0.1), FadeIn(side), run_time=1.2)
        self.play(FadeIn(equals))
        # Each weight is its row's average weight times its column's difference
        for i in range(3):
            self.play(
                Indicate(cc[i], color=SAGE, scale_factor=1.1),
                LaggedStart(*(FadeIn(sc[3 * i + j], scale=0.8) for j in range(3)), lag_ratio=0.2),
                run_time=1.0,
            )
        self.play(FadeIn(named, shift=0.2 * UP))
        self.wait(3)
