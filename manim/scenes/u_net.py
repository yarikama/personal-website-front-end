"""Clips for /learnings/u-net."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class BilinearWeights(Clip):
    """Bilinear up-sampling by two, built up: a new pixel sits a quarter of
    the way from its nearest old pixel, so across it takes 3/4 and 1/4, down
    the same, and the four weights multiply out to 9, 3, 3 and 1 sixteenths.
    Then the story's numbers: three of the four old pixels hold chair."""

    def construct(self):
        side = 2.6
        corner = np.array([-6.3, 3.2, 0])  # top left of the 2×2 old pixels
        centre = lambda r, c: corner + np.array([(c + 0.5) * side, -(r + 0.5) * side, 0])

        # The four old pixels: nearest, across, below, diagonal
        cells = VGroup(*(
            Square(side, stroke_color=RULE, stroke_width=3).move_to(centre(r, c))
            for r, c in ((0, 0), (0, 1), (1, 0), (1, 1))
        ))
        dots = VGroup(*(Dot(cell.get_center(), radius=0.07, fill_color=FADED) for cell in cells))
        names = VGroup(*(
            words(name, font_size=34, color=FADED).next_to(cell.get_corner(UL), DR, buff=0.12)
            for name, cell in zip(("near", "across", "below", "diagonal"), cells)
        ))
        title = words("Doubling a map", font_size=40).to_corner(UR, buff=0.6).shift(0.3 * LEFT)

        self.play(FadeIn(title), ShowCreation(cells), FadeIn(dots), run_time=1.5)
        self.play(FadeIn(names), run_time=0.8)

        # The new pixel: a quarter of the way from the nearest centre toward
        # the far ones, inside the nearest old pixel
        here = centre(0, 0) + np.array([side / 4, -side / 4, 0])
        new = Square(side / 2, stroke_color=SAGE, stroke_width=4).move_to(here)
        new_dot = Dot(here, radius=0.09, fill_color=SAGE)
        self.play(ShowCreation(new), FadeIn(new_dot, scale=0.5), run_time=1)
        self.wait(0.5)

        # Across: a quarter from near, three quarters from far
        y = corner[1] + 0.35
        tick = lambda x: Line([x, y - 0.12, 0], [x, y + 0.12, 0], stroke_color=FADED, stroke_width=3)
        a, b, m = centre(0, 0)[0], centre(0, 1)[0], here[0]
        across = VGroup(Line([a, y, 0], [b, y, 0], stroke_color=FADED, stroke_width=3), tick(a), tick(m), tick(b))
        across_rule = VGroup(
            words("across:", font_size=36, color=FADED),
            formula(R"\tfrac{3}{4}\ \text{near} + \tfrac{1}{4}\ \text{far}", font_size=52),
        ).arrange(RIGHT, buff=0.3)
        across_rule.next_to(title, DOWN, buff=0.7).align_to(title, RIGHT)
        self.play(ShowCreation(across), run_time=0.8)
        self.play(FadeIn(across_rule, shift=0.2 * DOWN), run_time=1)
        self.wait(0.6)

        # Down: the same
        x = corner[0] - 0.35
        vtick = lambda yy: Line([x - 0.12, yy, 0], [x + 0.12, yy, 0], stroke_color=FADED, stroke_width=3)
        a2, b2, m2 = centre(0, 0)[1], centre(1, 0)[1], here[1]
        down = VGroup(Line([x, a2, 0], [x, b2, 0], stroke_color=FADED, stroke_width=3), vtick(a2), vtick(m2), vtick(b2))
        down_rule = VGroup(
            words("down:", font_size=36, color=FADED),
            formula(R"\tfrac{3}{4}\ \text{near} + \tfrac{1}{4}\ \text{far}", font_size=52),
        ).arrange(RIGHT, buff=0.3)
        down_rule.next_to(across_rule, DOWN, buff=0.45).align_to(across_rule, RIGHT)
        self.play(ShowCreation(down), run_time=0.8)
        self.play(FadeIn(down_rule, shift=0.2 * DOWN), run_time=1)
        self.wait(0.6)

        # Multiply: each old pixel's weight, in its square
        weights = [R"\tfrac{9}{16}", R"\tfrac{3}{16}", R"\tfrac{3}{16}", R"\tfrac{1}{16}"]
        labels = VGroup(*(
            formula(w, font_size=60, color=INK).move_to(cell.get_center() + 0.25 * DOWN)
            for i, (w, cell) in enumerate(zip(weights, cells))
        ))
        products = VGroup(
            words("near:", font_size=36, color=FADED),
            formula(R"\tfrac{3}{4} \times \tfrac{3}{4} = \tfrac{9}{16}", font_size=52),
        ).arrange(RIGHT, buff=0.3)
        products.next_to(down_rule, DOWN, buff=0.45).align_to(down_rule, RIGHT)
        self.play(FadeIn(products), run_time=1)
        self.play(
            FadeOut(new), FadeOut(new_dot), FadeOut(dots),
            LaggedStart(*(FadeIn(label, scale=0.8) for label in labels), lag_ratio=0.3),
            run_time=2,
        )
        total = words("they add to 1", font_size=36, color=FADED).next_to(products, DOWN, buff=0.35).align_to(products, RIGHT)
        self.play(FadeIn(total), run_time=0.8)
        self.wait(1)

        # The story's pixel: chair in the nearest, across and diagonal
        chair = [1, 1, 0, 1]
        fills = VGroup(*(
            Square(side - 0.12, stroke_width=0, fill_color=SAGE, fill_opacity=0.35).move_to(cell.get_center())
            for cell, v in zip(cells, chair) if v
        ))
        values = VGroup(*(
            formula(str(v), font_size=44, color=SAGE if v else FADED).next_to(cell.get_corner(UR), DL, buff=0.15)
            for v, cell in zip(chair, cells)
        ))
        self.play(FadeIn(fills), FadeIn(values), run_time=1.2)

        sums, parts = split_formula(
            R"\tfrac{9}{16}", R"\times", "1", "+", R"\tfrac{3}{16}", R"\times", "1", "+",
            R"\tfrac{3}{16}", R"\times", "0", "+", R"\tfrac{1}{16}", R"\times", "1", "=", R"\tfrac{13}{16}",
            font_size=52,
        )
        sums.to_edge(DOWN, buff=0.55)
        self.play(
            LaggedStart(
                *(TransformFromCopy(labels[i], parts[4 * i]) for i in range(4)),
                *(TransformFromCopy(values[i], parts[4 * i + 2]) for i in range(4)),
                lag_ratio=0.12,
            ),
            FadeIn(VGroup(*(parts[4 * i + 1] for i in range(4)), *(parts[4 * i + 3] for i in range(3)))),
            run_time=2.4,
        )
        result = formula(R"\approx 0.81", font_size=60, color=SAGE).next_to(sums, RIGHT, buff=0.3)
        self.play(FadeIn(parts[15:]), run_time=0.8)
        self.play(TransformFromCopy(parts[16], result), run_time=1)
        self.wait(3)
